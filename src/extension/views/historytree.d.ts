import { Event, TreeDataProvider, TreeItem } from "vscode";
import { history, IHistoryService } from "../tingohelpers";
declare enum TreeType {
    recent = 0,
    more = 1,
    date = 2,
    item = 3
}
interface HistoryTreeItem {
    type: TreeType;
    label: string;
    item?: history;
}
export declare class HistoryTreeProvider implements TreeDataProvider<HistoryTreeItem> {
    private readonly emitter;
    onDidChangeTreeData: Event<null | HistoryTreeItem>;
    private _historyService;
    map: Map<string, history[]>;
    fetcedCount: number;
    private readonly dateFormat;
    private readonly historyItemFormat;
    constructor();
    get historyService(): IHistoryService;
    set historyService(value: IHistoryService);
    recentChanged(history: history): void;
    getTreeItem(element: HistoryTreeItem): TreeItem | Thenable<TreeItem>;
    getChildren(element?: HistoryTreeItem): Promise<HistoryTreeItem[]>;
    private fetchMore;
}
export {};
