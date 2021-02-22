import { existsSync } from 'fs';
import { extname } from 'path';
import * as vscode from 'vscode';
import { ClientHandler } from '../lib/client';
import { Configuration, isPythonConfigured } from '../models/config';
import { DothttpRunOptions } from '../models/dotoptions';
import { ApplicationServices } from '../services/global';
import { IFileState } from '../services/state';
import querystring = require('querystring');

export default class DotHttpEditorView implements vscode.TextDocumentContentProvider {
    clientHandler: ClientHandler;
    static scheme = 'dothttp';
    filestateService: IFileState;

    constructor() {
        this.clientHandler = ApplicationServices.get().getClientHandler();
        this.filestateService = ApplicationServices.get().getFileStateService();
    }

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
                env: this.filestateService.getEnv(vscode.window.activeTextEditor?.document.fileName!)! ?? [],

            };

            return new Promise(async (resolve) => {
                const output = await this.clientHandler.execute(options);
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