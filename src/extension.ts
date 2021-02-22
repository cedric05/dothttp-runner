import * as vscode from 'vscode';
import { runHttpFileWithOptions } from './commands/run';
import DotHttpProvider from './provider';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerTextEditorCommand('dothttp.command.run', runHttpFileWithOptions);
	const provider = new DotHttpProvider();
	vscode.workspace.registerTextDocumentContentProvider(DotHttpProvider.scheme, provider);
	context.subscriptions.push(disposable);
}

export function deactivate() { }
