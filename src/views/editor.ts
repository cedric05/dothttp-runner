import { existsSync } from 'fs';
import { extname } from 'path';
import * as vscode from 'vscode';
import { Configuration, isPythonConfigured } from '../models/config';
import { DothttpRunOptions } from '../models/dotoptions';
import { ApplicationServices } from '../services/global';
import querystring = require('querystring');
var mime = require('mime-types');


export default class DotHttpEditorView implements vscode.TextDocumentContentProvider {
    static scheme = 'dothttp';

    constructor() {
    }

    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string> {
        const output = JSON.parse(querystring.decode(uri.query)['out'] as string);
        return new Promise(async (resolve) => {
            if (!output.error) {
                resolve(output.body);
            }
            else {
                resolve(output.error_message)
            }
        });
    }

    public static isHttpFile(filename: string) {
        const fileExtension = extname(filename);
        return existsSync(filename)
            && new Set([".dhttp", ".http"]).has(fileExtension);
    }

    public static async runFile(kwargs: { filename: string, curl: boolean, target?: string }) {
        if (DotHttpEditorView.isHttpFile(kwargs.filename) && isPythonConfigured()) {
            const clientHandler = ApplicationServices.get().getClientHandler();
            const filestateService = ApplicationServices.get().getFileStateService();
            const options: DothttpRunOptions = {
                path: Configuration.getPath(),
                noCookie: Configuration.isCookiesNotEnabled(),
                experimental: Configuration.isExperimental(),
                file: kwargs.filename,
                curl: kwargs.curl,
                target: kwargs.target ?? '1',
                properties: DotHttpEditorView.getEnabledProperties(kwargs.filename),
                env: filestateService.getEnv(vscode.window.activeTextEditor?.document.fileName!)! ?? [],
            }
            const out = await clientHandler.execute(options);
            out['filenameExtension'] = mime.extension((out['headers'] ?? {})['Content-Type'] ?? 'text/plain')
            return out;
        } else {
            vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
            throw new Error();
        }
    }

    static getEnabledProperties(filename: string) {
        const fileservice = ApplicationServices.get().getFileStateService();
        const properties: any = {};
        (fileservice.getProperties(filename) ?? []).filter(prop => prop.enabled).forEach(prop => {
            properties[prop.key] = prop.value;
        })
        return properties;
    }
}