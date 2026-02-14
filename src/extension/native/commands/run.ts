import { zip } from 'lodash';
import * as vscode from 'vscode';
import { TargetSymbolInfo } from "../../web/types/types";
import { Configuration } from '../../web/utils/config';
import { ApplicationServices } from '../../web/services/global';
import { getUnSavedUri } from "../../web/utils/fsUtils";
import DotHttpEditorView from '../../views/editor';
import * as dateFormat from 'dateformat';
import path = require('path');
import { TextEditorEdit, TextEditor } from 'vscode';
import { DothttpExecuteResponse } from '../../../common/response';
import { Utils } from 'vscode-uri';
import { fsExists, isDirectory } from '../../web/utils/fsUtils';
import { Constants } from '../../web/utils/constants';

export async function runTargetInCell(arr: { uri: vscode.Uri, cellNo: number, target: string }) {
    const { cellNo, uri, target } = arr;
    // earlier target is sent as argument
    // but, if notebook is executing its first cell
    // it will run into error
    // to solve this, target is cached between runs
    /*
        const notebook = await vscode.workspace.openNotebookDocument(vscode.Uri.file(arr.uri.fsPath));
        const cell = notebook.cellAt(cellNo);
        await vscode.commands.executeCommand("notebook.execute", arr.uri);
        const kernel = ApplicationServices.get().getNotebookkernel();
        kernel.executeCell(cell, arr.target);
    */
    ApplicationServices.get().getStorageService()?.setValue(`notebooktarget:${uri.fsPath}:${cellNo}`, target)
    await vscode.commands.executeCommand("notebook.cell.execute", [{ start: cellNo, end: cellNo }], uri, target)
}


export async function runHttpCodeLensCommand(...arr: any[]) {
    const { uri, target, curl } = arr[2];
    return runHttpFileWithOptions({ curl: curl, target: target, uri: uri });
}



export async function runFileCommand(editor: TextEditor, _edit: TextEditorEdit, _uri: vscode.Uri) {
    const target = await cacheAndGetTarget(editor, editor.document);
    if (target) {
        return runHttpFileWithOptions({ curl: false, target: target, uri: _uri });
    }
}

export async function genCurlCommand(editor: TextEditor, _edit: TextEditorEdit, _uri: vscode.Uri) {
    const target = await cacheAndGetTarget(editor, editor.document);
    if (target) {
        return runHttpFileWithOptions({ curl: true, target: target, uri: _uri });
    }
}

export async function cacheAndGetTarget(editor: TextEditor, document: vscode.TextDocument) {
    const target = document.uri.scheme != 'file' ? '1' : await getTargetFromQuickPick(editor, document);
    if (target) {
        const storage = ApplicationServices.get().getStorageService();
        const filename = editor.document.fileName ?? '';
        storage?.setValue(`httpruntarget://${filename}`, target);
        return target;
    }
}


async function getTargetFromQuickPick(editor: TextEditor, document: vscode.TextDocument) {
    // decide target from arguments,
    // this request is from code-lens

    // otherwise ask for user input
    const filename = document.fileName;
    if (ApplicationServices.get().getConfig()?.runRecent) {
        const storage = ApplicationServices.get().getStorageService();
        return storage?.getValue(`httpruntarget://${filename}`, '1');
    }
    const names = await ApplicationServices.get().getClientHandler()?.getDocumentSymbols(filename);
    if (names?.error) {
        return '1';
    }
    // const selectionDone = false;
    // @ts-ignore
    const items: vscode.QuickPickItem[] = zip(names.names, names.urls).map(comb => {
        const namer = comb[0]!;
        return {
            label: namer.name,
            detail: comb[1]?.url,
            target: namer,
            /* 
                picking multiple is not supported by dothttp, picking one is not supported by vscode
                so, for now commenting
            */
            // picked: !selectionDone && editor.visibleRanges[0].intersection(range) ? true : false,
        };
    });
    if (items.length === 0) {
        throw new Error("no target available");
    }
    if (items.length === 1) {
        return items[0].label;
    }
    const option = await vscode.window.showQuickPick(items,
        {
            canPickMany: false, ignoreFocusOut: true, onDidSelectItem: function (quickPickItem: { label: string, target: TargetSymbolInfo }) {
                const range = new vscode.Range(
                    document.positionAt(quickPickItem.target.start),
                    document.positionAt(quickPickItem.target.end));
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            }
        });
    if (option?.label) {
        return option.label;
    }
}

export async function runHttpFileWithOptions(options: { curl: boolean, target: string, uri: vscode.Uri }) {
    const filename = options.uri.fsPath;
    const config = ApplicationServices.get().getConfig();
    const document = await vscode.workspace.openTextDocument(options.uri);
    if (document.isDirty) {
        // as file is not saved,
        // execute http def on last saved file, which gives us 
        // unwanted results
        await document.save();
    }

    if (!DotHttpEditorView.isHttpUri(options.uri)) {
        vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
        return;
    }
    const date = new Date();
    var now = dateFormat(date, 'yyyy-MM-dd--HH-mm-ss');
    if (config?.reUseOld) {
        now = '';
    }
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `running ${filename} target: ${options.target} time: ${now}`,
        cancellable: true,
    }, (progress, token) => {
        return new Promise(async (resolve) => {
            var prom;
            if (document.uri.scheme === 'file' || document.uri.scheme === 'dothttpfs') {
                prom = DotHttpEditorView.runFile({ filename: options.uri, curl: options.curl, target: options.target });
            } else if (document.uri.scheme === DotHttpEditorView.scheme) {
                prom = DotHttpEditorView.runContent({ content: document.getText(), curl: options.curl, target: options.target });
            }
            progress.report({ increment: 50, message: 'invoked api' });
            const out = await prom;
            addHistory(out, filename, options);
            if (!token.isCancellationRequested) {
                const fileNameWithInfo = contructFileName(await getBaseFileNameToSave(config!, options.uri), options, out, now);
                showInUntitledView(fileNameWithInfo.filename, fileNameWithInfo.header, out);
                progress.report({ increment: 50, message: 'completed' });
            }
            resolve(true);
        });
    })
}

async function getBaseFileNameToSave(config: Configuration, filename: vscode.Uri) {
    var sfilename;
    if (config.responseSaveDirectory) {
        if (path.isAbsolute(config.responseSaveDirectory)) {
            // save to absolute directory
            sfilename = Utils.joinPath(vscode.Uri.file(config.responseSaveDirectory), Utils.basename(filename));
        } else {
            // relatvie to current file's directory
            const parentDirectory = Utils.dirname(filename);
            sfilename = Utils.joinPath(parentDirectory, config.responseSaveDirectory, Utils.basename(filename));
        }
        const parDirectory = Utils.dirname(sfilename);
        if (await fsExists(parDirectory) && await isDirectory(parDirectory)) {
            return sfilename
        } else {
            vscode.window.showErrorMessage(`${Constants.responseDirectory} is set to incorrect value(non existant directory or is a file)`)
            return filename;
        }
    }
    return filename;
}

export function addHistory(out: any, filename: string, options: { target: string; }) {
    if (ApplicationServices.get().getConfig()?.history) {
        const history = {
            url: out.url as string,
            http: out.http as string,
            filename: filename as string,
            target: options.target as string,
            time: new Date(),
            status_code: out.status as number,
            workspace: vscode.workspace.rootPath,
        };
        ApplicationServices.get().getHistoryService()?.addNew(
            history);
        ApplicationServices.get().getHistoryTreeProvider()?.recentChanged(history);
    }

}

export async function showInUntitledView(scriptFileName: vscode.Uri, headerURI: string, out: DothttpExecuteResponse) {
    /**
     * with textdocumentcontentprovider, content is not editable and formattable.
     * currently i'm skepticall among both options, 
     * i will keep showinUntitedView default, and other one as configrable, 
     * after some feedback one of both will be removed
     */
    var outputBodyURI: vscode.Uri;
    if (await fsExists(scriptFileName)) {
        outputBodyURI = (await getUnSavedUri(scriptFileName)).with({ scheme: 'untitled' });
    } else {
        outputBodyURI = scriptFileName.with({ scheme: 'untitled' })

    }
    // for http response, body will be in out.response.body
    // for curl response, body will be in out.body
    const body = out.error ? "Unknown Error happened" : out.body || out.response.body;
    if (ApplicationServices.get().getConfig()?.reUseOld) {
        const editors = vscode.window.visibleTextEditors.filter(editor => editor.document.uri === outputBodyURI);
        if (editors.length !== 0) {
            const editor = editors[0];
            showEditor(editor.document, out.error ? out.error_message! : body);
            return
        }
    }
    vscode.workspace.openTextDocument(outputBodyURI).then((textDoc) => {
        showEditor(textDoc, out.error ? out.error_message! : body!);
        if (ApplicationServices.get().getConfig()?.showHeaders && !out.error) {
            const outputHeaderURI = vscode.Uri.parse("untitled:" + headerURI);
            vscode.workspace.openTextDocument(outputHeaderURI).then(textDoc => {
                showEditor(textDoc, JSON.stringify(out.response.headers), -2);
            });
        }
    });
}

export function showEditor(textDoc: vscode.TextDocument, scriptContent: string, column = 2) {
    vscode.window.showTextDocument(textDoc, column /** new group */, false /**preserveFocus */).then(e => {
        e.edit(edit => {
            if (ApplicationServices.get().getConfig()?.reUseOld) {
                edit.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(textDoc.lineCount + 1, 0)))
            }
            edit.insert(new vscode.Position(0, 0), scriptContent);
        });
    });
}

export function contructFileName(filename: vscode.Uri, options: { curl: boolean; target: string; }, out: any, now: string) {
    var middlepart = 'error';
    options.target = (options.target ?? '').replace(/[^\w\s]/gi, '')
    if (!out.error_message) {
        middlepart = `${'target-' + options.target}${options.curl ? '-curl' : ''}${out.status ? '__status-' + out.status : ''}__${now}`
    }
    return {
        filename: Utils.joinPath(Utils.dirname(filename), `${Utils.basename(filename)}-${middlepart}.${out.filenameExtension}`),
        header: `${filename}__${middlepart}-headers.json`,
    };
}

