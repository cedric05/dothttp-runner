import * as vscode from 'vscode';
import { IHistoryService } from '../tingohelpers';
export default class DotHttpEditorView implements vscode.TextDocumentContentProvider {
    static scheme: string;
    private _historyService;
    get historyService(): IHistoryService;
    set historyService(value: IHistoryService);
    constructor();
    provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): vscode.ProviderResult<string>;
    static isHttpFile(filename: string): boolean;
    static isHttpBook(filename: string): boolean;
    static runContent(options: {
        content: string;
        curl: boolean;
        target: string;
    }): Promise<any>;
    static runFile(kwargs: {
        filename: string;
        curl: boolean;
        target?: string;
    }): Promise<any>;
    private static attachFileExtension;
    static getEnabledProperties(filename: string): any;
}
