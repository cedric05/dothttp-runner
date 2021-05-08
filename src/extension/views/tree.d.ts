import * as vscode from 'vscode';
import { ApplicationServices } from '../services/global';
import { FileInfo, IFileState } from '../services/state';
export interface Position {
    env: string;
    envProperty?: string;
}
interface PropertyTreeItem {
    key: string;
    value: string;
    enabled: boolean;
}
export declare class PropertyTree implements vscode.TreeDataProvider<PropertyTreeItem> {
    private _fileStateService;
    get fileStateService(): IFileState | undefined;
    set fileStateService(value: IFileState | undefined);
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<PropertyTreeItem | null>;
    filename: string | undefined;
    properties: FileInfo['properties'] | undefined;
    constructor();
    onActiveEditorChanged(): any;
    refresh(): Promise<void>;
    getTreeItem(element: PropertyTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem>;
    getChildren(element?: PropertyTreeItem): vscode.ProviderResult<PropertyTreeItem[]>;
    addProperty(): void;
    enableProperty(pos: PropertyTreeItem): void;
    copyProperty(node: PropertyTreeItem): void;
    disableProperty(node: PropertyTreeItem): void;
    updateProperty(node: PropertyTreeItem): Promise<void>;
    disableAllProperies(): void;
    removeProperty(prop: PropertyTreeItem): void;
}
export declare class EnvTree implements vscode.TreeDataProvider<Position> {
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<Position | null>;
    private tree;
    private editor;
    private autoRefresh;
    private _filename;
    get filename(): vscode.Uri;
    set filename(name: vscode.Uri);
    private filestate;
    refresh(offset?: Position): void;
    disableAllEnv(): void;
    getProperty(node: Position): string | undefined;
    getChildren(pos?: Position): Thenable<Position[]>;
    getTreeItem(pos: Position): vscode.TreeItem;
    constructor();
    private getLabel;
    setFileStateService(state: ApplicationServices): void;
    private parseTree;
    private hasEnv;
    private getEnvForCurrentFile;
    onActiveEditorChanged(): void;
    private onDocumentChanged;
    openEnvFile(): void;
}
export {};
