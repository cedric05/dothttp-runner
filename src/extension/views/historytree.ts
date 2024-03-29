import * as path from 'path';
import { URL } from 'url';
import { Command, Event, EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { HistoryItem, IHistoryService } from "../web/types/history";
import transform from '../web/utils/text-colors';
import DotHttpEditorView from "./editor";
import dateFormat = require("dateformat");
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
    private readonly historyItemFormat = "hh:MM";

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
        if (!this.map.has('recent')) {
            this.map.set('recent', []);
        }
        this.map.get('recent')!.unshift(history);
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
            const hourAndMinutes = dateFormat(item.time, this.historyItemFormat);
            const tree = {
                label: transform(`${item.url ? new URL(item.url).hostname : ""} ${path.basename(item.filename)} #${item.target} `, { bold: true }) + hourAndMinutes,
                command: command,
                iconPath: iconType,
                tooltip: `${item.status_code} ${item.url ?? ''}`,
            } as TreeItem;
            return tree;
        } else {
            return {
                label: element.label,
                collapsibleState: TreeItemCollapsibleState.Collapsed,
            }
        }
    }
    async getChildren(element?: HistoryTreeItem): Promise<HistoryTreeItem[]> {
        if (!element) {
            await this.fetchMore(20);
            const childs = []
            for (const label of this.map.keys()) {
                childs.push({ type: TreeType.date, label: label });
            }
            childs.push({ type: TreeType.more, label: 'more' })
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
        const historyItems = await this.historyService.fetchMore(this.fetcedCount, loadCount);
        this.fetcedCount += historyItems.length;
        const recent = dateFormat(new Date(), this.dateFormat);
        historyItems
            .forEach(item => {
                var label = dateFormat(item.time, this.dateFormat);
                if (label === recent) {
                    label = "recent";
                }
                if (this.map.has(label)) {
                    this.map.get(label)!.push(item)
                } else {
                    this.map.set(label, [item]);
                }
                return ({ item, type: TreeType.item });
            });
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

