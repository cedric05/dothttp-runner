import * as vscode from 'vscode';
import { ClientHandler2 } from './web/services/client';
import { HttpClient } from './web/lib/languageservers/HttpClient';
import { NotebookKernel } from './web/services/notebookkernel';
import { NotebookSerializer } from "./web/services/notebookserializer";
import { FileState } from './web/services/state';
import { LocalStorageService } from './web/services/storage';
import { PropertyTree } from './views/tree';
import { ApplicationBuilder } from './web/services/builder';
import { Constants } from './web/utils/constants';
import { Configuration } from './web/utils/config';

export async function activate(context: vscode.ExtensionContext) {
    vscode.commands.executeCommand('setContext', Constants.EXTENSION_RUN_MODE, "web");
    loadNoteBookControllerSafely(context);
    let client = new ClientHandler2();
    client.setCli(new HttpClient(Configuration.agent));
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