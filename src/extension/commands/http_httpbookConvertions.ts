import { promises as fs } from 'fs';
import * as vscode from 'vscode';
import { NotebookCellKind } from 'vscode';
import { DotTttpSymbol } from '../lib/client';
import { Constants } from '../models/constants';
import { ApplicationServices } from '../services/global';
import DotHttpEditorView from '../views/editor';
import path = require('path')


export async function saveNotebookAsHttpFile() {
    const editors = vscode.window.visibleTextEditors.filter(editor => {
        const path = editor.document.uri.fsPath;
        return DotHttpEditorView.isHttpBook(path);
    });
    let editor: vscode.TextEditor | null;
    if (editors.length > 0) {
        editor = editors[0];
    } else {
        return;
    }
    if (editor.document.uri.scheme !== "file") {
        const { uri } = editor.document;
        const notebook = await vscode.workspace.openNotebookDocument(vscode.Uri.file(uri.fsPath));
        const cells = notebook.getCells();
        const client = ApplicationServices.get().getClientHandler();
        const cellToHttp = await Promise.all(cells.map(async (cell) => {
            const text = cell.document.getText();
            switch (cell.kind) {
                case NotebookCellKind.Markup: {
                    return getMarkDownCode(text);
                }
                case NotebookCellKind.Code: {
                    return getHttpCode(await client.getVirtualDocumentSymbols(text, "notebook-save"), text, cell.index);
                };
            }
        }));
        const saveData = cellToHttp.join("");
        const docu = await vscode.workspace.openTextDocument({ language: Constants.LANG_CODE, content: saveData });
        return await vscode.window.showTextDocument(docu);

    }
}
function getMarkDownCode(text: string): string | PromiseLike<string> {
    return `
/*
\`\`\`markdown
${text}
\`\`\`
*/
`;
}
function getHttpCode(symbols: DotTttpSymbol, text: string, index: number): any {
    if (symbols.error) {
        return `/*
# CELL COMMENTED as syntax is incorrect

${text}

*/
`;
    } else {
        return `
#-----------------------
# Cell no: ${index}

${text}

`;
    }
}


export const saveHttpFileasNotebook = async (uri?: vscode.Uri) => {
	uri = uri || vscode.window.activeTextEditor?.document.uri;
	if (!uri) {
		return;
	}

	const document = await vscode.workspace.openTextDocument(uri);
	const text = document.getText();
	const client = ApplicationServices.get().getClientHandler();
	const symbols = await client.getVirtualDocumentSymbols(text, "http to httpbook");

	const parsedPath = path.parse(uri.fsPath);
	const httpbookFileName = path.format({ ...parsedPath, ext: '.httpbook', base: undefined });
	vscode.Uri.file(uri.fsPath + ".httpbook");
	if (symbols && !symbols.error && symbols.names) {
		const { names: targets } = symbols; let prev = 0;
		const cells = targets.map(target => {
			const cellDocument = text.substring(prev, target.end);
			prev = target.end + 1;
			return {
				"kind": vscode.NotebookCellKind.Code,
				"language": Constants.LANG_CODE,
				"value": cellDocument,
				"outputs": []
			};
		});

		await fs.writeFile(httpbookFileName, JSON.stringify(cells));
	}
	return vscode.workspace.openNotebookDocument(vscode.Uri.file(httpbookFileName));
};