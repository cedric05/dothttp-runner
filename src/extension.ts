import * as vscode from 'vscode';
import { CodelensProvider } from './codelensprovider';
import { copyProperty, disableCommand, enableCommand } from './commands/enable';
import { runHttpFileWithOptions } from './commands/run';
import { ApplicationServices } from './services/global';
import DotHttpEditorView from './views/editor';

export function activate(context: vscode.ExtensionContext) {
	ApplicationServices.initialize(context);
	let runCommandDisp = vscode.commands.registerTextEditorCommand('dothttp.command.run', function (...arr) {
		if (arr) {
			// this is bad, find out better signature
			runHttpFileWithOptions({ target: arr[2].target, curl: false });
		} else {
			runHttpFileWithOptions({ curl: false, target: '1' });
		}
	});
	let genCurlDisp = vscode.commands.registerTextEditorCommand('dothttp.command.gencurl', function (...arr) {
		if (arr) {
			runHttpFileWithOptions({ target: arr[2].target, curl: true });
		} else {
			runHttpFileWithOptions({ curl: true, target: '1' });
		}
	});

	let openEnvFileDisp = vscode.commands.registerCommand('dothttpEnvView.opendothttpjson', function () {
		const filename = ApplicationServices.get().getEnvProvder().filename;
		vscode.workspace.openTextDocument(filename).then(editor => {
			vscode.window.showTextDocument(editor, 2, false);
		});
	});



	const provider = new DotHttpEditorView();
	vscode.workspace.registerTextDocumentContentProvider(DotHttpEditorView.scheme, provider);
	context.subscriptions.push(runCommandDisp);
	context.subscriptions.push(genCurlDisp);
	context.subscriptions.push(openEnvFileDisp)

	const envProvider = ApplicationServices.get().getEnvProvder();
	vscode.window.registerTreeDataProvider('dothttpEnvView', envProvider);
	vscode.commands.registerCommand('dothttpEnvView.refresh', () => envProvider.refresh());
	vscode.commands.registerCommand('dothttp.file.enableenv', enableCommand);
	vscode.commands.registerCommand('dothttp.file.disableenv', disableCommand);
	vscode.commands.registerCommand('dothttpEnvView.copyPropertyValue', copyProperty);

	vscode.languages.registerCodeLensProvider("dothttp-vscode", new CodelensProvider());

}
export function deactivate() { }
