import { existsSync } from 'fs';
import { extname } from 'path';
import * as vscode from 'vscode';
import { GlobalState } from '../global';
import { Configuration, isPythonConfigured } from '../models/config';
import { DothttpRunOptions } from '../models/dotoptions';
import { FileState } from '../models/state';
import querystring = require('querystring');

export default class DotHttpEditorView implements vscode.TextDocumentContentProvider {


    static state: GlobalState = GlobalState.getState();
    static scheme = 'dothttp';
    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string> {
        const filename = uri.path;
        const queryOptions = querystring.decode(uri.query);
        if (DotHttpEditorView.isHttpFile(filename) && isPythonConfigured()) {
            const options: DothttpRunOptions = {
                path: Configuration.getPath(),
                noCookie: Configuration.isCookiesNotEnabled(),
                experimental: Configuration.isExperimental(),
                file: filename,
                curl: (queryOptions.curl ?? 'false') == 'true' ? true : false,
                target: (queryOptions.target as string) ?? '1',
                env: FileState.getState()!.envs ?? [],

            };

            return new Promise(async function (resolve) {
                const output = await DotHttpEditorView.state.clientHanler.execute(options);
                if (!output.error) {
                    resolve(output.body);
                }
                else {
                    resolve(output.error_message)
                }
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