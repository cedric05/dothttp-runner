import * as vscode from 'vscode';
import { DotTttpSymbol } from '../lib/client';
import { Constants } from '../models/constants';
import { ApplicationServices } from '../services/global';
import DotHttpEditorView from '../views/editor';
import { NotebookCellKind } from 'vscode';




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
        const docu = await vscode.workspace.openTextDocument({ language: Constants.langCode, content: saveData });
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
