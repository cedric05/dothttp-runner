import * as vscode from 'vscode';
import { Range } from 'vscode';
import { ClientHandler } from './lib/client';
declare class DothttpPositions extends vscode.CodeLens {
    target: string;
    curl: boolean;
    constructor(range: Range, target: string, curl: boolean);
}
export declare class DothttpNameSymbolProvider implements vscode.CodeLensProvider<DothttpPositions>, vscode.DocumentSymbolProvider, vscode.CodeActionProvider {
    private _onDidChangeCodeLenses;
    readonly onDidChangeCodeLenses: vscode.Event<void>;
    private clientHandler;
    private diagnostics;
    static readonly regex: RegExp;
    constructor();
    provideCodeActions(document: vscode.TextDocument, range: vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<(vscode.Command | vscode.CodeAction)[]>;
    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): DothttpPositions[] | Thenable<DothttpPositions[]>;
    resolveCodeLens(codeLens: DothttpPositions, token: vscode.CancellationToken): DothttpPositions;
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SymbolInformation[] | vscode.DocumentSymbol[]>;
    updateDiagnostics(result: {
        error?: boolean | undefined;
        error_message?: string | undefined;
    }, document: vscode.TextDocument): void;
    getDiagnostics(): vscode.DiagnosticCollection;
    setDiagnostics(value: vscode.DiagnosticCollection): void;
    getClientHandler(): ClientHandler;
    setClientHandler(value: ClientHandler): void;
}
export {};
