import { encode as encodeQueryString } from 'querystring';
import * as vscode from 'vscode';
import { isPythonConfigured } from '../models/config';
import { DothttpRunOptions } from "../models/dotoptions";
import DotHttpEditorView from '../views/editor';


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
    if (options.properties && options.properties.length > 0) {
        const propList = options.properties.map(a => a.trim()).join(" ");
        if (propList) {
            properties = `--env ${propList}`;
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
    try {
        const out = await DotHttpEditorView.runFile({ filename, curl: options.curl, target: options.target });
        const query = encodeQueryString({ out: JSON.stringify(out) })
        const fileNameWithInfo = contructFileName(filename, options, out);
        showInUntitledView(fileNameWithInfo, out);
        // const uri = vscode.Uri.parse(`${DotHttpEditorView.scheme}:${fileNameWithInfo}?${query}`);
        // vscode.workspace.openTextDocument(uri)
        //     .then(doc => {
        //         vscode.window.showTextDocument(doc, 2)
        //     });
    } catch (error) {
        // ignored
    }

}

function showInUntitledView(scriptFileName: string, out: { error?: boolean, error_message?: string, body?: string }) {
    /**
     * with textdocumentcontentprovider, content is not editable and formattable.
     * currently i'm skepticall among both options, 
     * i will keep showinUntitedView default, and other one as configrable, 
     * after some feedback one of both will be removed
     */
    var setting = vscode.Uri.parse("untitled:" + scriptFileName);
    vscode.workspace.openTextDocument(setting).then((textDoc) => {
        vscode.window.showTextDocument(textDoc, 2 /** new group */, false /**preserveFocus */).then(e => {
            e.edit(edit => {
                const scriptContent = out.error ? out.error_message! : out.body!;
                edit.insert(new vscode.Position(0, 0), scriptContent);
            });
        });
    });
}

function contructFileName(filename: string, options: { curl: boolean; target: string; }, out: any) {
    const now = new Date().getTime();
    var middlepart = 'error';
    if (!out.error_message) {
        middlepart = `${'(target:' + options.target + ')'}${options.curl ? '-curl' : ''}${out.status ? '-(status:' + out.status + ')' : ''}`
    }
    return `${filename}-${middlepart}-${now}.${out.filenameExtension}`;
}
