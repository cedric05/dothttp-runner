import { ClientHandler } from "./lib/client";
import * as vscode from "vscode";
import { ConfigVars } from "./models/config";

export class GlobalState {

    public clientHanler: ClientHandler
    static _state: GlobalState;

    static getState() {
        if (GlobalState._state) {
            return GlobalState._state;
        }
        GlobalState._state = new GlobalState();
        return GlobalState._state;
    }

    constructor() {

        this.clientHanler = new ClientHandler({
            std: true,
            pythonpath: vscode.workspace.getConfiguration().get(ConfigVars.pythonPath) as string
        });
    }

}