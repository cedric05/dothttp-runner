import * as vscode from 'vscode';
import { workspace } from 'vscode';
import { copyProperty, disableCommand, enableCommand, toggleExperimentalFlag } from './commands/enable';
import { generateLangForHttpFile } from "./commands/export/generate";
import { exportToPostman } from "./commands/export/postman";
import { createNewNotebook, FileTypes, saveHttpFileasNotebook, saveNotebookAsHttpFileFromCommand } from "./commands/http_httpbookConvertions";
import { importRequests } from "./commands/import";
import { genCurlCommand, runFileCommand, runHttpCodeLensCommand, runTargetInCell } from './commands/run';
import { setUp, updateDothttpIfAvailable } from './downloader';
import {
	DothttpClickDefinitionProvider,
	UrlExpander
} from './editorIntellisense';
import { Constants } from './models/constants';
import { HeaderCompletionItemProvider, KeywordCompletionItemProvider, ScriptCompletionProvider, UrlCompletionProvider, VariableCompletionProvider } from './services/dothttpCompletion';
import { ApplicationServices } from './services/global';
import { NotebookKernel } from './services/notebook';
import DotHttpEditorView from './views/editor';
import { activate as webExtensionActivate, loadNoteBookControllerSafely } from './webextension';
export async function activate(context: vscode.ExtensionContext) {
	if (!vscode.workspace.isTrusted) {
		webExtensionActivate(context);
		return
	} else {
		vscode.commands.executeCommand('setContext', Constants.EXTENSION_RUN_MODE, "full");
	}
	const appServices = ApplicationServices.initialize(context)
	bootStrap(appServices, context); // lazy loading

	loadNoteBookControllerSafely(context);
	try {
		const notebookkernel = new NotebookKernel();
		ApplicationServices.get().setNotebookkernel(notebookkernel);
	} catch {
		// notebook is a recent feature
		// for supporting old version vscode, ignoring
	}


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
		vscode.commands.registerCommand(Constants.openEnvFileCommmand, () => appServices.getEnvProvder().openEnvFile()),
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
			ApplicationServices.get().getNotebookkernel().generateCurl(cell)
		),
		vscode.commands.registerCommand(Constants.NOTEBOOK_CELL_GEN_PROGRAM, async (cell) =>
			ApplicationServices.get().getNotebookkernel().generateProgrammingLang(cell)
		),
		vscode.commands.registerCommand(Constants.REVEAL_HISTORY_VIEW, () => {
			vscode.commands.executeCommand('dothttpHistory.focus');
		}),
		vscode.commands.registerCommand(Constants.RESTART_CLI_COMMAND, () => {
			appServices.getClientHandler().restart();
		}),
		vscode.commands.registerCommand(Constants.RUN_NOTEBOOK_TARGET_IN_CELL, runTargetInCell),
		vscode.commands.registerCommand(Constants.HTTPBOOK_SAVE_AS_HTTP, saveNotebookAsHttpFileFromCommand),
		vscode.workspace.registerTextDocumentContentProvider(DotHttpEditorView.scheme, appServices.getDotHttpEditorView()),
		vscode.commands.registerCommand(Constants.HTTP_AS_HTTPBOOK, saveHttpFileasNotebook),
		vscode.commands.registerCommand(Constants.NEW_NOTEBOOK_COMMAND, () => createNewNotebook(FileTypes.DotNotebook)),
		vscode.commands.registerCommand(Constants.NEW_HTTP_FILE_COMMAND, () => createNewNotebook(FileTypes.DotHttp))
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

		vscode.languages.registerCodeLensProvider(Constants.LANG_CODE, appServices.getDothttpSymbolProvier()),
		vscode.languages.registerDefinitionProvider(Constants.LANG_CODE, clickProvider),
		vscode.languages.registerHoverProvider(Constants.LANG_CODE, clickProvider),

		vscode.languages.registerCodeActionsProvider(Constants.LANG_CODE, appServices.getDothttpSymbolProvier()),
		vscode.languages.registerCodeActionsProvider(Constants.LANG_CODE, new UrlExpander()),
		vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: Constants.LANG_CODE as string }, appServices.getDothttpSymbolProvier()),
		vscode.window.registerTreeDataProvider(Constants.dothttpHistory, appServices.getHistoryTreeProvider()),


		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new UrlCompletionProvider(), ...UrlCompletionProvider.triggerCharacters),
		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new VariableCompletionProvider(), ...VariableCompletionProvider.triggerCharacters),
		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new HeaderCompletionItemProvider(), ...HeaderCompletionItemProvider.triggerCharacters),

		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new KeywordCompletionItemProvider(), ...KeywordCompletionItemProvider.triggerCharacters),
		vscode.languages.registerCompletionItemProvider(Constants.LANG_CODE, new ScriptCompletionProvider())

	]);

	workspace.registerTextDocumentContentProvider('embedded-content', {
		provideTextDocumentContent: uri => {
			const originalUri = uri.path.slice(1).slice(0, -3);
			const map = ApplicationServices.get().embeddedContent;
			console.log(`recv url uri ${originalUri}`);
			const content = map.get(originalUri);
			return content;
		}
	});
}


async function bootStrap(app: ApplicationServices, context: vscode.ExtensionContext) {
	let launchParams = await setUp(context);
	app.clientHanler.setLaunchParams(launchParams).start();
	if (launchParams.version) {
		app.getVersionInfo().setVersionDothttpInfo(launchParams.version);
	} else {
		updateDothttpIfAvailable(context.globalStorageUri.fsPath);
	}
}

export function deactivate(_context: vscode.ExtensionContext): undefined {
	const appServices = ApplicationServices.get();
	appServices.getClientHandler().close();

	return;
}
