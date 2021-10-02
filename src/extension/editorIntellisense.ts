import * as vscode from 'vscode';
import { EndOfLine, Range, SymbolInformation, Command } from 'vscode';
import { ClientHandler, DotTttpSymbol } from './lib/client';
import * as json from 'jsonc-parser';
import { Constants } from './models/constants';
import { parseURL } from 'whatwg-url';
import { parse as parseQueryString } from 'querystring';
import { ApplicationServices } from './services/global';
import { DotHovers, DothttpTypes } from './models/misc';


class RunHttpCommand implements Command {
    title: string = "Run http";
    tooltip: string = "Run http targets this definition";
    command = Constants.RUN_TARGET_CODE_LENS;
    arguments: any[];
    curl: boolean = false;
    constructor(target: string, uri: vscode.Uri, cellNo?: number) {
        this.arguments = [{ target: target, "curl": this.curl, uri: uri, cellNo }];
    }
}

class GenerateCurlCommand implements Command {
    title: string = "Generate Curl";
    tooltip: string = "Generate curl targeting this definition";
    command = Constants.RUN_TARGET_CODE_LENS;
    curl = true;
    arguments: { target: string; curl: boolean; uri: vscode.Uri; cellNo: number | undefined; }[];
    constructor(target: string, uri: vscode.Uri, cellNo?: number) {
        this.arguments = [{ target: target, "curl": this.curl, uri: uri, cellNo }];
    }
}

class RunHttpInNotebook extends RunHttpCommand {
    title = "Run Http";
    tooltip = "Select target in cell";
    command = Constants.RUN_NOTEBOOK_TARGET_IN_CELL;
}

class DothttpPositions extends vscode.CodeLens {
    target!: string;
    isCurl!: boolean;
    isNotebook: boolean;
    uri: vscode.Uri;
    cellNo?: number;
    // need to include filename
    // for better handling of execution
    constructor(obj: { range: Range, target: string, isCurl: boolean, isNotebook: boolean, uri: vscode.Uri, cellNo?: number }) {
        super(obj.range);
        this.target = obj.target;
        this.isCurl = obj.isCurl;
        this.isNotebook = obj.isNotebook;
        this.uri = obj.uri;
        this.cellNo = obj.cellNo;
    }
    resolveCommand() {
        const target = this.target;
        const uri = this.uri;
        const cellNo = this.cellNo;
        this.command =
            this.isNotebook ?
                new RunHttpInNotebook(target, uri, cellNo) :
                (this.isCurl ?
                    new GenerateCurlCommand(target, uri, cellNo)
                    :
                    new RunHttpCommand(target, uri, cellNo)
                );
        return this;
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

export class DothttpClickDefinitionProvider implements vscode.DefinitionProvider, vscode.HoverProvider {
    clientHandler: ClientHandler;
    constructor() {
        this.clientHandler = ApplicationServices.get().getClientHandler();
    }
    async provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): Promise<vscode.Hover | null> {
        const result = await this.getTypeResult(document, position);
        const typeAtPos = result.type;
        if (typeAtPos !== DothttpTypes.COMMENT) {
            return new vscode.Hover(DotHovers[typeAtPos]);
        }
        return null;
    }
    async provideDefinition(document: vscode.TextDocument, position: vscode.Position):
        Promise<vscode.Definition | vscode.LocationLink[]> {
        const result = await this.getTypeResult(document, position);
        if (result.type === DothttpTypes.NAME) {
            return new vscode.Location(document.uri, document.positionAt(result.base_start!));
        }
        return [];
    }


    private async getTypeResult(document: vscode.TextDocument, position: vscode.Position) {
        const isNotebook = document.uri.scheme === Constants.notebookscheme;
        const offset = document.offsetAt(position);
        if (isNotebook) {
            return this.clientHandler.getTypeFromContentPosition(offset, document.getText(), "hover")
        } else {
            return this.clientHandler.getTypeFromFilePosition(offset, document.fileName, "hover");
        }

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
            names = await this.clientHandler.getVirtualDocumentSymbols(document.getText());
        } else {
            names = await this.clientHandler.getDocumentSymbols(document.fileName);
        }
        if (names.names) {
            this.diagnostics.clear();
            return this.getCodeLens(names, document, isNotebook);
        } else {
            this.updateDiagnostics(names, document);
        }
        return [];
    }

    private getCodeLens(symbolList: DotTttpSymbol, document: vscode.TextDocument, isNotebook: boolean) {
        const codeLenses: DothttpPositions[] = [];
        symbolList.names?.map(async symbol => {
            const obj = {
                range: new Range(document.positionAt(symbol.start), document.positionAt(symbol.end)),
                target: symbol.name,
                isNotebook: isNotebook,
                uri: document.uri,
            }
            if (isNotebook) {
                const cellNo = parseInt(document.uri.fragment.substring(2));
                codeLenses.push(new DothttpPositions({ ...obj, isCurl: false, cellNo: cellNo }));
            } else {
                codeLenses.push(new DothttpPositions({ ...obj, isCurl: false }));
                codeLenses.push(new DothttpPositions({ ...obj, isCurl: true }));
            }
        });
        return codeLenses;
    }

    public resolveCodeLens(codeLens: DothttpPositions, _token: vscode.CancellationToken) {
        return codeLens.resolveCommand();
    }


    async provideDocumentSymbols(document: vscode.TextDocument, _token: vscode.CancellationToken): Promise<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        const result = await this.clientHandler.getDocumentSymbols(document.fileName, 'symbol');
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