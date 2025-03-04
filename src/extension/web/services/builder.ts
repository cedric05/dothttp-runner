import * as vscode from "vscode";
import { DothttpNameSymbolProvider } from "../../native/services/editorIntellisense";
import { ClientHandler2 } from "./client";
import { ClientHandler } from "../../native/services/client";
import { LocalStorageService } from "./storage";
import { IHistoryService } from "../types/history";
import DotHttpEditorView from "../../views/editor";
import { HistoryTreeProvider } from "../../views/historytree";
import { EnvTree, PropertyTree } from "../../views/tree";
import { VersionInfo } from "./state";
import { IFileState } from "../types/properties";
import { Configuration } from "../utils/config";
import { UrlStore } from "../types/url";
import { NotebookKernel } from "./notebookkernel";
import { ApplicationServices } from "./global";
import { VscodeOutputChannelWrapper } from "../../native/services/languageservers/channelWrapper";


export class ApplicationBuilder {
    clientHandler?: ClientHandler;
    clientHandler2?: ClientHandler2;

    storageService?: LocalStorageService;
    fileStateService?: IFileState;
    envTree?: EnvTree;
    propTree?: PropertyTree;
    historyTreeProvider?: HistoryTreeProvider;
    historyService?: IHistoryService;
    dotHttpEditorView?: DotHttpEditorView;
    dothttpSymbolProvier?: DothttpNameSymbolProvider;
    diagnostics?: vscode.DiagnosticCollection;
    globalstorageService?: LocalStorageService;
    versionInfo?: VersionInfo;
    config?: Configuration;
    urlStore?: UrlStore;
    notebookkernel?: NotebookKernel;
    context?: vscode.ExtensionContext;
    channelWrapper?: VscodeOutputChannelWrapper;

    setStorageService(storageService: LocalStorageService) {
        this.storageService = storageService;
        return this;
    }
    setFileStateService(fileStateService: IFileState) {
        this.fileStateService = fileStateService;
        return this;
    }
    setEnvTree(envTree: EnvTree) {
        this.envTree = envTree;
        return this;
    }
    setPropTree(propTree: PropertyTree) {
        this.propTree = propTree;
        return this;
    }
    setHistoryTreeProvider(historyTreeProvider: HistoryTreeProvider) {
        this.historyTreeProvider = historyTreeProvider;
        return this;
    }
    setHistoryService(historyService: IHistoryService) {
        this.historyService = historyService;
        return this;
    }
    setDotHttpEditorView(dotHttpEditorView: DotHttpEditorView) {
        this.dotHttpEditorView = dotHttpEditorView;
        return this;
    }
    setDothttpSymbolProvier(dothttpSymbolProvier: DothttpNameSymbolProvider) {
        this.dothttpSymbolProvier = dothttpSymbolProvier;
        return this;
    }
    setDiagnostics(diagnostics: vscode.DiagnosticCollection) {
        this.diagnostics = diagnostics;
        return this;
    }
    setGlobalstorageService(globalstorageService: LocalStorageService) {
        this.globalstorageService = globalstorageService;
        return this;
    }
    setVersionInfo(versionInfo: VersionInfo) {
        this.versionInfo = versionInfo;
        return this;
    }
    setConfig(config: Configuration) {
        this.config = config;
        return this;
    }
    setUrlStore(urlStore: UrlStore) {
        this.urlStore = urlStore;
        return this;
    }
    setNotebookkernel(notebookkernel: NotebookKernel) {
        this.notebookkernel = notebookkernel;
        return this;
    }
    setContext(context: vscode.ExtensionContext) {
        this.context = context;
        return this;
    }
    build() {
        return ApplicationServices.initialize(this);
    }

    setClientHandler(client: ClientHandler) {
        this.clientHandler = client;
        return this;
    }

    setClientHandler2(client: ClientHandler2) {
        this.clientHandler2 = client;
        return this;
    }

    setChannelWrapper(channelWrapper: VscodeOutputChannelWrapper) {
        this.channelWrapper = channelWrapper;
        return this;
    }

}
