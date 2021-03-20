import { platform } from 'os';
import * as vscode from 'vscode';
import { Configuration } from '../models/config';
import { ApplicationServices } from '../services/global';
import DotHttpEditorView from '../views/editor';
import dateFormat = require('dateformat');
import { nameresult as targetAndRange } from '../lib/client';

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
        const folder = await vscode.window.showSaveDialog({

        });
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
        runHttpFileWithOptions({ curl: false, target: target });
    }
}

export async function genCurlCommand(...arr: any[]) {
    const target = await cacheAndGetTarget(arr);
    if (target) {
        runHttpFileWithOptions({ curl: true, target: target });
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
    const filename = vscode.window.activeTextEditor?.document.fileName!;
    if (Configuration.isRecentEnabled()) {
        const storage = ApplicationServices.get().getStorageService();
        return storage.getValue(`httpruntarget://${filename}`, '1');
    }
    const names = await ApplicationServices.get().getClientHandler().getNames(filename);
    if (names.error) {
        return '1';
    }
    const option = await vscode.window.showQuickPick(names.names.map(namer => ({ label: namer.name, target: namer })),
        {
            canPickMany: false, ignoreFocusOut: true, onDidSelectItem: function (quickPickItem: { label: string, target: targetAndRange }) {
                const document = vscode.window.activeTextEditor?.document!;
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
    const filename = vscode.window.activeTextEditor?.document.fileName ?? '';
    if (!DotHttpEditorView.isHttpFile(filename)) {
        vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
        return;
    }
    const date = new Date();
    const now = dateFormat(date, 'hh:MM:ss');
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `running ${filename} target: ${options.target} time: ${now}`,
        cancellable: true,
    }, (progress, token) => {
        return new Promise(async (resolve) => {
            const prom = DotHttpEditorView.runFile({ filename, curl: options.curl, target: options.target });
            progress.report({ increment: 50, message: 'api called' });
            const out = await prom;
            addHistory(out, filename, options);
            if (!token.isCancellationRequested) {
                const fileNameWithInfo = contructFileName(filename, options, out, now);
                showInUntitledView(fileNameWithInfo.filename, fileNameWithInfo.header, out);
                progress.report({ increment: 50, message: 'completed' });
            }
            resolve(true);
        });
    })
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
    vscode.workspace.openTextDocument(outputBodyURI).then((textDoc) => {
        vscode.window.showTextDocument(textDoc, 2 /** new group */, false /**preserveFocus */).then(e => {
            e.edit(edit => {
                const scriptContent = out.error ? out.error_message! : out.body!;
                edit.insert(new vscode.Position(0, 0), scriptContent);
            });
        });
        if (Configuration.isHistoryEnabled() && !out.error) {
            const outputHeaderURI = vscode.Uri.parse("untitled:" + headerURI);
            vscode.workspace.openTextDocument(outputHeaderURI).then(textDoc => {
                vscode.window.showTextDocument(textDoc, -2 /** new group */, true /**preserveFocus */).then(e => {
                    e.edit(edit => {
                        const scriptContent = JSON.stringify(out.headers);
                        edit.insert(new vscode.Position(0, 0), scriptContent);
                    });
                });
            });
        }
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
