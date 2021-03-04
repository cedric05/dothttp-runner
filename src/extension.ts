import * as vscode from 'vscode';
import { CodelensProvider } from './codelensprovider';
import { copyProperty, disableCommand, enableCommand, toggleExperimentalFlag } from './commands/enable';
import { runHttpFileWithOptions } from './commands/run';
import { Constants } from './models/constants';
import { ApplicationServices } from './services/global';
import DotHttpEditorView from './views/editor';

export function activate(context: vscode.ExtensionContext) {
	ApplicationServices.initialize(context);
	let runCommandDisp = vscode.commands.registerTextEditorCommand(Constants.runFileCommand, function (...arr) {
		if (arr) {
			// this is bad, find out better signature
			runHttpFileWithOptions({ target: arr[2].target, curl: false });
		} else {
			runHttpFileWithOptions({ curl: false, target: '1' });
		}
	});
	let genCurlDisp = vscode.commands.registerTextEditorCommand(Constants.genCurlForFileCommand, function (...arr) {
		if (arr) {
			runHttpFileWithOptions({ target: arr[2].target, curl: true });
		} else {
			runHttpFileWithOptions({ curl: true, target: '1' });
		}
	});

	let openEnvFileDisp = vscode.commands.registerCommand(Constants.openEnvFileCommmand, function () {
		const filename = ApplicationServices.get().getEnvProvder().filename;
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



	const provider = new DotHttpEditorView();
	vscode.workspace.registerTextDocumentContentProvider(DotHttpEditorView.scheme, provider);
	context.subscriptions.push(runCommandDisp);
	context.subscriptions.push(genCurlDisp);
	context.subscriptions.push(openEnvFileDisp)

	const envProvider = ApplicationServices.get().getEnvProvder();
	vscode.window.registerTreeDataProvider(Constants.envTreeView, envProvider);
	vscode.commands.registerCommand(Constants.refreshEnvCommand, () => envProvider.refresh());
	vscode.commands.registerCommand(Constants.enableEnvCommand, enableCommand);
	vscode.commands.registerCommand(Constants.disableEnvCommand, disableCommand);
	vscode.commands.registerCommand(Constants.copyEnvValueCommand, copyProperty);


	const propProvider = ApplicationServices.get().getPropTreeProvider();
	vscode.window.registerTreeDataProvider(Constants.propTreeView, propProvider);

	vscode.commands.registerCommand(Constants.addPropCommand, () => { propProvider.addProperty() });
	vscode.commands.registerCommand(Constants.disableAllPropCommand, () => { propProvider.disableAllProperies() });

	vscode.commands.registerCommand(Constants.enablePropCommand, (node) => { propProvider.enableProperty(node) });
	vscode.commands.registerCommand(Constants.disablePropCommand, (node) => { propProvider.disableProperty(node) });
	vscode.commands.registerCommand(Constants.copyEnvPropCommand, (node) => { propProvider.copyProperty(node) });
	vscode.commands.registerCommand(Constants.updatePropCommand, (node) => { propProvider.updateProperty(node) });
	vscode.commands.registerCommand(Constants.removePropCommand, (node) => { propProvider.removeProperty(node) });

	vscode.languages.registerCodeLensProvider("dothttp-vscode", new CodelensProvider());

}
export function deactivate() { }
