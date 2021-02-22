import * as json from 'jsonc-parser';
import { basename } from 'path';
import * as vscode from 'vscode';
import { FileState } from '../models/state';
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

}




export class EnvTree implements vscode.TreeDataProvider<Position> {


    static _tree = new EnvTree();

    private _onDidChangeTreeData: vscode.EventEmitter<Position | null> = new vscode.EventEmitter<Position | null>();
    readonly onDidChangeTreeData: vscode.Event<Position | null> = this._onDidChangeTreeData.event;

    private tree!: DothttpJson;
    private editor!: vscode.TextEditor;
    private autoRefresh = true;
    private filename!: vscode.Uri;
    private enableEnvs: Set<String> = new Set();


    public refresh(offset?: Position): void {
        this.parseTree();
        if (offset) {
            this._onDidChangeTreeData.fire(offset);
        } else {
            this._onDidChangeTreeData.fire(null);
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
                pos.envProperty ? `${pos.envProperty}: ${this.tree[pos.env][pos.envProperty]}` : pos.env, pos.envProperty ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded
            );
            // TODO on click should open dothttp.json file
            item.command = {
                command: 'vscode.open',
                title: 'open',
                arguments: [this.filename]
            };
            // item.resourceUri = this.filename;
            if (!pos.envProperty) {
                if (this.enableEnvs.has(pos.env)) {
                    item.contextValue = viewState.enabled;
                }
                else {
                    item.contextValue = viewState.environment;
                }
            }
            return item;
        }
        return new vscode.TreeItem('dothttp');
    }

    constructor() {
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e));

    }

    private parseTree(): void {
        this.editor = vscode.window.activeTextEditor!;
        if (this.editor && this.editor.document && basename(this.editor.document.fileName) === ".dothttp.json") {
            this.filename = this.editor.document.uri;
            this.tree = json.parse(this.editor.document.getText()) as DothttpJson;
            this.enableEnvs = FileState.getState()?.envs ?? new Set();
        } else {
            const dirname = path.dirname(this.editor.document.fileName);
            // TODO check if file exists
            vscode.workspace.fs.readFile(vscode.Uri.parse(
                path.join(`${this.editor.document.uri.scheme}:${dirname}`, '.dothttp.json')
            )).then(bindata => {
                this.enableEnvs = FileState.getState()?.envs ?? new Set();
                this.filename = this.editor.document.uri;
                this.tree = json.parse(bindata.toString());
                this._onDidChangeTreeData.fire(null);
            }, error => {
                vscode.commands.executeCommand('setContext', 'dothttpEnvViewEnabled', false);

            })
        }
    }


    private onActiveEditorChanged(): void {
        if (vscode.window.activeTextEditor) {
            if (vscode.window.activeTextEditor.document.uri.scheme === 'file') {
                const fileName = vscode.window.activeTextEditor.document.fileName;
                const enabled = DotHttpEditorView.isHttpFile(fileName) || basename(fileName) === ".dothttp.json";
                vscode.commands.executeCommand('setContext', 'dothttpEnvViewEnabled', enabled);
                if (enabled) {
                    this.refresh();
                }
            }
        } else {
            vscode.commands.executeCommand('setContext', 'dothttpEnvViewEnabled', false);
        }
    }

    private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
        if (this.autoRefresh && changeEvent.document.uri.toString() === this.editor.document.uri.toString()) {
            this.refresh()
        }
    }

}