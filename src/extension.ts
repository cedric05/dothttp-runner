import * as vscode from 'vscode';
import { disableCommand, enableCommand } from './commands/enable';
import { runHttpFileWithOptions } from './commands/run';
import DotHttpEditorView from './views/editor';
import { EnvTree } from './views/tree';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerTextEditorCommand('dothttp.command.run', () => {
		runHttpFileWithOptions({ curl: false });
	});
	let disposable2 = vscode.commands.registerTextEditorCommand('dothttp.command.gencurl', () => {
		runHttpFileWithOptions({ curl: true });
	});
	const provider = new DotHttpEditorView();
	vscode.workspace.registerTextDocumentContentProvider(DotHttpEditorView.scheme, provider);
	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);

	const envProvider = EnvTree._tree;
	vscode.window.registerTreeDataProvider('dothttpEnvView', envProvider);
	vscode.commands.registerCommand('dothttpEnvView.refresh', () => envProvider.refresh());
	vscode.commands.registerCommand('dothttp.file.enableenv', enableCommand);
	vscode.commands.registerCommand('dothttp.file.disableenv', disableCommand);


}

export function deactivate() { }
