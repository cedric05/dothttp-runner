import * as json from 'jsonc-parser';
import { basename } from 'path';
import * as vscode from 'vscode';
import { IFileState, Iproperties } from "../web/types/properties";
import DotHttpEditorView from './editor';
import path = require('path');
import { Constants } from '../web/utils/constants';


const FIFTEEN_MINS = 15 * 60 * 1000;
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

type PropertyTreeItem = Iproperties & { hidden: boolean }


export class PropertyTree implements vscode.TreeDataProvider<PropertyTreeItem> {
    private _fileStateService: IFileState | undefined;
    public get fileStateService(): IFileState | undefined {
        return this._fileStateService;
    }
    public setFileStateService(value: IFileState | undefined) {
        this._fileStateService = value;
    }
    private _onDidChangeTreeData: vscode.EventEmitter<PropertyTreeItem | null> = new vscode.EventEmitter<PropertyTreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<PropertyTreeItem | null> = this._onDidChangeTreeData.event;
    filename: vscode.Uri | undefined;
    properties: PropertyTreeItem[] | undefined;
    hiddenProperties: { [_: string]: boolean } = {};


    constructor() {
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
    }

    onActiveEditorChanged(): any {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const scheme = editor.document.uri.scheme;
            if (scheme === 'file' || scheme === Constants.notebookscheme) {
                this.filename = editor.document.uri;
                this.refresh();
            }
        }
    }
    async refresh() {
        if (this.filename!) {
            this.properties = this.fileStateService!
                .getProperties(this.filename!)
                .map((property) => {
                    const hidden = this.hiddenProperties[property.key] ?? true;
                    return { ...property, hidden: hidden };
                });
            this._onDidChangeTreeData.fire(null);
        }
    }
    getTreeItem(element: PropertyTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const enabled = element.enabled ? 'enabled' : 'disabled';
        return {
            label: `${element.key}: ${element.hidden ? element.value.substring(0, 2) + 'xxxxx(masked)' : element.value}`,
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
                        this.fileStateService!.addProperty(this.filename, key, value);
                        this.refresh();
                    }
                })
            })
    }

    public toggleProperty(pos: PropertyTreeItem) {
        const isHidden = !(this.hiddenProperties[pos.key] ?? true);
        if (!isHidden) {
            setTimeout(() => {
                this.toggleProperty(pos)
            }, FIFTEEN_MINS);
        }
        this.hiddenProperties[pos.key] = isHidden;
        this.refresh();
    }


    public addProperties(filename: vscode.Uri, properties: { [prop: string]: string }) {
        const keys = Object.keys(properties);
        if (keys.length !== 0) {

            // with dothttp core 0.0.39b3
            // only generated properties will be sent
            // so, no need remove and add
            /*
            // TODO
            // as a workaround, going in crude way!!!
            const enabledProperties = this.fileStateService?.getProperties(filename);
            enabledProperties?.forEach(prop => {
                this.fileStateService?.removeProperty(filename, prop.key, prop.value);
            })
            */
            keys.forEach(key => {
                // in case property exists, we want to enable back property
                this.fileStateService!.addProperty(filename, key, properties[key]);
                this.fileStateService!.enableProperty(filename, key, properties[key]); // enable property
            })
            this.refresh();
        }

    }

    enableProperty(pos: PropertyTreeItem) {
        this.fileStateService?.enableProperty(this.filename!, pos.key, pos.value);
        this.refresh();
    }
    copyProperty(node: PropertyTreeItem) {
        vscode.env.clipboard.writeText(node.value);
        this.refresh();
    }
    disableProperty(node: PropertyTreeItem) {
        this.fileStateService?.disableProperty(this.filename!, node.key, node.value);
        this.refresh();
    }

    async updateProperty(node: PropertyTreeItem) {
        const updatedValue = await vscode.window.showInputBox({
            placeHolder: `update property for key: \`${node.key}\` currently \`${node.value}\``,
            value: node?.value
        })
        if (this.filename && (updatedValue || updatedValue === '') && node.value !== updatedValue) {
            this.fileStateService?.updateProperty(this.filename!, node.key, node.value, updatedValue);
            this.refresh();
        }
    }

    disableAllProperies() {
        const props = this.fileStateService?.getProperties(this.filename!);
        props?.forEach(prop => {
            this.fileStateService!.disableProperty(this.filename!, prop.key, prop.value);
        }
        )
        this.refresh();
    }

    removeProperty(prop: PropertyTreeItem) {
        this.fileStateService?.removeProperty(this.filename!, prop.key, prop.value);
        this.refresh();
    }

}

export class EnvTree implements vscode.TreeDataProvider<Position> {
    private _onDidChangeTreeData: vscode.EventEmitter<Position | null> = new vscode.EventEmitter<Position | null>();
    readonly onDidChangeTreeData: vscode.Event<Position | null> = this._onDidChangeTreeData.event;

    private tree!: DothttpJson;
    private autoRefresh = true;
    private _filename!: vscode.Uri;



    public get filename(): vscode.Uri {
        return this._filename;
    }

    public set filename(name: vscode.Uri) {
        this._filename = name;
        this.filestate?.setEnvFile(name);
        this.refresh()
    }


    private filestate: IFileState | undefined;

    public refresh(): void {
        this.parseTree();
        this._onDidChangeTreeData.fire(null);
    }

    disableAllEnv() {
        const filename = vscode.window.activeTextEditor?.document.uri!;
        const allEnv = this.filestate?.getEnv(filename);
        allEnv?.forEach(env => {
            this.filestate?.removeEnv(filename, env);
        })
        this.refresh()
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

    setFileStateService(filetateService: IFileState) {
        this.filestate = filetateService;
        const filename = filetateService.getEnvFile();
        if (filename) {
            this.filename = filename;
        }

    }

    private parseTree(): void {
        const editor = vscode.window.activeTextEditor;
        if (this.filename) {
            vscode.workspace.fs.readFile(this.filename).then(bindata => {
                this.tree = json.parse(bindata.toString());
                this._onDidChangeTreeData.fire(null);
            }, _error => {
            })
        } else if (editor && editor.document && basename(editor.document.fileName) === ".dothttp.json") {
            this.filename = editor.document.uri;
            this.tree = json.parse(editor.document.getText()) as DothttpJson;
        }
    }

    private hasEnv(env: string) {
        if (vscode.window.activeTextEditor?.document.uri) {
            return this.filestate!.hasEnv(vscode.window.activeTextEditor?.document.uri!, env);
        } else if (vscode.workspace.workspaceFolders?.length ?? 0 > 0) {
            return this.filestate!.hasEnv(vscode.workspace.workspaceFolders![0].uri, env);
        }
        return false;
    }

    configureEnvFile() {
        vscode.window.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            title: "Select property file",
            filters: { property: ["json"] },
            canSelectMany: false,
        }).then((files) => {
            if (files && files.length > 0) {
                this.filename = files[0];
            }
        });
    }

    onActiveEditorChanged(): void {
        const editor = vscode.window.activeTextEditor;
        if (!this.filename && editor && basename(editor.document.fileName) === ".dothttp.json") {
            this.filename = editor.document.uri;
            this.refresh();
        }
    }

    private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
        if (this.autoRefresh && changeEvent.document.uri === vscode.window.activeTextEditor?.document.uri) {
            this.refresh()
        }
    }
    openEnvFile() {
        vscode.workspace.openTextDocument(this.filename).then(editor => {
            vscode.window.showTextDocument(editor, 2, false);
        });
    }

}