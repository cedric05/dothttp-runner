import { existsSync } from 'fs';
import { extname } from 'path';
import * as vscode from 'vscode';
import { commandGenerator } from './commands/run';
import { Configuration, isPythonConfigured } from './models/config';
import { DothttpRunOptions } from './models/dotoptions';
import { streamToString } from './utils/streamUtils';
import child_process = require('child_process');

export default class DotHttpProvider implements vscode.TextDocumentContentProvider {
    static scheme = 'dothttp';
    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string> {
        const filename = uri.path;
        if (DotHttpProvider.isHttpFile(filename)) {
            const options = {
                path: Configuration.getPath(),
                noCookie: Configuration.isCookiesNotEnabled(),
                experimental: Configuration.isExperimental(),
                file: filename,
                curl: Configuration.isCurlEnabled(),
            } as DothttpRunOptions;
            const child = child_process.exec(commandGenerator(options));
            return streamToString(child.stdout!!) as Thenable<string>;
        } else {
            vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
        }
    }

    public static isHttpFile(filename: string) {
        const fileExtension = extname(filename);
        return existsSync(filename)
            && isPythonConfigured()
            && new Set([".dhttp", ".http"]).has(fileExtension);
    }
}