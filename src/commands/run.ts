import { zip } from 'lodash';
import { platform } from 'os';
import * as vscode from 'vscode';
import { TargetSymbolInfo } from '../lib/client';
import { ApplicationServices } from '../services/global';
import DotHttpEditorView from '../views/editor';
import dateFormat = require('dateformat');
import path = require('path');
import { Configuration } from '../models/config';
import { existsSync, lstatSync } from 'fs'
import { Constants } from '../models/constants';

enum importoptions {
    postman = 'postman',
    swagger2 = 'swagger2.0',
    swagger3 = 'swagger3.0'
}


export async function importRequests() {
    try {
        // const pickType = await vscode.window.showQuickPick([importoptions.postman, importoptions.swagger2, importoptions.swagger3]) as importoptions;
        const pickType = importoptions.postman;
        if (!pickType) { return }
        const link = await vscode.window.showInputBox({
            prompt: "postman link",
            ignoreFocusOut: true,
            // validateInput: (value) => {
            // if (value.startsWith("https://www.getpostman.com/collections") ||
            //     value.startsWith("https://www.postman.com/collections")) {
            //     return null;
            // } else return "link should start with https://www.getpostman.com/collections/ or https://postman.com/collections";
            // },
            placeHolder: "https://getpostman.com/collections"
        });
        if (!link) { return }
        const importUri = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            title: "select folder to import resource",
            canSelectMany: false,
            openLabel: "select folder to import"

        });
        if (importUri?.length === 0) { return; }
        const folder = importUri![0];
        if (!folder?.fsPath) { return }
        const directory = folder.fsPath!;
        await vscode.workspace.fs.createDirectory(folder);
        if (folder) {
            if (pickType === importoptions.postman) {
                await ApplicationServices.get().clientHanler.importPostman({ directory, link, save: true });

            }
        }

    } catch (err) {
        console.log('could be cancelled');
    }
}


export async function runFileCommand(...arr: any[]) {
    const target = await cacheAndGetTarget(arr);
    if (target) {
        return runHttpFileWithOptions({ curl: false, target: target });
    }
}

export async function genCurlCommand(...arr: any[]) {
    const target = await cacheAndGetTarget(arr);
    if (target) {
        return runHttpFileWithOptions({ curl: true, target: target });
    }
}


async function cacheAndGetTarget(arr: any[]) {
    const target = await getTargetFromQuickPick(arr);
    if (target) {
        const storage = ApplicationServices.get().getStorageService();
        const filename = vscode.window.activeTextEditor?.document.fileName ?? '';
        storage.setValue(`httpruntarget://${filename}`, target);
        return target;
    }
}


async function getTargetFromQuickPick(arr: any[]) {
    // decide target from arguments,
    // this request is from code-lens
    if (arr && arr.length >= 3) {
        var target = arr[2].target;
        if (target) {
            return target;
        }
    }
    // otherwise ask for user input
    const editor = vscode.window.activeTextEditor!;
    const document = editor.document!;
    const filename = document.fileName!;
    if (ApplicationServices.get().getCconfig().runRecent) {
        const storage = ApplicationServices.get().getStorageService();
        return storage.getValue(`httpruntarget://${filename}`, '1');
    }
    const names = await ApplicationServices.get().getClientHandler().getTargetsInHttpFile(filename);
    if (names.error) {
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
    const option = await vscode.window.showQuickPick(items,
        {
            canPickMany: false, ignoreFocusOut: true, onDidSelectItem: function (quickPickItem: { label: string, target: TargetSymbolInfo }) {
                const range = new vscode.Range(
                    document.positionAt(quickPickItem.target.start),
                    document.positionAt(quickPickItem.target.end));
                vscode.window.activeTextEditor?.revealRange(range, vscode.TextEditorRevealType.InCenter);
            }
        });
    if (option?.label) {
        return option.label;
    }
}

export async function runHttpFileWithOptions(options: { curl: boolean, target: string }) {
    const config = ApplicationServices.get().getCconfig();

    const document = vscode.window.activeTextEditor?.document!;
    const filename = document.fileName!;

    if (!DotHttpEditorView.isHttpFile(filename) && document.uri.scheme === 'file') {
        vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
        return;
    }
    const date = new Date();
    var now = dateFormat(date, 'hh:MM:ss');
    if (config.reUseOld) {
        now = '';
    }
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `running ${filename} target: ${options.target} time: ${now}`,
        cancellable: true,
    }, (progress, token) => {
        return new Promise(async (resolve) => {
            var prom;
            if (document.uri.scheme === 'file') {
                prom = DotHttpEditorView.runFile({ filename, curl: options.curl, target: options.target });
            } else if (document.uri.scheme === DotHttpEditorView.scheme) {
                prom = DotHttpEditorView.runContent({ content: document.getText(), curl: options.curl, target: options.target });
            }
            progress.report({ increment: 50, message: 'api called' });
            const out = await prom;
            addHistory(out, filename, options);
            if (!token.isCancellationRequested) {
                const fileNameWithInfo = contructFileName(getBaseFileNameToSave(config, filename), options, out, now);
                showInUntitledView(fileNameWithInfo.filename, fileNameWithInfo.header, out);
                progress.report({ increment: 50, message: 'completed' });
            }
            resolve(true);
        });
    })
}

function getBaseFileNameToSave(config: Configuration, filename: string) {
    var sfilename;
    if (config.responseSaveDirectory) {
        if (path.isAbsolute(config.responseSaveDirectory)) {
            // save to absolute directory
            sfilename = path.join(config.responseSaveDirectory, path.basename(filename));
        } else {
            // relatvie to current file's directory
            const parentDirectory = path.dirname(filename);
            sfilename = path.join(parentDirectory, config.responseSaveDirectory, path.basename(filename));
        }
        const parDirectory = path.dirname(sfilename);
        if (existsSync(parDirectory) && lstatSync(parDirectory).isDirectory()) {
            return sfilename
        } else {
            vscode.window.showErrorMessage(`${Constants.responseDirectory} is set to incorrect value(non existant directory or is a file)`)
            return filename;
        }
    }
    return filename;
}

function addHistory(out: any, filename: string, options: { curl: boolean; target: string; }) {
    const history = {
        url: out.url as string,
        http: out.http as string,
        filename: filename as string,
        target: options.target as string,
        time: new Date(),
        status_code: out.status as number
    };
    ApplicationServices.get().getHistoryService().addNew(
        history);
    ApplicationServices.get().getHistoryTreeProvider().recentChanged(history);
}

function showInUntitledView(scriptFileName: string, headerURI: string, out: { error?: boolean, error_message?: string, body?: string, headers: {} }) {
    /**
     * with textdocumentcontentprovider, content is not editable and formattable.
     * currently i'm skepticall among both options, 
     * i will keep showinUntitedView default, and other one as configrable, 
     * after some feedback one of both will be removed
     */
    const outputBodyURI = vscode.Uri.parse("untitled:" + scriptFileName);
    if (ApplicationServices.get().getCconfig().reUseOld) {
        const editors = vscode.window.visibleTextEditors.filter(editor => editor.document.uri === outputBodyURI);
        if (editors.length !== 0) {
            const editor = editors[0];
            showEditor(editor.document, out.error ? out.error_message! : out.body!);
            return
        }
    }
    vscode.workspace.openTextDocument(outputBodyURI).then((textDoc) => {
        showEditor(textDoc, out.error ? out.error_message! : out.body!);
        if (ApplicationServices.get().getCconfig().showHeaders && !out.error) {
            const outputHeaderURI = vscode.Uri.parse("untitled:" + headerURI);
            vscode.workspace.openTextDocument(outputHeaderURI).then(textDoc => {
                showEditor(textDoc, JSON.stringify(out.headers), -2);
            });
        }
    });
}

function showEditor(textDoc: vscode.TextDocument, scriptContent: string, column = 2) {
    vscode.window.showTextDocument(textDoc, column /** new group */, false /**preserveFocus */).then(e => {
        e.edit(edit => {
            if (ApplicationServices.get().getCconfig().reUseOld) {
                edit.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(textDoc.lineCount + 1, 0)))
            }
            edit.insert(new vscode.Position(0, 0), scriptContent);
        });
    });
}

function contructFileName(filename: string, options: { curl: boolean; target: string; }, out: any, now: string) {
    var middlepart = 'error';
    options.target = (options.target ?? '').replace(/[^\w\s]/gi, '')
    if (!out.error_message) {
        middlepart = `${'(target:' + options.target + ')'}${options.curl ? '-curl' : ''}${out.status ? '-(status:' + out.status + ')' : ''}-${now}`
        if (platform() === 'win32') {
            middlepart = middlepart.replace(/:/g, ' ')
        }
    }
    return {
        filename: `${filename}-${middlepart}.${out.filenameExtension}`,
        header: `${filename}-${middlepart}-headers.json`,
    };
}
