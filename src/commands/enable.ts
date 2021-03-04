import * as vscode from 'vscode';
import { window } from 'vscode';
import { Constants } from '../models/constants';
import { ApplicationServices } from "../services/global";
import { Position } from '../views/tree';



export function enableCommand(node: Position) {
    ApplicationServices.get().getFileStateService().addEnv(
        window.activeTextEditor?.document.fileName!, node.env);
    ApplicationServices.get().getEnvProvder().refresh();
}

export function disableCommand(node: Position) {
    ApplicationServices.get().getFileStateService().removeEnv(
        window.activeTextEditor?.document.fileName!, node.env);
    ApplicationServices.get().getEnvProvder().refresh();
}



export function copyProperty(node: Position) {
    const value = ApplicationServices.get().getEnvProvder().getProperty(node);
    if (value) {
        vscode.env.clipboard.writeText(value);
    }
    return;
}


export function toggleExperimentalFlag(options: { flag: "experimental" | "history" | "nocookie" }) {
    var confKey = null
    switch (options.flag) {
        case "experimental":
            confKey = Constants.experimental;
            break;
        case "history":
            confKey = Constants.history;
            break;
        case "nocookie":
            confKey = Constants.nocookie;
            break;
    }
    vscode.workspace.getConfiguration().update(confKey, !vscode.workspace.getConfiguration().get(confKey), vscode.ConfigurationTarget.Workspace);
}