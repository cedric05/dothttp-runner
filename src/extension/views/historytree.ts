import * as path from 'path';
import { URL } from 'url';
import { Command, Event, EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { HistoryItem, IHistoryService } from "../web/types/history";
import transform from '../web/utils/text-colors';
import DotHttpEditorView from "./editor";
import dateFormat from 'dateformat';
import querystring = require('querystring');
import * as vscode from 'vscode';
import { Constants } from '../web/utils/constants';
import { showInLocalFolder } from '../native/commands/export/postman';
import { groupBy, flatMap } from 'lodash';
import { dump } from 'js-yaml';

enum TreeType {
    recent,
    more,
    date,
    item
}

const historyItemicons = {
    STATUS_2XX: new ThemeIcon("check"),
    STATUS_3XX: new ThemeIcon("redo"),
    STATUS_4XX: new ThemeIcon("warning"),
    STATUS_5XX: new ThemeIcon("error"),
    STATUS_ISSUE: new ThemeIcon("issues")
}


interface HistoryTreeItem {
    type: TreeType
    label: string,
    item?: HistoryItem
}


export class HistoryTreeProvider implements TreeDataProvider<HistoryTreeItem> {

    private readonly emitter = new EventEmitter<HistoryTreeItem | null>();
    public onDidChangeTreeData: Event<null | HistoryTreeItem> = this.emitter.event;
    private _historyService!: IHistoryService;
    map: Map<string, HistoryItem[]> = new Map();
    fetcedCount: number = 0;

    private readonly dateFormat = "yyyy-mm-dd";
    private readonly historyItemFormat = "hh:MM:ss TT";

    constructor() {
        this.map.set('recent', []);
    }

    public get historyService(): IHistoryService {
        return this._historyService;
    }
    public setHistoryService(value: IHistoryService) {
        this._historyService = value;
        // this.fetchMore();
    }

    recentChanged(history: HistoryItem) {
        console.log(`HistoryTree recentChanged: url=${history.url}, time=${history.time}`);
        if (!this.map.has('recent')) {
            this.map.set('recent', []);
        }
        this.map.get('recent')!.unshift(history);
        console.log(`HistoryTree recentChanged: 'recent' now has ${this.map.get('recent')!.length} items`);
        this.emitter.fire(null)
    }

    getTreeItem(element: HistoryTreeItem): TreeItem | Thenable<TreeItem> {
        if (element.type === TreeType.item) {
            const item = element.item!;
            const query = querystring.encode({
                '_id': item._id!.toString(),
                'date': item.time.getTime()
            })
            const uri = Uri.from({ scheme: DotHttpEditorView.scheme, path: path.basename(item.filename), query: query })
            var command: Command = {
                title: "",
                command: 'vscode.open',
                arguments: [uri]
            };
            var iconType = historyItemicons.STATUS_ISSUE
            if (item.status_code < 300) {
                iconType = historyItemicons.STATUS_2XX
            } else if (item.status_code >= 300 && item.status_code < 400) {
                iconType = historyItemicons.STATUS_3XX
            } else if (item.status_code >= 400 && item.status_code < 500) {
                iconType = historyItemicons.STATUS_4XX
            } else if (item.status_code >= 500) {
                iconType = historyItemicons.STATUS_5XX
            } else {
                iconType = historyItemicons.STATUS_ISSUE;
            }

            // Format like Postman: "GET https://api.example.com  200 OK  12:30:45 PM"
            const time = dateFormat(item.time, this.historyItemFormat);
            const method = this.extractMethod(item.http);
            const urlPath = this.formatUrl(item.url);
            const statusText = this.getStatusText(item.status_code);

            const tree = {
                label: `${method} ${urlPath}`,
                description: `${item.status_code} ${statusText} · ${time}`,
                command: command,
                iconPath: iconType,
                tooltip: `${method} ${item.url}\nStatus: ${item.status_code} ${statusText}\nFile: ${path.basename(item.filename)}\nTarget: #${item.target}\nTime: ${time}`,
                contextValue: 'historyItem',
            } as TreeItem;
            return tree;
        } else {
            return {
                label: this.formatDateLabel(element.label),
                collapsibleState: TreeItemCollapsibleState.Collapsed,
            }
        }
    }

    private extractMethod(http: string): string {
        const match = http.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)/i);
        return match ? match[1].toUpperCase() : 'GET';
    }

    private formatUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname + urlObj.search;
            const fullPath = urlObj.hostname + path;

            // Truncate if too long, but always include hostname
            if (fullPath.length > 60) {
                // Keep hostname and truncate path
                const remainingLength = 57 - urlObj.hostname.length;
                if (remainingLength > 10) {
                    return urlObj.hostname + path.substring(0, remainingLength) + '...';
                } else {
                    // If hostname itself is long, truncate the whole thing
                    return fullPath.substring(0, 57) + '...';
                }
            }
            return fullPath;
        } catch {
            return url.length > 60 ? url.substring(0, 57) + '...' : url;
        }
    }

    private getStatusText(code: number): string {
        const statusTexts: { [key: number]: string } = {
            200: 'OK', 201: 'Created', 204: 'No Content',
            301: 'Moved', 302: 'Found', 304: 'Not Modified',
            400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
            500: 'Server Error', 502: 'Bad Gateway', 503: 'Unavailable'
        };
        return statusTexts[code] || '';
    }

    private formatDateLabel(label: string): string {
        if (label === 'recent') {
            return 'Today';
        }

        try {
            const date = new Date(label);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const dateStr = dateFormat(date, this.dateFormat);
            const todayStr = dateFormat(today, this.dateFormat);
            const yesterdayStr = dateFormat(yesterday, this.dateFormat);

            if (dateStr === todayStr) {
                return 'Today';
            } else if (dateStr === yesterdayStr) {
                return 'Yesterday';
            } else {
                // Show as "Monday, Jan 15" or "Jan 15, 2025" if different year
                const isSameYear = date.getFullYear() === today.getFullYear();
                return dateFormat(date, isSameYear ? 'dddd, mmm d' : 'mmm d, yyyy');
            }
        } catch {
            return label;
        }
    }
    async getChildren(element?: HistoryTreeItem): Promise<HistoryTreeItem[]> {
        if (!element) {
            await this.fetchMore(20);
            const childs = []

            console.log(`HistoryTree: map keys = ${Array.from(this.map.keys()).join(', ')}`);
            console.log(`HistoryTree: map entries = ${JSON.stringify(Array.from(this.map.entries()).map(([k, v]) => [k, v.length]))}`);

            // Sort dates: recent (today) first, then yesterday, then chronological
            const sortedLabels = Array.from(this.map.keys()).sort((a, b) => {
                if (a === 'recent') return -1;
                if (b === 'recent') return 1;
                if (a === 'yesterday') return -1;
                if (b === 'yesterday') return 1;
                return b.localeCompare(a); // Reverse chronological for dates
            });

            for (const label of sortedLabels) {
                const items = this.map.get(label)!;
                if (items.length > 0) {
                    childs.push({ type: TreeType.date, label: label });
                }
            }
            childs.push({ type: TreeType.more, label: 'more' })
            console.log(`HistoryTree: returning ${childs.length} children`);
            return childs
        } else if (element.type === TreeType.date || element.type === TreeType.recent) {
            const data = this.map.get(element.label)!.map(item => ({ item, type: TreeType.item, label: "" }));
            return data;
        } else if (element.type === TreeType.more) {
            const initialCount = this.fetcedCount;
            await this.fetchMore(100);
            if (initialCount !== this.fetcedCount) {
                this.emitter.fire(null);
            }
            return [];
        } return [];
    }


    private async fetchMore(loadCount = 100) {
        console.log(`HistoryTree fetchMore: skip=${this.fetcedCount}, limit=${loadCount}`);
        const historyItems = await this.historyService.fetchMore(this.fetcedCount, loadCount);
        console.log(`HistoryTree fetchMore: received ${historyItems.length} items`);
        this.fetcedCount += historyItems.length;

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayStr = dateFormat(today, this.dateFormat);
        const yesterdayStr = dateFormat(yesterday, this.dateFormat);

        console.log(`HistoryTree: todayStr=${todayStr}, yesterdayStr=${yesterdayStr}`);

        historyItems.forEach(item => {
            const itemDateStr = dateFormat(item.time, this.dateFormat);
            let label = itemDateStr;

            console.log(`HistoryTree: item time=${item.time}, itemDateStr=${itemDateStr}`);

            if (itemDateStr === todayStr) {
                label = "recent"; // Will be displayed as "Today"
            } else if (itemDateStr === yesterdayStr) {
                label = "yesterday";
            }

            if (this.map.has(label)) {
                this.map.get(label)!.push(item)
            } else {
                this.map.set(label, [item]);
            }
        });
    }

    public async showResponse(element: HistoryTreeItem) {
        if (element.type === TreeType.item && element.item) {
            const item = element.item;
            if (!item.response_body) {
                vscode.window.showInformationMessage('No response body saved for this request');
                return;
            }

            // Create a new untitled document to show the response
            const headers = item.response_headers ? JSON.parse(item.response_headers) : {};
            const contentType = headers['content-type'] || headers['Content-Type'] || '';

            let language = 'plaintext';
            if (contentType.includes('json')) {
                language = 'json';
            } else if (contentType.includes('html')) {
                language = 'html';
            } else if (contentType.includes('xml')) {
                language = 'xml';
            } else if (contentType.includes('javascript')) {
                language = 'javascript';
            }

            // Format response with headers
            const headerLines = Object.entries(headers)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');

            const fullResponse = `HTTP/1.1 ${item.status_code}\n${headerLines}\n\n${item.response_body}`;

            const doc = await vscode.workspace.openTextDocument({
                content: fullResponse,
                language: language
            });
            await vscode.window.showTextDocument(doc, { preview: true });
        }
    }

    public async exportSelectedItems(elements: HistoryTreeItem[]) {
        // Filter to only history items
        const historyItems = elements
            .filter(el => el.type === TreeType.item && el.item)
            .map(el => el.item!);

        if (historyItems.length === 0) {
            vscode.window.showInformationMessage('No items selected to export');
            return;
        }

        const cells = historyItems.map(item => ({
            "kind": vscode.NotebookCellKind.Code,
            "language": Constants.LANG_CODE,
            "value": item.http,
            "outputs": []
        }));

        await showInLocalFolder(
            vscode.Uri.file(`history-export-${historyItems.length}-items`),
            dump(cells),
            ".hnbk"
        );
    }

    public async exportHistory() {
        const items: HistoryItem[] = await this.historyService.fetchAll();
        const cells = flatMap(Object.entries(
            groupBy(
                items.filter(item => item.status_code),
                (item) => item.workspace
            ),
        ), ([workspace, items]) => {
            let headers = []
            if (workspace !== "undefined") {
                headers.push({
                    "kind": vscode.NotebookCellKind.Markup,
                    "language": "markdown",
                    "value": `### ${workspace}
${items.length} requests`,
                    "outputs": []
                });
            }
            const dateWise = flatMap(Object.entries(groupBy(items, item => dateFormat(item.time, "yyyy-mm-dd"))).map(([date, items]) => {
                return [{
                    "kind": vscode.NotebookCellKind.Markup,
                    "language": "markdown",
                    "value": `#### ${date}`,
                    "outputs": []
                }, ...items.map(item => ({
                    "kind": vscode.NotebookCellKind.Code,
                    "language": Constants.LANG_CODE,
                    "value": item.http,
                    "outputs": []
                }))];
            }));
            return [...headers, ...dateWise];
        });
        await showInLocalFolder(vscode.Uri.file("history-export"), dump(cells), ".hnbk")
    }
};

