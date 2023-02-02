import * as vscode from 'vscode';
import { window } from 'vscode';
import { Constants } from '../utils/constants';
import { ApplicationServices } from "../services/global";
import { Position } from '../../views/tree';



export function enableCommand(node: Position) {
    ApplicationServices.get().getFileStateService()?.addEnv(
        window.activeTextEditor?.document.uri!, node.env);
    ApplicationServices.get().getEnvProvder()?.refresh();
}

export function disableCommand(node: Position) {
    ApplicationServices.get().getFileStateService()?.removeEnv(
        window.activeTextEditor?.document.uri!, node.env);
    ApplicationServices.get().getEnvProvder()?.refresh();
}



export function copyProperty(node: Position) {
    const value = ApplicationServices.get().getEnvProvder()?.getProperty(node);
    if (value) {
        vscode.env.clipboard.writeText(value);
    }
    return;
}


export function toggleExperimentalFlag(confKey: string) {
    return function () {
        var key = "";
        switch (confKey) {
            case "dothttp.command.toggle.experimental":
                key = "dothttp.conf.experimental"
                break;
            case "dothttp.command.toggle.history":
                key = "dothttp.conf.history"
                break;
            case "dothttp.command.toggle.nocookie":
                key = "dothttp.conf.nocookie"
                break;
            case "dothttp.command.toggle.showheaders":
                key = "dothttp.conf.showheaders"
                break;
            case "dothttp.command.toggle.runrecent":
                key = "dothttp.conf.runrecent"
                break;
            case "dothttp.command.toggle.reuse":
                key = "dothttp.conf.run.reuseold"
                break;
            case Constants.COMMAND_TOGGLE_UNSTABLE:
                key = Constants.CONFIG_DOTHTTP_USE_STABLE;
            case Constants.TOGGLE_OPEN_NOTEBOOK_SUGGESTION:
                key = Constants.CONF_OPEN_NOTEBOOK_SUGGESTION;
        }
        const currentValue = vscode.workspace.getConfiguration().get(key);
        vscode.workspace.getConfiguration().update(key, !currentValue, vscode.ConfigurationTarget.Workspace);
    };
}