import { promises as fs } from 'fs';
import * as vscode from 'vscode';
import { NotebookCellKind, Uri } from 'vscode';
import { DotTttpSymbol } from "../lib/types";
import { Constants } from '../models/constants';
import { ApplicationServices } from '../services/global';
import DotHttpEditorView from '../views/editor';
import path = require('path')
import { getUnSaved } from '../utils/fileUtils';


export async function saveNotebookAsHttpFileFromCommand(uri: Uri) {
    if (!uri) {
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
        uri = editor.document.uri;
    }
    const saveData = await getNotebookUriToHttpContent(uri);
    const docu = await vscode.workspace.openTextDocument({ language: Constants.LANG_CODE, content: saveData });
    return await vscode.window.showTextDocument(docu);
}

export async function getNotebookUriToHttpContent(uri: Uri): Promise<string> {
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
    return cellToHttp.join("");
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

export enum FileTypes {
    DotNotebook,
    DotHttp
}

function newFileOptions(filetype: FileTypes) {
    if (filetype == FileTypes.DotNotebook) {
        return {
            folderDialoge: "Select Folder To Create Notebook",
            fileNameDialoge: "Enter Notebook File Name",
            defaultFileName: "api.hnbk",
            errorDialogue: "extension has to be `httpbook` or `hnbk` like api.httpbook",
            acceptedFileExts: [".hnbk", ".httpbook"]
        }
    } else {
        return {
            folderDialoge: "Select Folder To Create HttpFile",
            fileNameDialoge: "Enter Http File Name",
            defaultFileName: "dev.http",
            errorDialogue: "extension has to be `http` or `dothttp` like dev.http",
            acceptedFileExts: [".dhttp", ".http"]
        }
    }
}

export async function createNewNotebook(filetype: FileTypes) {
    const {
        folderDialoge,
        fileNameDialoge,
        defaultFileName,
        errorDialogue,
        acceptedFileExts,
    } = newFileOptions(filetype);

    const directory = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        title: folderDialoge,
        canSelectMany: false,
        openLabel: folderDialoge,
    })
    if (!directory) {
        return;
    }
    const filename = await vscode.window.showInputBox({
        title: fileNameDialoge,
        prompt: fileNameDialoge,
        ignoreFocusOut: true,
        placeHolder: defaultFileName,
        validateInput: (filename) => acceptedFileExts.indexOf(path.extname(filename)) > -1 ? null : errorDialogue,
        value: defaultFileName
    })
    if (!filename) return
    const abosolutePath = path.join(directory[0].fsPath, filename);
    await fs.writeFile(abosolutePath, "");
    await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(abosolutePath));
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
    const httpbookFileName = getUnSaved(path.format({ ...parsedPath, ext: '.httpbook', base: undefined }));
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
    // show notebook
    // use this instead of editor edit and show document
    await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(httpbookFileName));
};

