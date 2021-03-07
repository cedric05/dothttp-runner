import * as vscode from 'vscode';
import { Configuration, isPythonConfigured } from '../models/config';
import { ApplicationServices } from '../services/global';
import DotHttpEditorView from '../views/editor';
import dateFormat = require('dateformat');

enum importoptions {
    postman = 'postman',
    swagger2 = 'swagger2.0',
    swagger3 = 'swagger3.0'
}


export async function importRequests() {
    try {
        const pickType = await vscode.window.showQuickPick([importoptions.postman, importoptions.swagger2, importoptions.swagger3]) as importoptions;
        if (!pickType) { return }
        const link = await vscode.window.showInputBox({
            prompt: "postman link",
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (value.startsWith("https://www.getpostman.com/collections") ||
                    value.startsWith("https://www.postman.com/collections")) {
                    return null;
                } else return "link should start with https://www.getpostman.com/collections/ or https://postman.com/collections";
            },
            placeHolder: "https://getpostman.com/collections"
        });
        if (!link) { return }
        const folder = await vscode.window.showWorkspaceFolderPick({
            ignoreFocusOut: true,
            placeHolder: vscode.workspace.workspaceFolders![0].name
        });
        if (folder) {
            if (pickType === importoptions.postman) {
                ApplicationServices.get().clientHanler.importPostman({ directory: folder.name, link: link! })
            }
        }

    } catch (err) {
        console.log('could be cancelled');
    }
}



export async function runHttpFileWithOptions(options: { curl: boolean, target: string }) {
    const filename = vscode.window.activeTextEditor?.document.fileName ?? '';
    if (!DotHttpEditorView.isHttpFile(filename)) {
        vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
        return;
    }
    const date = new Date();
    const now = dateFormat(date, 'h:MM:ss');
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `running ${filename} target: ${options.target} time: ${now}`,
        cancellable: true,
    }, (progress, token) => {
        return new Promise(async (resolve) => {
            const prom = DotHttpEditorView.runFile({ filename, curl: options.curl, target: options.target });
            progress.report({ increment: 50, message: 'api called' });
            const out = await prom;
            if (!token.isCancellationRequested) {
                const fileNameWithInfo = contructFileName(filename, options, out, now);
                showInUntitledView(fileNameWithInfo.filename, fileNameWithInfo.header, out);
                progress.report({ increment: 50, message: 'completed' });
            }
            resolve(true);
        });
    })
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
    if (!out.error_message) {
        middlepart = `${'(target:' + options.target + ')'}${options.curl ? '-curl' : ''}${out.status ? '-(status:' + out.status + ')' : ''}`
    }
    return {
        filename: `${filename}-${middlepart}-${now}.${out.filenameExtension}`,
        header: `${filename}-${middlepart}-headers-${now}.json`,
    };
}
