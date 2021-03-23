import * as vscode from 'vscode';
import { Range, SymbolInformation } from 'vscode';
import { ClientHandler } from './lib/client';
import * as json from 'jsonc-parser';


class DothttpPositions extends vscode.CodeLens {
    target!: string;
    curl!: boolean;
    constructor(range: Range, target: string, curl: boolean) {
        super(range);
        this.target = target;
        this.curl = curl;
    }
}


export class DothttpNameSymbolProvider implements vscode.CodeLensProvider<DothttpPositions>, vscode.DocumentSymbolProvider, vscode.CodeActionProvider {


    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;
    private clientHandler!: ClientHandler;
    private diagnostics!: vscode.DiagnosticCollection;
    static readonly regex = /.*:(?<line>\d*):(?<column>\d*):/

    constructor() {
        vscode.window.onDidChangeActiveTextEditor(() => {
            this._onDidChangeCodeLenses.fire()
        });
    }
    async provideCodeActions(document: vscode.TextDocument, range: vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<(vscode.Command | vscode.CodeAction)[]> {
        const text = document.getText(range);
        try {
            if (!(range.start.line === range.end.line && range.start.character === range.end.character)) {
                const formatted = json.format(text, undefined, { eol: document.eol === 1 ? '\n' : '\r\n', insertFinalNewline: true });

                if (formatted) {
                    const action = new vscode.CodeAction("format json", vscode.CodeActionKind.QuickFix);
                    const edits = []
                    const initalOffset = document.offsetAt(range.start);
                    const wedit = new vscode.WorkspaceEdit();
                    formatted.forEach(edit => {
                        wedit.replace(document.uri, new Range(
                            document.positionAt(initalOffset + edit.offset),
                            document.positionAt(initalOffset + edit.offset + edit.length)), edit.content)
                        edits.push(wedit);
                    })
                    action.edit = wedit;
                    return [action];
                }
            }
        } catch (e) {
        }
        return [];
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): DothttpPositions[] | Thenable<DothttpPositions[]> {
        return new Promise(async (resolve) => {
            const codeLenses: DothttpPositions[] = [];
            this.clientHandler.getTargetsInHttpFile(document.fileName).then((names) => {
                if (names.names)
                    names.names.forEach(name => {
                        const runCommand = new DothttpPositions(new Range(
                            document.positionAt(name.start),
                            document.positionAt(name.end)),
                            name.name,
                            false
                        );
                        const curlCommand = new DothttpPositions(runCommand.range,
                            name.name,
                            true);
                        codeLenses.push(runCommand);
                        codeLenses.push(curlCommand);
                        resolve(codeLenses);
                    })
                else {
                    this.updateDiagnostics(names, document);
                    resolve(codeLenses);
                }
            });
        })
    }

    public resolveCodeLens(codeLens: DothttpPositions, token: vscode.CancellationToken) {
        codeLens.command = {
            title: !codeLens.curl ? "Run http" : "generate curl",
            tooltip: !codeLens.curl ? "Run http targets this definition" : "Generate curl targeting this def",
            command: !codeLens.curl ? "dothttp.command.run" : "dothttp.command.gencurl",
            arguments: [{ "target": codeLens.target, "curl": codeLens.curl }]
        };
        return codeLens;
    }


    async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        const result = await this.clientHandler.getTargetsInHttpFile(document.fileName, 'symbol');
        if (!result.error) {
            this.diagnostics.clear();
            return result.names.map(element =>
                new SymbolInformation(element.name, vscode.SymbolKind.Class,
                    new Range(
                        document.positionAt(element.start),
                        document.positionAt(element.end)),
                ));
        }
        else {
            this.updateDiagnostics(result, document);
            return [];
        }
    }



    public updateDiagnostics(result: { error?: boolean | undefined; error_message?: string | undefined; }, document: vscode.TextDocument) {
        const matches = result.error_message!.match(DothttpNameSymbolProvider.regex);
        if (matches?.groups) {
            const line = Number.parseInt(matches.groups.line) - 1;
            const column = Number.parseInt(matches.groups.column) - 1;
            const diagnostics = [new vscode.Diagnostic(new Range(line, column, line, column + 2),
                result.error_message!, vscode.DiagnosticSeverity.Error)];
            this.diagnostics.clear();
            this.diagnostics.set(document.uri, diagnostics);
        }
    }

    public getDiagnostics(): vscode.DiagnosticCollection {
        return this.diagnostics;
    }
    public setDiagnostics(value: vscode.DiagnosticCollection) {
        this.diagnostics = value;
    }
    public getClientHandler(): ClientHandler {
        return this.clientHandler;
    }
    public setClientHandler(value: ClientHandler) {
        this.clientHandler = value;
    }
}