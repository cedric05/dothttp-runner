import { window } from 'vscode';
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