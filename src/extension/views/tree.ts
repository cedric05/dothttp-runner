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
    filename: string | undefined;
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
                const enabled = DotHttpEditorView.isHttpBookUri(editor.document.uri) || DotHttpEditorView.isHttpUri(editor.document.uri);
                vscode.commands.executeCommand('setContext', Constants.propViewEnabled, enabled);
                if (enabled) {
                    this.filename = editor.document.fileName;
                    this.refresh();
                }
            }
        } else {
            vscode.commands.executeCommand('setContext', Constants.propViewEnabled, false);
        }
    }
    async refresh() {
        if (this.filename!) {
            this.properties = this.fileStateService!
                .getProperties(this.filename!.toString())
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
            label: `${element.key}: ${element.hidden ? "xxxx" : element.value}`,
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


    public addProperties(filename: string, properties: { [prop: string]: string }) {
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

    async updateProperty(node: PropertyTreeItem) {
        const updatedValue = await vscode.window.showInputBox({
            placeHolder: `update property for key: \`${node.key}\` currently \`${node.value}\``,
            value: node?.value
        })
        if (this.filename && (updatedValue || updatedValue === '') && node.value !== updatedValue) {
            this.fileStateService?.updateProperty(this.filename!?.toString(), node.key, node.value, updatedValue);
            this.refresh();
        }
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
        this.fileStateService?.removeProperty(this.filename!?.toString(), prop.key, prop.value);
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

    disableAllEnv() {
        const filename = vscode.window.activeTextEditor?.document.fileName!;
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
    }

    private parseTree(): void {
        this.editor = vscode.window.activeTextEditor!;
        if (this.editor && this.editor.document && basename(this.editor.document.fileName) === ".dothttp.json") {
            this.filename = this.editor.document.uri;
            this.tree = json.parse(this.editor.document.getText()) as DothttpJson;
        } else {
            const dirname = path.dirname(this.editor.document.fileName);
            const filename = vscode.Uri.parse(path.join(dirname, '.dothttp.json'));
            // TODO check if file exists
            vscode.workspace.fs.readFile(filename).then(bindata => {
                this.filename = this.editor.document.uri;
                this.tree = json.parse(bindata.toString());
                this.filename = filename
                this._onDidChangeTreeData.fire(null);
            }, _error => {
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
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const scheme = editor.document.uri.scheme;
            if (scheme === 'file' || scheme === Constants.notebookscheme) {
                const fileName = editor.document.fileName;
                const uri = editor.document.uri
                const enabled = DotHttpEditorView.isHttpBookUri(uri)
                    || DotHttpEditorView.isHttpUri(uri)
                    || basename(fileName) === ".dothttp.json";
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


    openEnvFile() {
        vscode.workspace.openTextDocument(this.filename).then(editor => {
            vscode.window.showTextDocument(editor, 2, false);
        });
    }

}