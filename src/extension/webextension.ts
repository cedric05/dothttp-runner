import * as vscode from 'vscode';
import { ClientHandler2 } from './web/services/client';
import { HttpClient } from './web/lib/languageservers/HttpClient';
import { NotebookKernel } from './web/services/notebookkernel';
import { NotebookSerializer } from "./web/services/notebookserializer";
import { FileState } from './web/services/state';
import { LocalStorageService } from './web/services/storage';
import { EnvTree, PropertyTree } from './views/tree';
import { ApplicationBuilder } from './web/services/builder';
import { Constants } from './web/utils/constants';
import { Configuration } from './web/utils/config';
import { copyProperty, disableCommand, enableCommand } from './web/commands/enable';

export async function activate(context: vscode.ExtensionContext) {
    vscode.commands.executeCommand('setContext', Constants.EXTENSION_RUN_MODE, "web");
    loadNoteBookControllerSafely(context);
    let client = new ClientHandler2();
    client.setCli(new HttpClient(Configuration.agent));
    let localStorage = new LocalStorageService(context.workspaceState);
    let filestateservice = new FileState(localStorage);
    let propertyTree = new PropertyTree();
    let envTree = new EnvTree();
    envTree.setFileStateService(filestateservice);
    let notebookkernel = new NotebookKernel();
    notebookkernel.configure(client, filestateservice, propertyTree)
    const app = new ApplicationBuilder()
        .setClientHandler2(client)
        .setStorageService(localStorage)
        .setNotebookkernel(notebookkernel)
        .setFileStateService(filestateservice)
        .setEnvTree(envTree)
        .build()
    context.subscriptions.push(...[
        vscode.window.registerTreeDataProvider(Constants.envTreeView, envTree),
        vscode.commands.registerCommand(Constants.refreshEnvCommand, () => envTree.refresh()),
        vscode.commands.registerCommand(Constants.enableEnvCommand, enableCommand),
        vscode.commands.registerCommand(Constants.disableEnvCommand, disableCommand),
        vscode.commands.registerCommand(Constants.copyEnvValueCommand, copyProperty),
        vscode.commands.registerCommand(Constants.disableAllEnvCommmand, () => { envTree.disableAllEnv() }),
    ])
    // propertiy view commands
    context.subscriptions.push(...[
        vscode.window.registerTreeDataProvider(Constants.propTreeView, propertyTree),
        vscode.commands.registerCommand(Constants.addPropCommand, () => { propertyTree.addProperty() }),
        vscode.commands.registerCommand(Constants.disableAllPropCommand, () => { propertyTree.disableAllProperies() }),
        vscode.commands.registerCommand(Constants.enablePropCommand, (node) => { propertyTree.enableProperty(node) }),
        vscode.commands.registerCommand(Constants.disablePropCommand, (node) => { propertyTree.disableProperty(node) }),
        vscode.commands.registerCommand(Constants.copyEnvPropCommand, (node) => { propertyTree.copyProperty(node) }),
        vscode.commands.registerCommand(Constants.updatePropCommand, (node) => { propertyTree.updateProperty(node) }),
        vscode.commands.registerCommand(Constants.removePropCommand, (node) => { propertyTree.removeProperty(node) }),
    ]);

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