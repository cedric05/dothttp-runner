import * as vscode from 'vscode';
import { workspace } from 'vscode';
import { copyProperty, disableCommand, enableCommand, toggleExperimentalFlag } from './web/commands/enable';
import { generateLangForHttpFile } from "./native/commands/export/generate";
import { exportToPostman } from "./native/commands/export/postman";
import { createNewNotebook, FileTypes, saveHttpFileasNotebook, saveNotebookAsHttpFileFromCommand } from "./web/lib/http2book";
import { importRequests } from "./native/commands/import";
import { genCurlCommand, runFileCommand, runHttpCodeLensCommand, runTargetInCell } from './native/commands/run';
import { setUp, updateDothttpIfAvailable } from './downloader';
import {
	DothttpClickDefinitionProvider,
	DothttpNameSymbolProvider,
	UrlExpander
} from './native/services/editorIntellisense';
import { ClientHandler2 } from './web/services/client';
import { ClientHandler } from "./native/services/client";
import { HttpClient } from './web/lib/languageservers/HttpClient';
import { StdoutClient } from './native/services/languageservers/StdoutClient';
import { RunType } from './web/types/types';
import { Configuration } from './web/utils/config';
import { ApplicationBuilder } from './web/services/builder';
import { HeaderCompletionItemProvider, KeywordCompletionItemProvider, UrlCompletionProvider, VariableCompletionProvider } from './native/services/completion';
import { ApplicationServices } from './web/services/global';
import { FileState, VersionInfo } from './web/services/state';
import { LocalStorageService } from './web/services/storage';
import { UrlStorageService } from './web/services/url';
import { TingoHistoryService } from './native/services/tingohelpers';
import DotHttpEditorView from './views/editor';
import { HistoryTreeProvider } from './views/historytree';
import { EnvTree, PropertyTree } from './views/tree';
import { activate as webExtensionActivate, loadNoteBookControllerSafely } from './webextension';
import { Constants } from './web/utils/constants';
import { ProNotebookKernel } from './native/services/notebookkernel';
const path = require('path');

export async function activate(context: vscode.ExtensionContext) {
	if (false) {
		webExtensionActivate(context);
		return
	} else {
		vscode.commands.executeCommand('setContext', Constants.EXTENSION_RUN_MODE, "full");
	}
	const storageService = new LocalStorageService(context.workspaceState);
	const globalStorageService = new LocalStorageService(context.globalState);
	const notebookKernel = new ProNotebookKernel();
	const envTree = new EnvTree();
	const propertyTree = new PropertyTree();
	const symbolProvider = new DothttpNameSymbolProvider();
	const urlStoreService = new UrlStorageService(storageService);
	const historyService = new TingoHistoryService(path.join(context.globalStorageUri.fsPath, 'db'), urlStoreService);
	const clientHandler = new ClientHandler();
	const clientHandler2 = new ClientHandler2();
	const dothttpEditorView = new DotHttpEditorView();
	const historyTreeProvider = new HistoryTreeProvider();
	const fileStateService = new FileState(storageService);
	const diagnostics = vscode.languages.createDiagnosticCollection("dothttp-syntax-errors");
	envTree.setFileStateService(fileStateService);
	propertyTree.setFileStateService(fileStateService);
	historyTreeProvider.setHistoryService(historyService);
	dothttpEditorView.historyService = historyService;
	symbolProvider.setClientHandler(clientHandler);
	symbolProvider.setDiagnostics(diagnostics);
	const appServices = new ApplicationBuilder()
		.setStorageService(storageService)
		.setGlobalstorageService(globalStorageService)
		.setClientHandler(clientHandler)
		.setClientHandler2(clientHandler2)
		.setFileStateService(fileStateService)
		.setEnvTree(envTree)
		.setPropTree(propertyTree)
		.setUrlStore(urlStoreService)
		.setHistoryService(historyService)
		.setDotHttpEditorView(dothttpEditorView)
		.setDiagnostics(diagnostics)
		.setDothttpSymbolProvier(symbolProvider)
		.setVersionInfo(new VersionInfo(globalStorageService))
		.setConfig(Configuration.instance())
		.setContext(context)
		.setNotebookkernel(notebookKernel)
		.setHistoryTreeProvider(historyTreeProvider)
		.build();

	bootStrap(appServices); // lazy loading
	loadNoteBookControllerSafely(context);


	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(async doc => {
			const { fsPath } = doc.uri;
			if (doc.uri.scheme === "file" && (fsPath.endsWith(".dhttp") || fsPath.endsWith(".http"))) {
				const out = await vscode.window.showInformationMessage("checkout httpbook, you can have all features of http file and more", "Open Http File as Notebook", 'ignore');
				if (out && out != "ignore") {
					vscode.commands.executeCommand(Constants.HTTP_AS_HTTPBOOK, doc.uri);
				}
			}
		}));
	context.subscriptions.push(...[
		vscode.commands.registerTextEditorCommand(Constants.RUN_FILE_COMMAND, runFileCommand),
		vscode.commands.registerTextEditorCommand(Constants.GEN_CURL_FILE_COMMAND, genCurlCommand),
		vscode.commands.registerTextEditorCommand(Constants.RUN_TARGET_CODE_LENS, runHttpCodeLensCommand),
		vscode.commands.registerCommand(Constants.openEnvFileCommmand, () => envTree.openEnvFile()),
		vscode.commands.registerCommand(Constants.toggleExperimentalCommand, toggleExperimentalFlag(Constants.toggleExperimentalCommand)),
		vscode.commands.registerCommand(Constants.toggleHistoryCommand, toggleExperimentalFlag(Constants.toggleHistoryCommand)),
		vscode.commands.registerCommand(Constants.toggleNocookieCommand, toggleExperimentalFlag(Constants.toggleNocookieCommand)),
		vscode.commands.registerCommand(Constants.toggleHeadersCommand, toggleExperimentalFlag(Constants.toggleHeadersCommand)),
		vscode.commands.registerCommand(Constants.toggleReuseTabCommand, toggleExperimentalFlag(Constants.toggleReuseTabCommand)),
		vscode.commands.registerCommand(Constants.toggleRunRecentCommand, toggleExperimentalFlag(Constants.toggleRunRecentCommand)),
		vscode.commands.registerCommand(Constants.COMMAND_TOGGLE_UNSTABLE, toggleExperimentalFlag(Constants.COMMAND_TOGGLE_UNSTABLE)),
		vscode.commands.registerCommand(Constants.IMPORT_RESOURCE_COMMAND, importRequests),
		vscode.commands.registerCommand(Constants.EXPORT_RESOURCE_COMMAND, exportToPostman),
		vscode.commands.registerCommand(Constants.GENERATE_PROG_LANG_COMMAND, generateLangForHttpFile),

		vscode.commands.registerCommand(Constants.NOTEBOOK_CELL_GEN_CURL, async (cell) =>
			notebookKernel.generateCurl(cell)
		),
		vscode.commands.registerCommand(Constants.NOTEBOOK_CELL_GEN_PROGRAM, async (cell) =>
			notebookKernel.generateProgrammingLang(cell)
		),
		vscode.commands.registerCommand(Constants.REVEAL_HISTORY_VIEW, () => {
			vscode.commands.executeCommand('dothttpHistory.focus');
		}),
		vscode.commands.registerCommand(Constants.RESTART_CLI_COMMAND, () => {
			clientHandler.restart();
		}),
		vscode.commands.registerCommand(Constants.RUN_NOTEBOOK_TARGET_IN_CELL, runTargetInCell),
		vscode.commands.registerCommand(Constants.HTTPBOOK_SAVE_AS_HTTP, saveNotebookAsHttpFileFromCommand),
		vscode.workspace.registerTextDocumentContentProvider(DotHttpEditorView.scheme, dothttpEditorView),
		vscode.commands.registerCommand(Constants.HTTP_AS_HTTPBOOK, saveHttpFileasNotebook),
		vscode.commands.registerCommand(Constants.NEW_NOTEBOOK_COMMAND, () => createNewNotebook(FileTypes.DotNotebook)),
		vscode.commands.registerCommand(Constants.NEW_HTTP_FILE_COMMAND, () => createNewNotebook(FileTypes.DotHttp)),
	])



	// env view commands
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


	const clickProvider = new DothttpClickDefinitionProvider(clientHandler);
	context.subscriptions.push(...[

		vscode.languages.registerCodeLensProvider(Constants.LANG_CODE, symbolProvider),
		vscode.languages.registerDefinitionProvider(Constants.LANG_CODE, clickProvider),
		vscode.languages.registerHoverProvider(Constants.LANG_CODE, clickProvider),

		vscode.languages.registerCodeActionsProvider(Constants.LANG_CODE, symbolProvider),
		vscode.languages.registerCodeActionsProvider(Constants.LANG_CODE, new UrlExpander()),
		vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: Constants.LANG_CODE as string }, symbolProvider),
		vscode.window.registerTreeDataProvider(Constants.dothttpHistory, historyTreeProvider),


		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new UrlCompletionProvider(clientHandler, urlStoreService), ...UrlCompletionProvider.triggerCharacters),
		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new VariableCompletionProvider(fileStateService), ...VariableCompletionProvider.triggerCharacters),
		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new HeaderCompletionItemProvider(), ...HeaderCompletionItemProvider.triggerCharacters),

		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new KeywordCompletionItemProvider(), ...KeywordCompletionItemProvider.triggerCharacters),

	]);

	workspace.registerTextDocumentContentProvider('embedded-content', {
		provideTextDocumentContent: uri => {
			const originalUri = uri.path.slice(1).slice(0, -3);
			const map = appServices.embeddedContent;
			console.log(`recv url uri ${originalUri}`);
			const content = map.get(originalUri);
			return content;
		}
	});
}


async function bootStrap(app: ApplicationServices) {
	const context = app.getContext()!;
	const launchParams = await setUp(context);
	const clientLaunchArguments = {
		stdargs: launchParams.type == RunType.python ? ['-m', 'dotextensions.server'] : [],
		pythonpath: launchParams.path,
		...launchParams,
	};
	let cli = launchParams.type == RunType.python ? new HttpClient() : new StdoutClient(clientLaunchArguments);

	app.getClientHandler2()?.setCli(cli).start();
	app.getClientHandler()?.setCli(cli).start();

	if (launchParams.version) {
		app.getVersionInfo()?.setVersionDothttpInfo(launchParams.version);
	} else {
		updateDothttpIfAvailable(context.globalStorageUri.fsPath);
	}
}

export function deactivate(_context: vscode.ExtensionContext): undefined {
	const appServices = ApplicationServices.get();
	appServices.getClientHandler()?.close();
	appServices.getClientHandler2()?.close();
	return;
}
