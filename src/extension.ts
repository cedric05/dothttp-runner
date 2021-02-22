import * as vscode from 'vscode';
import { CodelensProvider } from './codelensprovider';
import { disableCommand, enableCommand } from './commands/enable';
import { runHttpFileWithOptions } from './commands/run';
import DotHttpEditorView from './views/editor';
import { EnvTree } from './views/tree';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerTextEditorCommand('dothttp.command.run', function (...arr) {
		if (arr) {
			// this is bad, find out better signature
			runHttpFileWithOptions(arr[2]);
		} else {
			runHttpFileWithOptions({ curl: false, target: '1' });
		}
	});
	let disposable2 = vscode.commands.registerTextEditorCommand('dothttp.command.gencurl', function () {
		runHttpFileWithOptions({ curl: true, target: '1' });
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

	vscode.languages.registerCodeLensProvider("dothttp-vscode", new CodelensProvider());



}

export function deactivate() { }
