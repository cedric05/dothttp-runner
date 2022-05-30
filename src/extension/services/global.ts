import * as vscode from "vscode";
import { DothttpNameSymbolProvider } from "../editorIntellisense";
import { ClientHandler, ClientHandler2 } from "../lib/client";
import { LocalStorageService } from "../services/storage";
import { IHistoryService } from "../history";
import DotHttpEditorView from "../views/editor";
import { HistoryTreeProvider } from "../views/historytree";
import { EnvTree, PropertyTree } from "../views/tree";
import { VersionInfo } from "./state";
import { IFileState } from "./Iproperties";
import { Configuration } from "../models/config";
import { UrlStore } from "./UrlsModel";
import { NotebookKernel } from "./notebook";
import { ApplicationBuilder } from "./ApplicationBuilder";

export class ApplicationServices {
    private static _state: ApplicationServices;

    private clientHanler?: ClientHandler
    private clientHandler2?: ClientHandler2;
    private storageService?: LocalStorageService;
    private fileStateService?: IFileState;
    private envTree?: EnvTree
    private propTree?: PropertyTree;
    private historyTreeProvider?: HistoryTreeProvider;
    private historyService?: IHistoryService;
    private dotHttpEditorView?: DotHttpEditorView;
    private dothttpSymbolProvier?: DothttpNameSymbolProvider;
    private diagnostics?: vscode.DiagnosticCollection;
    private globalstorageService?: LocalStorageService;
    private versionInfo?: VersionInfo;
    private config?: Configuration;
    private urlStore?: UrlStore;
    private notebookkernel?: NotebookKernel;
    private context?: vscode.ExtensionContext;
    embeddedContent: Map<string, string>;

    private constructor(builder: ApplicationBuilder) {
        this.storageService = builder.storageService;
        this.globalstorageService = builder.globalstorageService;
        this.clientHanler = builder.clientHandler;
        this.clientHandler2 = builder.clientHandler2;
        this.fileStateService = builder.fileStateService;
        this.envTree = builder.envTree;
        this.propTree = builder.propTree;
        this.urlStore = builder.urlStore;
        this.historyService = builder.historyService;
        this.historyTreeProvider = builder.historyTreeProvider;
        this.dotHttpEditorView = builder.dotHttpEditorView;
        this.diagnostics = builder.diagnostics;
        this.dothttpSymbolProvier = builder.dothttpSymbolProvier;
        this.versionInfo = builder.versionInfo;
        this.config = builder.config;
        this.context = builder.context;
        this.embeddedContent = new Map<string, string>();
        this.context?.subscriptions.push(this.diagnostics!);
    }

    static initialize(builder: ApplicationBuilder){
        const app = new ApplicationServices(builder);
        this._state = app;
        return app;
    }

    static get() {
        if (ApplicationServices._state) {
            return ApplicationServices._state;
        } else {
            throw new Error("not initalized properly")
        }
    }

    public getClientHandler2() {
        return this.clientHandler2;
    }
    public setClientHandler2(value: ClientHandler2) {
        this.clientHandler2 = value;
    }


    public setEmbeddedContent(uri: string, content: string) {
        this.embeddedContent.set(uri, content);
    }

    getClientHandler() {
        return this.clientHanler;
    }

    getContext() {
        return this.context;
    }


    getStorageService() {
        return this.storageService;
    }

    getFileStateService() {
        return this.fileStateService;
    }

    getEnvProvder() {
        return this.envTree;
    }

    getPropTreeProvider() {
        return this.propTree;
    }

    getHistoryTreeProvider(){
        return this.historyTreeProvider;
    }

    getDiagnostics(){
        return this.diagnostics;
    }

    getDothttpSymbolProvier(){
        return this.dothttpSymbolProvier;
    }

    getDotHttpEditorView() {
        return this.dotHttpEditorView;
    }

    getHistoryService() {
        return this.historyService;
    }

    getGlobalstorageService(){
        return this.globalstorageService;
    }

    getVersionInfo(){
        return this.versionInfo;
    }

    getConfig(){
        return this.config;
    }

    getUrlStore() {
        return this.urlStore;
    }

    getNotebookkernel(){
        return this.notebookkernel;
    }

}