import * as vscode from "vscode";
import { ClientHandler } from "../lib/client";
import { Constants } from "../models/constants";
import { LocalStorageService } from "../services/storage";
import { EnvTree, PropertyTree } from "../views/tree";
import { FileState, IFileState } from "./state";

export class ApplicationServices {
    private static _state: ApplicationServices;

    public clientHanler: ClientHandler
    private storageService: LocalStorageService;
    private fileStateService: IFileState;
    private envTree: EnvTree
    private propTree: PropertyTree;

    constructor(context: vscode.ExtensionContext) {
        this.storageService = new LocalStorageService(context.workspaceState);
        this.clientHanler = new ClientHandler({
            std: true,
        });
        this.fileStateService = new FileState(this.storageService);
        this.envTree = new EnvTree();
        this.propTree = new PropertyTree();
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

}