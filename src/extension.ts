import * as vscode from 'vscode';
import { copyProperty, disableCommand, enableCommand, toggleExperimentalFlag } from './commands/enable';
import { genCurlCommand, importRequests, runFileCommand } from './commands/run';
import { setUp } from './downloader';
import { Constants } from './models/constants';
import { ApplicationServices } from './services/global';
import DotHttpEditorView from './views/editor';

export async function activate(context: vscode.ExtensionContext) {
	await setUp(context);
	ApplicationServices.initialize(context);
	const appServices = ApplicationServices.get();
	let runCommandDisp = vscode.commands.registerTextEditorCommand(Constants.runFileCommand, runFileCommand());
	let genCurlDisp = vscode.commands.registerTextEditorCommand(Constants.genCurlForFileCommand, genCurlCommand());

	let openEnvFileDisp = vscode.commands.registerCommand(Constants.openEnvFileCommmand, function () {
		const filename = appServices.getEnvProvder().filename;
		vscode.workspace.openTextDocument(filename).then(editor => {
			vscode.window.showTextDocument(editor, 2, false);
		});
	});

	vscode.commands.registerCommand(Constants.toggleExperimentalCommand,
		() => toggleExperimentalFlag({ 'flag': "experimental" }));
	vscode.commands.registerCommand(Constants.toggleHistoryCommand,
		() => toggleExperimentalFlag({ 'flag': "history" }));
	vscode.commands.registerCommand(Constants.toggleNocookieCommand,
		() => toggleExperimentalFlag({ 'flag': "nocookie" }));
	vscode.commands.registerCommand(Constants.toggleHeadersCommand,
		() => toggleExperimentalFlag({ 'flag': "headers" }));

	vscode.commands.registerCommand(Constants.importCommand, importRequests)



	vscode.workspace.registerTextDocumentContentProvider(DotHttpEditorView.scheme, appServices.getDotHttpEditorView());
	context.subscriptions.push(runCommandDisp);
	context.subscriptions.push(genCurlDisp);
	context.subscriptions.push(openEnvFileDisp)

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
	vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: Constants.langCode }, appServices.getDothttpSymbolProvier());

	vscode.window.registerTreeDataProvider(Constants.dothttpHistory, appServices.getHistoryTreeProvider());

}

export function deactivate() { }
