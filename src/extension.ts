import * as vscode from 'vscode';
import { disableCommand, enableCommand } from './commands/enable';
import { runHttpFileWithOptions } from './commands/run';
import DotHttpEditorView from './views/editor';
import { EnvTree } from './views/tree';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerTextEditorCommand('dothttp.command.run', runHttpFileWithOptions);
	const provider = new DotHttpEditorView();
	vscode.workspace.registerTextDocumentContentProvider(DotHttpEditorView.scheme, provider);
	context.subscriptions.push(disposable);

	const envProvider = EnvTree._tree;
	vscode.window.registerTreeDataProvider('dothttpEnvView', envProvider);
	vscode.commands.registerCommand('dothttpEnvView.refresh', () => envProvider.refresh());
	vscode.commands.registerCommand('dothttpEnvView.refreshNode', offset => envProvider.refresh(offset));
	// vscode.commands.registerCommand('dothttpEnvView.renameNode', offset => envProvider.rename(offset));
	vscode.commands.registerCommand('dothttp.file.enableenv', enableCommand);
	vscode.commands.registerCommand('dothttp.file.disableenv', disableCommand);


}

export function deactivate() { }
