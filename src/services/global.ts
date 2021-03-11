import * as vscode from "vscode";
import { DothttpNameSymbolProvider } from "../codelensprovider";
import { ClientHandler } from "../lib/client";
import { LocalStorageService } from "../services/storage";
import { IHistoryService, TingoHistoryService } from "../tingohelpers";
import DotHttpEditorView from "../views/editor";
import { HistoryTreeProvider } from "../views/historytree";
import { EnvTree, PropertyTree } from "../views/tree";
import { FileState, IFileState } from "./state";
import path = require('path');

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

    constructor(context: vscode.ExtensionContext) {
        this.storageService = new LocalStorageService(context.workspaceState);
        this.clientHanler = new ClientHandler({
            std: true,
        });
        this.fileStateService = new FileState(this.storageService);
        this.envTree = new EnvTree();
        this.propTree = new PropertyTree();
        this.historyService = new TingoHistoryService(path.join(context.globalStorageUri.fsPath, 'db'));
        this.historyTreeProvider = new HistoryTreeProvider();
        this.dotHttpEditorView = new DotHttpEditorView();
        this.diagnostics = vscode.languages.createDiagnosticCollection("dothttp-syntax-errors");
        this.dothttpSymbolProvier = new DothttpNameSymbolProvider();
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

}