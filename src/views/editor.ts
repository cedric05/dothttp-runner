import { existsSync } from 'fs';
import { extname } from 'path';
import * as vscode from 'vscode';
import { commandGenerator } from '../commands/run';
import { Configuration, isPythonConfigured } from '../models/config';
import { DothttpRunOptions } from '../models/dotoptions';
import { streamToString } from '../utils/streamUtils';
import child_process = require('child_process');
import { FileState } from '../models/state';

export default class DotHttpEditorView implements vscode.TextDocumentContentProvider {
    static scheme = 'dothttp';
    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string> {
        const filename = uri.path;
        if (DotHttpEditorView.isHttpFile(filename) && isPythonConfigured()) {
            const options = {
                path: Configuration.getPath(),
                noCookie: Configuration.isCookiesNotEnabled(),
                experimental: Configuration.isExperimental(),
                file: filename,
                curl: Configuration.isCurlEnabled(),
                env: FileState.getState()?.envs ?? [],

            } as DothttpRunOptions;

            return new Promise(async function (resolve, reject) {
                child_process.exec(commandGenerator(options), function (error, stdout, stderr) {
                    var output = "";
                    if (stdout) {
                        output += stdout + "\n"
                    }
                    if (stderr) {
                        output += stderr + "\n";
                    }
                    resolve(output);
                });
            });
        } else {
            vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
        }
    }

    public static isHttpFile(filename: string) {
        const fileExtension = extname(filename);
        return existsSync(filename)
            && new Set([".dhttp", ".http"]).has(fileExtension);
    }
}