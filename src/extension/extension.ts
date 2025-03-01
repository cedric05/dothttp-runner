import * as vscode from 'vscode';
import { workspace } from 'vscode';
import { copyProperty, disableEnvCommand, enableEnvCommand, toggleExperimentalFlag } from './web/commands/enable';
import { generateLangForHttpFile } from "./native/commands/export/generate";
import { exportToPostman } from "./native/commands/export/postman";
import { createNewNotebook, FileTypes, saveHttpFileasNotebook, saveNotebookAsHttpFileFromCommand } from "./web/lib/http2book";
import { importRequests } from "./native/commands/import";
import { genCurlCommand, runFileCommand, runHttpCodeLensCommand, runTargetInCell } from './native/commands/run';
import { getLaunchArgs, updateDothttpIfAvailable } from './downloader';
import {
	DothttpClickDefinitionProvider,
	DothttpNameSymbolProvider,
	TestScriptSuggetions,
	UrlExpander
} from './native/services/editorIntellisense';
import { ClientHandler2 } from './web/services/client';
import { ClientHandler } from "./native/services/client";
import { HttpClient } from './web/lib/languageservers/HttpClient';
import { StdoutClient } from './native/services/languageservers/StdoutClient';
import { RunType } from './web/types/types';
import { Configuration } from './web/utils/config';
import { ApplicationBuilder } from './web/services/builder';
import { ExtendHttpCompletionProvider, HeaderCompletionItemProvider, KeywordCompletionItemProvider, UrlCompletionProvider, VariableCompletionProvider } from './native/services/completion';
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
import * as fs from 'fs'
import { VscodeOutputChannelWrapper } from './native/services/languageservers/channelWrapper';
import { SimpleFsProvider } from './native/services/fsprovider';
const path = require('path');

export async function activate(context: vscode.ExtensionContext) {
	if (!vscode.workspace.isTrusted) {
		webExtensionActivate(context);
		return
	} else {
		vscode.commands.executeCommand('setContext', Constants.EXTENSION_RUN_MODE, "full");
	}

	await fs.promises.mkdir(context.globalStorageUri.fsPath, { recursive: true });
	const storageService = new LocalStorageService(context.workspaceState);
	const globalStorageService = new LocalStorageService(context.globalState);
	const envTree = new EnvTree();
	const propertyTree = new PropertyTree();
	const symbolProvider = new DothttpNameSymbolProvider();
	const urlStoreService = new UrlStorageService(storageService);
	const historyService = new TingoHistoryService(path.join(context.globalStorageUri.fsPath, 'db'), urlStoreService,
		//historyEmitter
	);
	const clientHandler = new ClientHandler();
	const clientHandler2 = new ClientHandler2();
	const dothttpEditorView = new DotHttpEditorView();
	const historyTreeProvider = new HistoryTreeProvider();
	const fileStateService = new FileState(storageService);
	const notebookKernel = new ProNotebookKernel();
	const diagnostics = vscode.languages.createDiagnosticCollection("dothttp-syntax-errors");
	envTree.setFileStateService(fileStateService);
	propertyTree.setFileStateService(fileStateService);
	historyTreeProvider.setHistoryService(historyService);
	dothttpEditorView.historyService = historyService;
	symbolProvider.setClientHandler(clientHandler);
	symbolProvider.setDiagnostics(diagnostics);
	const configInstance = Configuration.instance();
	const channelWrapper = new VscodeOutputChannelWrapper(configInstance);
	notebookKernel.configure(clientHandler2, fileStateService, propertyTree, configInstance);

	const fileSystemProvider = new SimpleFsProvider(clientHandler);
	context.subscriptions.push(
		vscode.workspace.registerFileSystemProvider('dothttpfs', fileSystemProvider, { isCaseSensitive: true })
	);

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
		.setConfig(configInstance)
		.setContext(context)
		.setNotebookkernel(notebookKernel)
		.setChannelWrapper(channelWrapper)
		.setHistoryTreeProvider(historyTreeProvider)
		.build();

	const lazy_load = bootStrap(appServices); // lazy loading
	loadNoteBookControllerSafely(context);


	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(async doc => {
			const { fsPath } = doc.uri;
			if (doc.uri.scheme === "file" && (fsPath.endsWith(".dhttp") || fsPath.endsWith(".http")) && !configInstance.hideOpenNotebookSuggestion) {
				const out = await vscode.window.showInformationMessage("checkout httpbook, you can have all features of http file and more", "Open Http File as Notebook", 'ignore');
				if (out && out != "ignore") {
					vscode.commands.executeCommand(Constants.HTTP_AS_HTTPBOOK, doc.uri);
				}
			}
		}));

	const createHttpFile = vscode.commands.registerCommand('dothttp.command.createHttpFile', async (uri) => {
		const fileName = await vscode.window.showInputBox({
			prompt: "Enter the name for the HTTP file",
			placeHolder: "example.http",
			value: "new-http-file.http",
			validateInput: (value) => {
				if (!value.endsWith('.http')) {
					return 'File name must end with ".http"';
				}
				return null;
			}
		});

		if (fileName) {
			const filePath = vscode.Uri.joinPath(uri, fileName);
			try {
				await vscode.workspace.fs.writeFile(filePath, new Uint8Array());
				vscode.window.showInformationMessage(`HTTP file "${fileName}" created!`);
			} catch (err) {
				vscode.window.showErrorMessage(`Failed to create file: ${err}`);
			}
		}
	});

	// Command to create an HNBK file
	const createHnbkFile = vscode.commands.registerCommand('dothttp.command.createHnbkFile', async (uri) => {
		const fileName = await vscode.window.showInputBox({
			prompt: "Enter the name for the HNBK file",
			placeHolder: "example.hnbk",
			value: "new-hnbk-file.hnbk",
			validateInput: (value) => {
				if (!value.endsWith('.hnbk')) {
					return 'File name must end with ".hnbk"';
				}
				return null;
			}
		});

		if (fileName) {
			const filePath = vscode.Uri.joinPath(uri, fileName);
			try {
				await vscode.workspace.fs.writeFile(filePath, new Uint8Array());
				vscode.window.showInformationMessage(`HNBK file "${fileName}" created!`);
			} catch (err) {
				vscode.window.showErrorMessage(`Failed to create file: ${err}`);
			}
		}
	});

	context.subscriptions.push(createHttpFile, createHnbkFile);
	context.subscriptions.push(...[
		vscode.commands.registerTextEditorCommand(Constants.RUN_FILE_COMMAND, runFileCommand),
		vscode.commands.registerTextEditorCommand(Constants.GEN_CURL_FILE_COMMAND, genCurlCommand),
		vscode.commands.registerTextEditorCommand(Constants.RUN_TARGET_CODE_LENS, runHttpCodeLensCommand),
		vscode.commands.registerCommand(Constants.openEnvFileCommmand, () => envTree.openEnvFile()),
		vscode.commands.registerCommand(Constants.CONFIGURE_ENV_FILE_COMMAND, () => envTree.configureEnvFile()),
		vscode.commands.registerCommand(Constants.toggleExperimentalCommand, toggleExperimentalFlag(Constants.toggleExperimentalCommand)),
		vscode.commands.registerCommand(Constants.toggleHistoryCommand, toggleExperimentalFlag(Constants.toggleHistoryCommand)),
		vscode.commands.registerCommand(Constants.toggleNocookieCommand, toggleExperimentalFlag(Constants.toggleNocookieCommand)),
		vscode.commands.registerCommand(Constants.toggleHeadersCommand, toggleExperimentalFlag(Constants.toggleHeadersCommand)),
		vscode.commands.registerCommand(Constants.toggleReuseTabCommand, toggleExperimentalFlag(Constants.toggleReuseTabCommand)),
		vscode.commands.registerCommand(Constants.toggleRunRecentCommand, toggleExperimentalFlag(Constants.toggleRunRecentCommand)),
		vscode.commands.registerCommand(Constants.TOGGLE_OPEN_NOTEBOOK_SUGGESTION, toggleExperimentalFlag(Constants.TOGGLE_OPEN_NOTEBOOK_SUGGESTION)),
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
		vscode.commands.registerCommand(Constants.CLEAR_NOTEBOOK_CELLS, async (editor: vscode.SourceControlResourceState) => {
			await vscode.commands.executeCommand("vscode.open", editor.resourceUri);
			vscode.commands.executeCommand("notebook.clearAllCellsOutputs");
		}),
	])



	// env view commands
	context.subscriptions.push(...[
		vscode.window.registerTreeDataProvider(Constants.envTreeView, envTree),
		vscode.commands.registerCommand(Constants.refreshEnvCommand, () => envTree.refresh()),
		vscode.commands.registerCommand(Constants.enableEnvCommand, enableEnvCommand),
		vscode.commands.registerCommand(Constants.disableEnvCommand, disableEnvCommand),
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
		vscode.commands.registerCommand(Constants.TOGGLE_PROPERTY, (node) => { propertyTree.toggleProperty(node) }),
	]);


	const clickProvider = new DothttpClickDefinitionProvider(clientHandler, fileStateService);
	context.subscriptions.push(...[

		vscode.languages.registerCodeLensProvider(Constants.LANG_CODE, symbolProvider),
		vscode.languages.registerDefinitionProvider(Constants.LANG_CODE, clickProvider),
		vscode.languages.registerHoverProvider(Constants.LANG_CODE, clickProvider),

		vscode.languages.registerCodeActionsProvider(Constants.LANG_CODE, symbolProvider),
		vscode.languages.registerCodeActionsProvider(Constants.LANG_CODE, new UrlExpander()),
		vscode.languages.registerCodeActionsProvider(Constants.LANG_CODE, new TestScriptSuggetions(clientHandler, fileStateService)),
		vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: Constants.LANG_CODE as string }, symbolProvider),
		vscode.window.registerTreeDataProvider(Constants.dothttpHistory, historyTreeProvider),
		vscode.commands.registerCommand(Constants.EXPORT_HISTORY, () => {
			historyTreeProvider.exportHistory()
		}),


		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new ExtendHttpCompletionProvider()),
		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new UrlCompletionProvider(clientHandler, urlStoreService), ...UrlCompletionProvider.triggerCharacters),
		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new VariableCompletionProvider(fileStateService), ...VariableCompletionProvider.triggerCharacters),
		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new HeaderCompletionItemProvider(clientHandler), ...HeaderCompletionItemProvider.triggerCharacters),

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

	// open folder in remote

	// new command which connects to remote folder
	vscode.commands.registerCommand(Constants.OPEN_FODLER_IN_REMOTE, async () => {
		await lazy_load;
		const rootUri = vscode.Uri.parse('dothttpfs:/');
		const selectedUri = await selectDirectory(fileSystemProvider, rootUri);
		if (selectedUri) {
			await vscode.commands.executeCommand('vscode.openFolder', selectedUri, { forceReuseWindow: true });
		}
	});

}

async function selectDirectory(fsProvider: SimpleFsProvider, currentUri: vscode.Uri): Promise<vscode.Uri | undefined> {
	const filelist = await fsProvider.readDirectory(currentUri);
	const directories = filelist.filter(([_name, type]) => type === vscode.FileType.Directory).map(([name, _type]) => name);

	const folder = await vscode.window.showQuickPick(directories.concat(['..']), {
		placeHolder: currentUri.path,
		canPickMany: false
	});

	if (folder === '..') {
		const parentUri = vscode.Uri.joinPath(currentUri, '..');
		return selectDirectory(fsProvider, parentUri);
	} else if (folder) {
		const selectedUri = vscode.Uri.joinPath(currentUri, folder);
		return selectDirectory(fsProvider, selectedUri);
	} else {
		return currentUri;
	}
}


async function bootStrap(app: ApplicationServices) {
	const context = app.getContext()!;
	const launchParams = await getLaunchArgs(context);
	const clientLaunchArguments = {
		stdargs: launchParams.type == RunType.python ? ['-m', 'dotextensions.server'] : [],
		pythonpath: launchParams.path,
		...launchParams,
	};
	console.log(`launch args are ${JSON.stringify(clientLaunchArguments)}`)
	let cli = launchParams.type == RunType.http ? new HttpClient(Configuration.agent) : new StdoutClient(clientLaunchArguments);
	cli.start();
	app.getClientHandler2()?.setCli(cli);
	app.getClientHandler()?.setCli(cli);

	if (launchParams.version) {
		app.getVersionInfo()?.setVersionDothttpInfo(launchParams.version);
	} else {
		if (launchParams.type != RunType.binary_from_extension) {
			updateDothttpIfAvailable(context.globalStorageUri.fsPath);
		}
	}
}

export function deactivate(_context: vscode.ExtensionContext): undefined {
	const appServices = ApplicationServices.get();
	appServices.getClientHandler()?.close();
	appServices.getClientHandler2()?.close();
	return;
}
