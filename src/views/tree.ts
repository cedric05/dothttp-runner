import * as json from 'jsonc-parser';
import { basename } from 'path';
import * as vscode from 'vscode';
import { Constants } from '../models/constants';
import { ApplicationServices } from '../services/global';
import { FileInfo, IFileState } from '../services/state';
import DotHttpEditorView from './editor';
import path = require('path');


export interface Position {
    env: string;
    envProperty?: string
}

interface EnvList {
    [propname: string]: string
}

interface DothttpJson {
    [propname: string]: EnvList
}


enum viewState {
    environment = "environment", // which can be enabled
    enabled = "enabledEnvironment", // which can be enabled
    property = 'property',

}

interface PropertyTreeItem {
    key: string,
    value: string,
    enabled: boolean,
}


export class PropertyTree implements vscode.TreeDataProvider<PropertyTreeItem> {
    private _fileStateService: IFileState | undefined;
    public get fileStateService(): IFileState | undefined {
        return this._fileStateService;
    }
    public set fileStateService(value: IFileState | undefined) {
        this._fileStateService = value;
    }
    private _onDidChangeTreeData: vscode.EventEmitter<PropertyTreeItem | null> = new vscode.EventEmitter<PropertyTreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<PropertyTreeItem | null> = this._onDidChangeTreeData.event;
    filename: string | undefined;
    properties: FileInfo['properties'] | undefined;


    constructor() {
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
    }

    onActiveEditorChanged(): any {
        if (vscode.window.activeTextEditor) {
            if (vscode.window.activeTextEditor.document.uri.scheme === 'file') {
                const fileName = vscode.window.activeTextEditor.document.fileName;
                const enabled = DotHttpEditorView.isHttpFile(fileName);
                vscode.commands.executeCommand('setContext', Constants.propViewEnabled, enabled);
                if (enabled) {
                    this.filename = vscode.window.activeTextEditor.document.fileName;
                    this.refresh();
                }
            }
        } else {
            vscode.commands.executeCommand('setContext', Constants.propViewEnabled, false);
        }
    }
    async refresh() {
        if (this.filename!) {
            this.properties = this.fileStateService!.getProperties(this.filename!.toString());
            this._onDidChangeTreeData.fire(null);
        }
    }
    getTreeItem(element: PropertyTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const enabled = element.enabled ? 'enabled' : 'disabled';
        return {
            label: `${element.key}: ${element.value}`,
            tooltip: `property ${enabled}`,
            contextValue: enabled,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        } as vscode.TreeItem;
    }
    getChildren(element?: PropertyTreeItem): vscode.ProviderResult<PropertyTreeItem[]> {
        if (element) {
            return []
        } else {
            return this.properties;
        }
    }


    public addProperty() {
        vscode.window.showInputBox({ placeHolder: `add property key for ${this.filename}` })
            .then(key => {
                vscode.window.showInputBox({ placeHolder: `add property value for ${this.filename}` }).then(value => {
                    if (this.filename && key && (value || value === '')) {
                        this.fileStateService!.addProperty(this.filename?.toString(), key, value);
                        this.refresh();
                    }
                })
            })
    }

    enableProperty(pos: PropertyTreeItem) {
        this.fileStateService?.enableProperty(this.filename!?.toString(), pos.key, pos.value);
        this.refresh();
    }
    copyProperty(node: PropertyTreeItem) {
        vscode.env.clipboard.writeText(node.value);
        this.refresh();
    }
    disableProperty(node: PropertyTreeItem) {
        this.fileStateService?.disableProperty(this.filename!?.toString(), node.key, node.value);
        this.refresh();
    }

    updateProperty(node: PropertyTreeItem) {
        vscode.window.showInputBox({ placeHolder: `update property for key: \`${node.key}\` currently \`${node.value}\`` }).then(
            updatedValue => {
                if (this.filename && (updatedValue || updatedValue === '') && node.value !== updatedValue) {
                    this.fileStateService?.updateProperty(this.filename!?.toString(), node.key, node.value, updatedValue);
                    this.refresh();
                }
            }
        )
    }

    disableAllProperies() {
        const filename = this.filename!?.toString();
        const props = this.fileStateService?.getProperties(filename);
        props?.forEach(prop => {
            this.fileStateService!.disableProperty(filename, prop.key, prop.value);
        }
        )
        this.refresh();
    }

    removeProperty(prop: PropertyTreeItem) {
        const props = this.fileStateService?.removeProperty(this.filename!?.toString(), prop.key, prop.value);
        this.refresh();
    }

}

export class EnvTree implements vscode.TreeDataProvider<Position> {


    private _onDidChangeTreeData: vscode.EventEmitter<Position | null> = new vscode.EventEmitter<Position | null>();
    readonly onDidChangeTreeData: vscode.Event<Position | null> = this._onDidChangeTreeData.event;

    private tree!: DothttpJson;
    private editor!: vscode.TextEditor;
    private autoRefresh = true;
    private _filename!: vscode.Uri;



    public get filename(): vscode.Uri {
        return this._filename;
    }

    public set filename(name: vscode.Uri) {
        this._filename = name;
    }


    private filestate: IFileState | undefined;



    public refresh(offset?: Position): void {
        this.parseTree();
        if (offset) {
            this._onDidChangeTreeData.fire(offset);
        } else {
            this._onDidChangeTreeData.fire(null);
        }
    }



    public getProperty(node: Position) {
        if (node.env && node.envProperty) {
            return this.tree[node.env][node.envProperty]
        }
    }



    getChildren(pos?: Position): Thenable<Position[]> {
        if (pos) {
            if (pos.envProperty)
                return Promise.resolve([]);
            else {
                const env: EnvList = this.tree[pos.env];
                const childs: Position[] = Object.keys(env).map(propKey => ({
                    env: pos.env,
                    envProperty: propKey,
                }))
                return Promise.resolve(childs)
            }
        } else {
            // TODO
            // why would it will try to check tree if not initialized
            if (this.tree)
                return Promise.resolve(Object.keys(this.tree).map(envName => ({
                    env: envName
                })));
            else
                return Promise.resolve([]);
        }
    }

    getTreeItem(pos: Position): vscode.TreeItem {
        if (pos.env) {
            const item = new vscode.TreeItem(
                this.getLabel(pos), pos.envProperty ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded
            );
            // TODO on click should open dothttp.json file
            item.command = {
                command: 'vscode.open',
                title: 'open',
                arguments: [this.filename]
            };
            // item.resourceUri = this.filename;
            if (!pos.envProperty) {
                if (this.hasEnv(pos.env)) {
                    item.contextValue = viewState.enabled;
                }
                else {
                    item.contextValue = viewState.environment;
                }
            }
            else {
                item.contextValue = viewState.property;
            }
            return item;
        }
        return new vscode.TreeItem('dothttp');
    }

    constructor() {
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e));
    }
    private getLabel(pos: Position): string | vscode.TreeItemLabel {
        if (pos.envProperty) {
            return `${pos.envProperty}: ${this.tree[pos.env][pos.envProperty]}`
        } else {
            if (pos.env === '*') {
                return "default env";
            } else if (pos.env === 'headers') {
                return 'default headers';
            }
            return pos.env
        }
    }

    setFileStateService(state: ApplicationServices) {
        this.filestate = state.getFileStateService();
    }

    private parseTree(): void {
        this.editor = vscode.window.activeTextEditor!;
        if (this.editor && this.editor.document && basename(this.editor.document.fileName) === ".dothttp.json") {
            this.filename = this.editor.document.uri;
            this.tree = json.parse(this.editor.document.getText()) as DothttpJson;
        } else {
            const dirname = path.dirname(this.editor.document.fileName);
            const filename = vscode.Uri.parse(path.join(`${this.editor.document.uri.scheme}:${dirname}`, '.dothttp.json'));
            // TODO check if file exists
            vscode.workspace.fs.readFile(filename).then(bindata => {
                this.filename = this.editor.document.uri;
                this.tree = json.parse(bindata.toString());
                this.filename = filename
                this._onDidChangeTreeData.fire(null);
            }, error => {
                vscode.commands.executeCommand('setContext', Constants.enableEnvViewVar, false);

            })
        }
    }

    private hasEnv(env: string) {
        return this.filestate!.hasEnv(vscode.window.activeTextEditor?.document.fileName!, env);
    }

    private getEnvForCurrentFile(): string[] {
        return this.filestate!.getEnv(vscode.window.activeTextEditor?.document.fileName!);
    }

    onActiveEditorChanged(): void {
        if (vscode.window.activeTextEditor) {
            if (vscode.window.activeTextEditor.document.uri.scheme === 'file') {
                const fileName = vscode.window.activeTextEditor.document.fileName;
                const enabled = DotHttpEditorView.isHttpFile(fileName) || basename(fileName) === ".dothttp.json";
                vscode.commands.executeCommand('setContext', Constants.enableEnvViewVar, enabled);
                if (enabled) {
                    this.refresh();
                }
            }
        } else {
            vscode.commands.executeCommand('setContext', Constants.enableEnvViewVar, false);
        }
    }

    private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
        if (this.autoRefresh && this.editor && this.editor.document && changeEvent.document.uri.toString() === this.editor.document.uri.toString()) {
            this.refresh()
        }
    }

}