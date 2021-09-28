import * as vscode from 'vscode';
import {
	DothttpClickDefinitionProvider,
	UrlExpander
} from './editorIntellisense';
import { copyProperty, disableCommand, enableCommand, toggleExperimentalFlag } from './commands/enable';
import { generateLangForHttpFile } from "./commands/export/generate";
import { genCurlCommand, runFileCommand, runHttpCodeLensCommand, runTargetInCell } from './commands/run';
import { importRequests } from "./commands/import";
import { exportToPostman } from "./commands/export/postman";
import { saveNotebookAsHttpFile } from "./commands/saveNotebookAsHttpFile";
import { setUp, updateDothttpIfAvailable } from './downloader';
import { Constants } from './models/constants';
import { HeaderCompletionItemProvider, KeywordCompletionItemProvider, UrlCompletionProvider, VariableCompletionProvider } from './services/dothttpCompletion';
import { ApplicationServices } from './services/global';
import { NotebookKernel, NotebookSerializer } from './services/notebook';
import DotHttpEditorView from './views/editor';

export async function activate(context: vscode.ExtensionContext) {
	await bootStrap(context);

	const appServices = ApplicationServices.get();

	loadNoteBookControllerSafely(context);


	context.subscriptions.push(...[
		vscode.commands.registerTextEditorCommand(Constants.RUN_FILE_COMMAND, runFileCommand),
		vscode.commands.registerTextEditorCommand(Constants.GEN_CURL_FILE_COMMAND, genCurlCommand),
		vscode.commands.registerTextEditorCommand(Constants.RUN_TARGET_CODE_LENS, runHttpCodeLensCommand),
		vscode.commands.registerCommand(Constants.openEnvFileCommmand, () => appServices.getEnvProvder().openEnvFile()),
		vscode.commands.registerCommand(Constants.toggleExperimentalCommand, toggleExperimentalFlag(Constants.toggleExperimentalCommand)),
		vscode.commands.registerCommand(Constants.toggleHistoryCommand, toggleExperimentalFlag(Constants.toggleHistoryCommand)),
		vscode.commands.registerCommand(Constants.toggleNocookieCommand, toggleExperimentalFlag(Constants.toggleNocookieCommand)),
		vscode.commands.registerCommand(Constants.toggleHeadersCommand, toggleExperimentalFlag(Constants.toggleHeadersCommand)),
		vscode.commands.registerCommand(Constants.toggleReuseTabCommand, toggleExperimentalFlag(Constants.toggleReuseTabCommand)),
		vscode.commands.registerCommand(Constants.toggleRunRecentCommand, toggleExperimentalFlag(Constants.toggleRunRecentCommand)),
		vscode.commands.registerCommand(Constants.IMPORT_RESOURCE_COMMAND, importRequests),
		vscode.commands.registerCommand(Constants.EXPORT_RESOURCE_COMMAND, exportToPostman),
		vscode.commands.registerCommand(Constants.GENERATE_PROG_LANG_COMMAND, generateLangForHttpFile),
		vscode.commands.registerCommand(Constants.RESTART_CLI_COMMAND, () => {
			appServices.getClientHandler().restart();
		}),
		vscode.commands.registerCommand(Constants.RUN_NOTEBOOK_TARGET_IN_CELL, runTargetInCell),
		vscode.commands.registerCommand(Constants.HTTPBOOK_SAVE_AS_HTTP, saveNotebookAsHttpFile),
		vscode.workspace.registerTextDocumentContentProvider(DotHttpEditorView.scheme, appServices.getDotHttpEditorView()),
	])



	// env view commands
	const envProvider = appServices.getEnvProvder();
	context.subscriptions.push(...[
		vscode.window.registerTreeDataProvider(Constants.envTreeView, envProvider),
		vscode.commands.registerCommand(Constants.refreshEnvCommand, () => envProvider.refresh()),
		vscode.commands.registerCommand(Constants.enableEnvCommand, enableCommand),
		vscode.commands.registerCommand(Constants.disableEnvCommand, disableCommand),
		vscode.commands.registerCommand(Constants.copyEnvValueCommand, copyProperty),
		vscode.commands.registerCommand(Constants.disableAllEnvCommmand, () => { envProvider.disableAllEnv() }),
	])


	// propertiy view commands
	const propProvider = appServices.getPropTreeProvider();
	context.subscriptions.push(...[
		vscode.window.registerTreeDataProvider(Constants.propTreeView, propProvider),
		vscode.commands.registerCommand(Constants.addPropCommand, () => { propProvider.addProperty() }),
		vscode.commands.registerCommand(Constants.disableAllPropCommand, () => { propProvider.disableAllProperies() }),
		vscode.commands.registerCommand(Constants.enablePropCommand, (node) => { propProvider.enableProperty(node) }),
		vscode.commands.registerCommand(Constants.disablePropCommand, (node) => { propProvider.disableProperty(node) }),
		vscode.commands.registerCommand(Constants.copyEnvPropCommand, (node) => { propProvider.copyProperty(node) }),
		vscode.commands.registerCommand(Constants.updatePropCommand, (node) => { propProvider.updateProperty(node) }),
		vscode.commands.registerCommand(Constants.removePropCommand, (node) => { propProvider.removeProperty(node) }),
	]);


	const clickProvider = new DothttpClickDefinitionProvider();
	context.subscriptions.push(...[

		vscode.languages.registerCodeLensProvider(Constants.langCode, appServices.getDothttpSymbolProvier()),
		vscode.languages.registerDefinitionProvider(Constants.langCode, clickProvider),
		vscode.languages.registerHoverProvider(Constants.langCode, clickProvider),

		vscode.languages.registerCodeActionsProvider(Constants.langCode, appServices.getDothttpSymbolProvier()),
		vscode.languages.registerCodeActionsProvider(Constants.langCode, new UrlExpander()),
		vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: Constants.langCode }, appServices.getDothttpSymbolProvier()),
		vscode.window.registerTreeDataProvider(Constants.dothttpHistory, appServices.getHistoryTreeProvider()),


		vscode.languages.registerCompletionItemProvider(Constants.langCode, new UrlCompletionProvider(), ...UrlCompletionProvider.triggerCharacters),
		vscode.languages.registerCompletionItemProvider(Constants.langCode, new VariableCompletionProvider(), ...VariableCompletionProvider.triggerCharacters),
		vscode.languages.registerCompletionItemProvider(Constants.langCode, new HeaderCompletionItemProvider(), ...HeaderCompletionItemProvider.triggerCharacters),

		vscode.languages.registerCompletionItemProvider(Constants.langCode, new KeywordCompletionItemProvider(), ...KeywordCompletionItemProvider.triggerCharacters),
	]);





}


function loadNoteBookControllerSafely(_context: vscode.ExtensionContext) {
	try {
		const notebookSerializer = new NotebookSerializer();
		const notebookkernel = new NotebookKernel();
		ApplicationServices.get().setNotebookkernel(notebookkernel);
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
