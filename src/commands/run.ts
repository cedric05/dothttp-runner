import * as vscode from 'vscode';
import { Configuration, isPythonConfigured } from '../models/config';
import { Constants } from '../models/constants';
import { DothttpRunOptions } from "../models/dotoptions";
import DotHttpEditorView from '../views/editor';
import dateFormat = require('dateformat');



export function commandGenerator(options: DothttpRunOptions) {
    var noCookies = "";
    var experimental = "";
    var propertyFile = "";
    var env = "";
    var properties = "";
    var curl = "";
    if (options.noCookie) {
        noCookies = "--no-cookie";
    }
    if (options.experimental) {
        experimental = "--experimental";
    }
    if (options.propertyFile) {
        propertyFile = `--property-file ${options.propertyFile}`;
    }
    if (options.env && options.env.length > 0) {
        const envList = options.env.map(a => a.trim()).join(" ");
        if (envList) {
            env = `--env ${envList}`;
        }
    }
    if (options.properties) {
        var properties = Object.entries(options.properties)
            .map(a => ` ${a[0]}=${a[1]} `)
            .reduce((a, b) => `${a} ${b}`)
        if (properties) {
            properties = `--properties ${properties}`;
        }
    }
    if (options.curl) {
        curl = "--curl";
    }
    const command = `${options.path} -m dothttp  ${options.file} ${noCookies} ${experimental} ${env} ${properties} ${propertyFile} ${curl}`.trim();
    console.log(command);
    return command;
}




export async function runHttpFileWithOptions(options: { curl: boolean, target: string }) {
    const filename = vscode.window.activeTextEditor?.document.fileName ?? '';
    if (!DotHttpEditorView.isHttpFile(filename) && isPythonConfigured()) {
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
