import * as vscode from 'vscode';
import { copyProperty, disableCommand, enableCommand, toggleExperimentalFlag } from './commands/enable';
import { genCurlCommand, importRequests, runFileCommand } from './commands/run';
import { generateLang } from "./commands/generate";
import { setUp, updateDothttpIfAvailable } from './downloader';
import { Constants } from './models/constants';
import { ApplicationServices } from './services/global';
import DotHttpEditorView from './views/editor';
import { HeaderCompletionItemProvider, KeywordCompletionItemProvider, UrlCompletionProvider, VariableCompletionProvider } from './services/dothttpCompletion';
import { NotebookKernel, NotebookSerializer } from './services/notebook';

export async function activate(context: vscode.ExtensionContext) {
	await bootStrap(context);

	const appServices = ApplicationServices.get();

	loadNoteBookControllerSafely();

	let runCommandDisp = vscode.commands.registerTextEditorCommand(Constants.runFileCommand, runFileCommand);
	let genCurlDisp = vscode.commands.registerTextEditorCommand(Constants.genCurlForFileCommand, genCurlCommand);
	let openEnvFileDisp = vscode.commands.registerCommand(Constants.openEnvFileCommmand, () => appServices.getEnvProvder().openEnvFile());

	context.subscriptions.push(runCommandDisp);
	context.subscriptions.push(genCurlDisp);
	context.subscriptions.push(openEnvFileDisp)

	vscode.commands.registerCommand(Constants.toggleExperimentalCommand, toggleExperimentalFlag(Constants.toggleExperimentalCommand));
	vscode.commands.registerCommand(Constants.toggleHistoryCommand, toggleExperimentalFlag(Constants.toggleHistoryCommand));
	vscode.commands.registerCommand(Constants.toggleNocookieCommand, toggleExperimentalFlag(Constants.toggleNocookieCommand));
	vscode.commands.registerCommand(Constants.toggleHeadersCommand, toggleExperimentalFlag(Constants.toggleHeadersCommand));
	vscode.commands.registerCommand(Constants.toggleReuseTabCommand, toggleExperimentalFlag(Constants.toggleReuseTabCommand));
	vscode.commands.registerCommand(Constants.toggleRunRecentCommand, toggleExperimentalFlag(Constants.toggleRunRecentCommand));
	vscode.commands.registerCommand(Constants.importCommand, importRequests)
	vscode.commands.registerCommand(Constants.generateLangCommand, generateLang);




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


	vscode.languages.registerCompletionItemProvider(Constants.langCode, new UrlCompletionProvider(), ...UrlCompletionProvider.triggerCharacters);
	vscode.languages.registerCompletionItemProvider(Constants.langCode, new VariableCompletionProvider(), ...VariableCompletionProvider.triggerCharacters);
	vscode.languages.registerCompletionItemProvider(Constants.langCode, new HeaderCompletionItemProvider(), ...HeaderCompletionItemProvider.triggerCharacters);

	vscode.languages.registerCompletionItemProvider(Constants.langCode, new KeywordCompletionItemProvider(), ...KeywordCompletionItemProvider.triggerCharacters);







}

function loadNoteBookControllerSafely() {
	try {
		const notebookSerializer = new NotebookSerializer();
		const _notebookkernel = new NotebookKernel();
		vscode.notebook.registerNotebookSerializer('dothttp-book', notebookSerializer, {
			transientOutputs: false,
			transientCellMetadata: {
				inputCollapsed: true,
				outputCollapsed: true,
			}
		});
	} catch (error) {
	}
}

async function bootStrap(context: vscode.ExtensionContext) {
	const version = await setUp(context);
	ApplicationServices.initialize(context);
	if (version) {
		ApplicationServices.get().getVersionInfo().setVersionDothttpInfo(version);
	}
	updateDothttpIfAvailable(context.globalStorageUri.fsPath);
}

export function deactivate(_context: vscode.ExtensionContext): undefined {
	const appServices = ApplicationServices.get();
	appServices.getClientHandler().close();

	return;
}
