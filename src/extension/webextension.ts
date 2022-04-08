import * as vscode from 'vscode';
import { Constants } from './models/constants';
import { NotebookSerializer } from "./services/NotebookSerializer";

export async function activate(context: vscode.ExtensionContext) {
    vscode.commands.executeCommand('setContext', Constants.EXTENSION_RUN_MODE, "web");
    loadNoteBookControllerSafely(context);
}

export function deactivate(_context: vscode.ExtensionContext): undefined {
    return;
}



export function loadNoteBookControllerSafely(_context: vscode.ExtensionContext) {
    try {
        const notebookSerializer = new NotebookSerializer();
        vscode.workspace.registerNotebookSerializer(Constants.NOTEBOOK_ID, notebookSerializer, {
            transientOutputs: false,
            transientCellMetadata: {
                inputCollapsed: true,
                outputCollapsed: true,
            }
        });
    } catch (error) {
    }
}