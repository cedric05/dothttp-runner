import { existsSync } from 'fs';
import { extname } from 'path';
import * as vscode from 'vscode';
import { Configuration, isDotHttpCorrect, isPythonConfigured } from '../models/config';
import { DothttpRunOptions } from '../models/dotoptions';
import { ApplicationServices } from '../services/global';
import { IHistoryService } from '../tingohelpers';
import querystring = require('querystring');
var mime = require('mime-types');


export default class DotHttpEditorView implements vscode.TextDocumentContentProvider {
    static scheme = 'dothttp';
    private _historyService!: IHistoryService;
    public get historyService(): IHistoryService {
        return this._historyService;
    }
    public set historyService(value: IHistoryService) {
        this._historyService = value;
    }

    constructor() {
    }

    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string> {

        return new Promise(async (resolve, reject) => {
            const id = JSON.parse(querystring.decode(uri.query)['_id'] as string);
            const output = await this.historyService.getById(id);
            if (output.http) {
                resolve(output.http);
            } else {
                reject();
            }
        });
    }

    public static isHttpFile(filename: string) {
        const fileExtension = extname(filename);
        return existsSync(filename)
            && new Set([".dhttp", ".http"]).has(fileExtension);
    }
    static runContent(options: { content: string; curl: boolean; target: string; }): any {
        const app = ApplicationServices.get();
        return app.getClientHandler().executeContent({ content: options.content, env: [], curl: options.curl, file: '' })
    }

    public static async runFile(kwargs: { filename: string, curl: boolean, target?: string }) {
        if (DotHttpEditorView.isHttpFile(kwargs.filename) && (isPythonConfigured() || isDotHttpCorrect())) {
            const app = ApplicationServices.get();
            const clientHandler = app.getClientHandler();
            const filestateService = app.getFileStateService();
            const config = app.getCconfig();
            const options: DothttpRunOptions = {
                noCookie: config.noCookies,
                experimental: config.isExperimental,
                file: kwargs.filename,
                curl: kwargs.curl,
                target: kwargs.target ?? '1',
                properties: DotHttpEditorView.getEnabledProperties(kwargs.filename),
                env: filestateService.getEnv(vscode.window.activeTextEditor?.document.fileName!)! ?? [],
            }
            const out = await clientHandler.executeFile(options);
            out['filenameExtension'] = 'txt';
            const headers = out['headers'] ?? {};
            Object.keys(headers).filter(key => key.toLowerCase() === 'content-type').forEach(key => {
                out['filenameExtension'] = mime.extension(headers[key])
            })
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