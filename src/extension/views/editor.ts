import { Utils } from 'vscode-uri'
import * as vscode from 'vscode';
import { DothttpRunOptions } from '../web/types/misc';
import { ApplicationServices } from '../web/services/global';
import { IHistoryService } from "../web/types/history";
import querystring = require('querystring');


export default class DotHttpEditorView implements vscode.TextDocumentContentProvider {
    static scheme = 'dothttp';
    private _historyService!: IHistoryService;
    public get historyService(): IHistoryService {
        return this._historyService;
    }
    public set historyService(value: IHistoryService) {
        this._historyService = value;
    }


    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string> {

        return new Promise(async (resolve, _reject) => {
            const id = JSON.parse(querystring.decode(uri.query)['_id'] as string);
            const output = await this.historyService.getById(id);
            if (output.http) {
                resolve(output.http);
            } else {
                resolve("request ran into error");
            }
        });
    }
    public static isHttpBookUri(uri: vscode.Uri) {
        const fileExtension = Utils.extname(uri);
        return new Set([".httpbook", ".hnbk"]).has(fileExtension);
    }

    public static isHttpUri(uri: vscode.Uri) {
        const fileExtension = Utils.extname(uri);
        return new Set([".dhttp", ".http"]).has(fileExtension);
    }

    static async runContent(options: { content: string; curl: boolean; target: string; }): Promise<any> {
        const app = ApplicationServices.get();
        return await app.getClientHandler()?.executeContentWithExtension({ content: options.content, env: [], curl: options.curl, file: '' });
    }

    public static async runFile(kwargs: { filename: vscode.Uri, curl: boolean, target?: string }) {
        //DotHttpEditorView.isHttpFile(kwargs.filename)
        if (ApplicationServices.get().getClientHandler()?.isRunning()) {
            const app = ApplicationServices.get();
            const clientHandler = app.getClientHandler();
            const filestateService = app.getFileStateService();
            const config = app.getConfig();
            const env = filestateService?.getEnv(kwargs.filename) ?? [];
            const options: DothttpRunOptions = {
                noCookie: config?.noCookies,
                experimental: config?.isExperimental,
                file: kwargs.filename.fsPath,
                curl: kwargs.curl,
                target: kwargs.target ?? '1',
                propertyFile: filestateService?.getEnvFile(),
                properties: DotHttpEditorView.getEnabledProperties(kwargs.filename),
                env: env,
            }
            const out = await clientHandler?.executeFileWithExtension(options);
            if (out && out.script_result && out.script_result.properties)
                ApplicationServices.get().getPropTreeProvider()?.addProperties(kwargs.filename, out.script_result.properties);
            return out;
        } else {
            vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
            throw new Error();
        }
    }

    static getEnabledProperties(filename: vscode.Uri) {
        const fileservice = ApplicationServices.get().getFileStateService();
        const properties: any = {};
        (fileservice?.getProperties(filename) ?? []).filter(prop => prop.enabled).forEach(prop => {
            properties[prop.key] = prop.value;
        })
        return properties;
    }
}