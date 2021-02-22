import * as vscode from 'vscode';
import { TextEditor } from "vscode";
import { DothttpRunOptions } from "../models/dotoptions";
import fs = require("fs");
import DotHttpProvider from '../provider';


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
    const command = `${options.path} -m dothttp ${noCookies} ${experimental} ${env} ${properties} ${propertyFile} ${options.file} ${curl}`.trim();
    console.log(command);
    return command;
}




export async function runHttpFileWithOptions(editor: TextEditor, ...args: any[]) {
    const filename = vscode.window.activeTextEditor?.document.fileName ?? '';
    if (!DotHttpProvider.isHttpFile(filename)) {
        vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
        return;
    }
    const { mtime } = fs.statSync(filename);

    const uri = vscode.Uri.parse(`dothttp:${filename}?mtime=${mtime.getTime()}`);
    vscode.workspace.openTextDocument(uri)
        .then(doc => vscode.window.showTextDocument(doc, editor.viewColumn! + 1));
}