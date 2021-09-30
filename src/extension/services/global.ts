import * as vscode from "vscode";
import { DothttpNameSymbolProvider } from "../editorIntellisense";
import { ClientHandler } from "../lib/client";
import { LocalStorageService } from "../services/storage";
import { IHistoryService, TingoHistoryService } from "../tingohelpers";
import DotHttpEditorView from "../views/editor";
import { HistoryTreeProvider } from "../views/historytree";
import { EnvTree, PropertyTree } from "../views/tree";
import { FileState, IFileState, VersionInfo } from "./state";
import path = require('path');
import { Configuration } from "../models/config";
import * as fs from 'fs';
import { UrlStorageService, UrlStore } from "./UrlStorage";
import { NotebookKernel } from "./notebook";

export class ApplicationServices {
    private static _state: ApplicationServices;

    public clientHanler: ClientHandler
    private storageService: LocalStorageService;
    private fileStateService: IFileState;
    private envTree: EnvTree
    private propTree: PropertyTree;
    private historyTreeProvider: HistoryTreeProvider;
    private historyService: IHistoryService;
    private dotHttpEditorView: DotHttpEditorView;
    private dothttpSymbolProvier: DothttpNameSymbolProvider;
    private diagnostics: vscode.DiagnosticCollection;
    private globalstorageService: LocalStorageService;
    private versionInfo: VersionInfo;
    private config: Configuration;
    private urlStore: UrlStore;
    private notebookkernel!: NotebookKernel;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.storageService = new LocalStorageService(context.workspaceState);
        this.globalstorageService = new LocalStorageService(context.globalState);
        this.clientHanler = new ClientHandler({
            std: true,
        });
        this.fileStateService = new FileState(this.storageService);
        this.envTree = new EnvTree();
        this.propTree = new PropertyTree();
        if (!fs.existsSync(context.globalStorageUri.fsPath)) {
            fs.mkdirSync(context.globalStorageUri.fsPath);
        }
        this.urlStore = new UrlStorageService(this.storageService);
        this.historyService = new TingoHistoryService(path.join(context.globalStorageUri.fsPath, 'db'));
        this.historyTreeProvider = new HistoryTreeProvider();
        this.dotHttpEditorView = new DotHttpEditorView();
        this.diagnostics = vscode.languages.createDiagnosticCollection("dothttp-syntax-errors");
        this.dothttpSymbolProvier = new DothttpNameSymbolProvider();
        this.versionInfo = new VersionInfo(this.globalstorageService);
        this.config = Configuration.instance();
        this.context = context;
        context.subscriptions.push(this.diagnostics);
    }

    static get() {
        if (ApplicationServices._state) {
            return ApplicationServices._state;
        } else {
            throw new Error("not initalized properly")
        }
    }

    static initialize(context: vscode.ExtensionContext) {
        const state = new ApplicationServices(context);
        state.postInitialize();
        ApplicationServices._state = state;
        return ApplicationServices._state;
    }

    postInitialize() {
        this.envTree.setFileStateService(this);
        this.propTree.fileStateService = this.fileStateService;
        this.historyTreeProvider.historyService = this.historyService;
        this.dotHttpEditorView.historyService = this.historyService;
        this.dothttpSymbolProvier.setClientHandler(this.clientHanler);
        this.dothttpSymbolProvier.setDiagnostics(this.diagnostics);

    }

    getClientHandler(): ClientHandler {
        return this.clientHanler;
    }

    getContext() {
        return this.context;
    }

    setContext(context: vscode.ExtensionContext) {
        this.context = context;
    }

    getStorageService(): LocalStorageService {
        return this.storageService;
    }

    getFileStateService(): IFileState {
        return this.fileStateService;
    }

    getEnvProvder() {
        return this.envTree;
    }

    getPropTreeProvider(): PropertyTree {
        return this.propTree;
    }

    getHistoryTreeProvider(): HistoryTreeProvider {
        return this.historyTreeProvider;
    }
    setHistoryTreeProvider(value: HistoryTreeProvider) {
        this.historyTreeProvider = value;
    }

    getDiagnostics(): vscode.DiagnosticCollection {
        return this.diagnostics;
    }
    setDiagnostics(value: vscode.DiagnosticCollection) {
        this.diagnostics = value;
    }

    getDothttpSymbolProvier(): DothttpNameSymbolProvider {
        return this.dothttpSymbolProvier;
    }
    setDothttpSymbolProvier(value: DothttpNameSymbolProvider) {
        this.dothttpSymbolProvier = value;
    }

    getDotHttpEditorView(): DotHttpEditorView {
        return this.dotHttpEditorView;
    }
    setDotHttpEditorView(value: DotHttpEditorView) {
        this.dotHttpEditorView = value;
    }

    getHistoryService(): IHistoryService {
        return this.historyService;
    }
    setHistoryService(value: IHistoryService) {
        this.historyService = value;
    }

    getGlobalstorageService(): LocalStorageService {
        return this.globalstorageService;
    }
    setGlobalstorageService(value: LocalStorageService) {
        this.globalstorageService = value;
    }

    getVersionInfo(): VersionInfo {
        return this.versionInfo;
    }
    setVersionInfo(value: VersionInfo) {
        this.versionInfo = value;
    }

    public getConfig(): Configuration {
        return this.config;
    }
    public setConfig(value: Configuration) {
        this.config = value;
    }


    public getUrlStore(): UrlStore {
        return this.urlStore;
    }
    public setUrlStore(value: UrlStore) {
        this.urlStore = value;
    }

    public getNotebookkernel(): NotebookKernel {
        return this.notebookkernel;
    }
    public setNotebookkernel(value: NotebookKernel) {
        this.notebookkernel = value;
    }

}