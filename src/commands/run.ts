import * as vscode from 'vscode';
import { TextEditor } from "vscode";
import { DothttpRunOptions } from "../models/dotoptions";
import fs = require("fs");
import DotHttpEditorView from '../views/editor';
import { isPythonConfigured } from '../models/config';
import { FileState } from '../models/state';
import { encode as encodeQueryString } from 'querystring';


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
    if (options.env && options.env.size > 0) {
        const envList = Array.from(options.env).map(a => a.trim()).join(" ");
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




export async function runHttpFileWithOptions(editor: TextEditor, ...args: any[]) {
    const filename = vscode.window.activeTextEditor?.document.fileName ?? '';
    if (!DotHttpEditorView.isHttpFile(filename) && isPythonConfigured()) {
        vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
        return;
    }
    const query = encodeQueryString({
        "mtime": fs.statSync(filename).mtime.getTime(),
        env: Array.from(FileState.getState()?.envs ?? []),
    })

    const uri = vscode.Uri.parse(`dothttp:${filename}?${query}`);
    vscode.workspace.openTextDocument(uri)
        .then(doc => vscode.window.showTextDocument(doc, editor.viewColumn! + 1));
}