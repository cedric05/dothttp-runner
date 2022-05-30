import * as vscode from 'vscode';
import { ClientHandler2 } from './lib/client';
import { RunType } from './lib/types';
import { Constants } from './models/constants';
import { NotebookKernel } from './services/notebook';
import { NotebookSerializer } from "./services/NotebookSerializer";
import { FileState } from './services/state';
import { LocalStorageService } from './services/storage';

export async function activate(context: vscode.ExtensionContext) {
    vscode.commands.executeCommand('setContext', Constants.EXTENSION_RUN_MODE, "web");
    loadNoteBookControllerSafely(context);
    let notebookkernel = new NotebookKernel();
    let client = new ClientHandler2();
    client.setLaunchParams({ path: "", type: RunType.http, url: "http://localhost:5000" }).start();
    let localStorage = new LocalStorageService(context.workspaceState);
    let filestateservice = new FileState(localStorage);
    notebookkernel.setClient(client)
    notebookkernel.setFileStateService(filestateservice);
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