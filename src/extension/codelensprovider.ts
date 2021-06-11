import * as vscode from 'vscode';
import { EndOfLine, Range, SymbolInformation } from 'vscode';
import { ClientHandler } from './lib/client';
import * as json from 'jsonc-parser';
import { Constants } from './models/constants';
import { parseURL } from 'whatwg-url';
import { parse as parseQueryString } from 'querystring';

class DothttpPositions extends vscode.CodeLens {
    target!: string;
    curl!: boolean;
    constructor(range: Range, target: string, curl: boolean) {
        super(range);
        this.target = target;
        this.curl = curl;
    }
}


export class UrlExpander implements vscode.CodeActionProvider {
    async provideCodeActions(document: vscode.TextDocument, range: vscode.Selection, _context: vscode.CodeActionContext, _token: vscode.CancellationToken)
        : Promise<(vscode.Command | vscode.CodeAction)[]> {
        const text = document.getText(range);
        const urlParsed = parseURL(text);
        if (!urlParsed) {
            return []
        }
        if (urlParsed.query) {
            const path = urlParsed.path.join("/");
            var baseUrl = `${urlParsed.scheme}://${urlParsed.host}${urlParsed.port ? ':' + urlParsed.port : ''}/${path}`;
            const queryObj = parseQueryString(urlParsed.query);
            const generatedQuery = Object.keys(queryObj).map(key => {
                if (Array.isArray(queryObj[key])) {
                    return (queryObj[key] as string[])
                        .map(value => `? "${key}" = ${value}`)
                        .join("\n");
                } else {
                    return `? "${key}" = "${queryObj[key]}"`;
                }
            }).join("\n");
            const genereatedDef = baseUrl + "\n" + generatedQuery;
            const action = new vscode.CodeAction("expand url", vscode.CodeActionKind.QuickFix);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, range, genereatedDef);
            action.edit = edit;
            return [action]
        }

        return []
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
    async provideCodeActions(document: vscode.TextDocument, range: vscode.Selection, _context: vscode.CodeActionContext, _token: vscode.CancellationToken): Promise<(vscode.Command | vscode.CodeAction)[]> {
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

    public async provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): Promise<DothttpPositions[]> {
        const isNotebook = document.uri.scheme === Constants.notebookscheme;
        // vscode-notebook-cell
        // if scheme is vscode-notebook-cell 
        // then use content to provide code lens

        var names = null;
        if (isNotebook) {
            names = await this.clientHandler.getTargetsInContent(document.getText());
            if (names.error) {
                this.updateDiagnostics(names, document);
            } else {
                this.diagnostics.clear();
            }
            return [];
        } else {
            names = await this.clientHandler.getTargetsInHttpFile(document.fileName);

        }
        const codeLenses: DothttpPositions[] = [];
        if (names.names) {
            this.diagnostics.clear();
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
            })
        } else {
            this.updateDiagnostics(names, document);
        }
        return codeLenses;
    }

    public resolveCodeLens(codeLens: DothttpPositions, _token: vscode.CancellationToken) {
        codeLens.command = {
            title: !codeLens.curl ? "Run http" : "Generate Curl",
            tooltip: !codeLens.curl ? "Run http targets this definition" : "Generate curl targeting this definition",
            command: !codeLens.curl ? "dothttp.command.run" : "dothttp.command.gencurl",
            arguments: [{ "target": codeLens.target, "curl": codeLens.curl }]
        };
        return codeLens;
    }


    async provideDocumentSymbols(document: vscode.TextDocument, _token: vscode.CancellationToken): Promise<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        const result = await this.clientHandler.getTargetsInHttpFile(document.fileName, 'symbol');
        if (!result.error) {
            this.diagnostics.clear();
            if (document.eol == EndOfLine.CRLF) {
                // TODO, find better fix for this 
                vscode.window.visibleTextEditors.filter
                    (editor => editor.document.uri === document.uri)
                    .forEach(editor => {
                        editor.edit(builder => builder.setEndOfLine(vscode.EndOfLine.LF));
                    })
            }
            return (result.names ?? []).map(element =>
                new SymbolInformation(element.name, vscode.SymbolKind.Class,
                    new Range(
                        document.positionAt(element.start),
                        document.positionAt(element.end)),
                )).concat((result.urls ?? []).map(element =>
                    new SymbolInformation(element.method + " " + element.url, vscode.SymbolKind.Field,
                        new Range(
                            document.positionAt(element.start),
                            document.positionAt(element.end)),
                    )));
        }
        else {
            this.updateDiagnostics(result, document);
            return [];
        }
    }



    public updateDiagnostics(result: { error?: boolean | undefined; error_message?: string | undefined; }, document: vscode.TextDocument) {
        const matches = result.error_message!.match(DothttpNameSymbolProvider.regex);
        this.diagnostics.clear();
        if (matches?.groups) {
            const line = Number.parseInt(matches.groups.line) - 1;
            const column = Number.parseInt(matches.groups.column) - 1;
            const diagnostics = [new vscode.Diagnostic(new Range(line, column, line, column + 2),
                result.error_message!, vscode.DiagnosticSeverity.Error)];
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