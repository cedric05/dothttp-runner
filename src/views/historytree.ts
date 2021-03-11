import { Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, Uri } from "vscode";
import { history, IHistoryService } from "../tingohelpers";
import * as path from 'path';
import dateFormat = require("dateformat");
import querystring = require('querystring');
import DotHttpEditorView from "./editor";


interface HistoryTreeItem extends history {
    more: boolean
}


export class HistoryTreeProvider implements TreeDataProvider<history> {

    private readonly emitter = new EventEmitter<history | null>();
    onDidChangeTreeData?: Event<void | history> = this.emitter.event;
    private _historyService: IHistoryService;
    public get historyService(): IHistoryService {
        return this._historyService;
    }
    public set historyService(value: IHistoryService) {
        this._historyService = value;
    }

    constructor() {

    }
    getTreeItem(element: history): TreeItem | Thenable<TreeItem> {
        const date = dateFormat(element.time, 'hh:MM:ss');
        const query = querystring.encode({
            'out': JSON.stringify({ 'body': element.http }),
            'date': element.time.getTime()
        })
        const uri = Uri.parse(`${DotHttpEditorView.scheme}:///${path.basename(element.filename)}?${query}`)
        const tree = {
            label: `status:${element.status_code} ${date}, ${element.target}, ${path.basename(element.filename)}`,
            command: {
                command: 'vscode.open',
                arguments: [uri]
            }
        } as TreeItem;
        return tree;
    }
    getChildren(element?: history): ProviderResult<history[]> {
        return new Promise(async (resolve, reject) => {
            const history = await this.historyService.fetchMore(0, 100);
            resolve(history);
        })
    }

};

