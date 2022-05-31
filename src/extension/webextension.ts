import * as vscode from 'vscode';
import { ClientHandler2 } from './lib/client';
import { HttpClient } from './lib/handlers/HttpClient';
import { Constants } from './models/constants';
import { ApplicationBuilder } from './services/ApplicationBuilder';
import { NotebookKernel } from './services/notebook';
import { NotebookSerializer } from "./services/NotebookSerializer";
import { FileState } from './services/state';
import { LocalStorageService } from './services/storage';
import { PropertyTree } from './views/tree';

export async function activate(context: vscode.ExtensionContext) {
    vscode.commands.executeCommand('setContext', Constants.EXTENSION_RUN_MODE, "web");
    loadNoteBookControllerSafely(context);
    let client = new ClientHandler2();
    client.setCli(new HttpClient( "http://localhost:5000"));
    let localStorage = new LocalStorageService(context.workspaceState);
    let filestateservice = new FileState(localStorage);
    let propertyTree = new PropertyTree();
    let notebookkernel = new NotebookKernel();
    notebookkernel.configure(client, filestateservice, propertyTree)
    const app = new ApplicationBuilder()
        .setClientHandler2(client)
        .setStorageService(localStorage)
        .setNotebookkernel(notebookkernel)
        .setFileStateService(filestateservice)
        .build()
}

export function deactivate(_context: vscode.ExtensionContext): undefined {
    return;
}



export function loadNoteBookControllerSafely(_context: vscode.ExtensionContext) {
    const notebookSerializer = new NotebookSerializer();
    vscode.workspace.registerNotebookSerializer(Constants.NOTEBOOK_ID, notebookSerializer, {
        transientOutputs: false,
        transientCellMetadata: {
            inputCollapsed: true,
            outputCollapsed: true,
        }
    });
}