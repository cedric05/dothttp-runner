import * as vscode from 'vscode';
import { copyProperty, disableCommand, enableCommand, toggleExperimentalFlag } from './commands/enable';
import { genCurlCommand, importRequests, runFileCommand } from './commands/run';
import { setUp, updateDothttpIfAvailable } from './downloader';
import { Constants } from './models/constants';
import { ApplicationServices } from './services/global';
import DotHttpEditorView from './views/editor';

export async function activate(context: vscode.ExtensionContext) {
	await bootStrap(context);
	
	const appServices = ApplicationServices.get();

	let runCommandDisp = vscode.commands.registerTextEditorCommand(Constants.runFileCommand, runFileCommand);
	let genCurlDisp = vscode.commands.registerTextEditorCommand(Constants.genCurlForFileCommand, genCurlCommand);
	let openEnvFileDisp = vscode.commands.registerCommand(Constants.openEnvFileCommmand, () => appServices.getEnvProvder().openEnvFile());

	context.subscriptions.push(runCommandDisp);
	context.subscriptions.push(genCurlDisp);
	context.subscriptions.push(openEnvFileDisp)

	vscode.commands.registerCommand(Constants.toggleExperimentalCommand, toggleExperimentalFlag("experimental"));
	vscode.commands.registerCommand(Constants.toggleHistoryCommand, toggleExperimentalFlag("history"));
	vscode.commands.registerCommand(Constants.toggleNocookieCommand, toggleExperimentalFlag("nocookie"));
	vscode.commands.registerCommand(Constants.toggleHeadersCommand, toggleExperimentalFlag("headers"));
	vscode.commands.registerCommand(Constants.importCommand, importRequests)



	vscode.workspace.registerTextDocumentContentProvider(DotHttpEditorView.scheme, appServices.getDotHttpEditorView());

	// env view commands
	const envProvider = appServices.getEnvProvder();
	vscode.window.registerTreeDataProvider(Constants.envTreeView, envProvider);
	
	vscode.commands.registerCommand(Constants.refreshEnvCommand, () => envProvider.refresh());
	vscode.commands.registerCommand(Constants.enableEnvCommand, enableCommand);
	vscode.commands.registerCommand(Constants.disableEnvCommand, disableCommand);
	vscode.commands.registerCommand(Constants.copyEnvValueCommand, copyProperty);
	vscode.commands.registerCommand(Constants.disableAllEnvCommmand, () => { envProvider.disableAllEnv() });


	// propertiy view commands
	const propProvider = appServices.getPropTreeProvider();
	vscode.window.registerTreeDataProvider(Constants.propTreeView, propProvider);

	vscode.commands.registerCommand(Constants.addPropCommand, () => { propProvider.addProperty() });
	vscode.commands.registerCommand(Constants.disableAllPropCommand, () => { propProvider.disableAllProperies() });
	vscode.commands.registerCommand(Constants.enablePropCommand, (node) => { propProvider.enableProperty(node) });
	vscode.commands.registerCommand(Constants.disablePropCommand, (node) => { propProvider.disableProperty(node) });
	vscode.commands.registerCommand(Constants.copyEnvPropCommand, (node) => { propProvider.copyProperty(node) });
	vscode.commands.registerCommand(Constants.updatePropCommand, (node) => { propProvider.updateProperty(node) });
	vscode.commands.registerCommand(Constants.removePropCommand, (node) => { propProvider.removeProperty(node) });



	vscode.languages.registerCodeLensProvider(Constants.langCode, appServices.getDothttpSymbolProvier());
	vscode.languages.registerCodeActionsProvider(Constants.langCode, appServices.getDothttpSymbolProvier());
	vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: Constants.langCode }, appServices.getDothttpSymbolProvier());
	vscode.window.registerTreeDataProvider(Constants.dothttpHistory, appServices.getHistoryTreeProvider());

}

async function bootStrap(context: vscode.ExtensionContext) {
	const version = await setUp(context);
	ApplicationServices.initialize(context);
	if (version) {
		ApplicationServices.get().getVersionInfo().setVersionDothttpInfo(version);
	}
	updateDothttpIfAvailable(context.globalStorageUri.fsPath);
}

export function deactivate() { }
