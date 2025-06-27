import * as vscode from 'vscode';
import { EndOfLine, Range, SymbolInformation, Command } from 'vscode';
import { ClientHandler } from "./client";
import { DotTttpSymbol, ResolveResult } from "../../web/types/types";
import * as json from 'jsonc-parser';
import { parseURL } from 'whatwg-url';
import { parse as parseQueryString } from 'querystring';
import { DotHovers, DothttpTypes } from '../../web/types/misc';
import { Constants } from '../../web/utils/constants';
import { Utils } from 'vscode-uri';
import path = require('path');
import { FileState } from '../../web/services/state';

class RunHttpCommand implements Command {
    title: string = "Run http";
    tooltip: string = "Run http targets this definition";
    command = Constants.RUN_TARGET_CODE_LENS as string;
    arguments: any[];
    curl: boolean = false;
    constructor(target: string, uri: vscode.Uri, cellNo?: number) {
        this.arguments = [{ target: target, "curl": this.curl, uri: uri, cellNo }];
    }
}

class GenerateCurlCommand implements Command {
    title: string = "Generate Curl";
    tooltip: string = "Generate curl targeting this definition";
    command = Constants.RUN_TARGET_CODE_LENS as string;
    curl = true;
    arguments: { target: string; curl: boolean; uri: vscode.Uri; cellNo: number | undefined; }[];
    constructor(target: string, uri: vscode.Uri, cellNo?: number) {
        this.arguments = [{ target: target, "curl": this.curl, uri: uri, cellNo }];
    }
}

class RunHttpInNotebook extends RunHttpCommand {
    title = "Run Http";
    tooltip = "Select target in cell";
    command = Constants.RUN_NOTEBOOK_TARGET_IN_CELL as string;
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
            const parsed_path = urlParsed.path.join("/");
            var baseUrl = `${urlParsed.scheme}://${urlParsed.host}${urlParsed.port ? ':' + urlParsed.port : ''}/${parsed_path}`;
            const queryObj = parseQueryString(urlParsed.query);
            const generatedQuery = Object.keys(queryObj).map(key => {
                if (Array.isArray(queryObj[key])) {
                    return (queryObj[key] as string[])
                        .map(value => `? "${key}" = ${value}`)
                        .join("\n");
                } else {
                    // if value contains double quotes, use single quote
                    // this mostly happens when query value is json
                    if (queryObj[key]?.indexOf('"') ?? -1 > -1) {
                        return `? "${key}" = '${queryObj[key]}'`;
                    } else {
                        return `? "${key}" = "${queryObj[key]}"`;
                    }
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

class TypeResultMixin {
    clientHandler: ClientHandler;
    fileStateService: FileState;

    constructor(client: ClientHandler, fileStateService: FileState) {
        this.clientHandler = client;
        this.fileStateService = fileStateService;
    }

    public async getTypeResult(document: vscode.TextDocument, position: vscode.Position) {
        const isNotebook = document.uri.scheme === Constants.notebookscheme;
        const offset = document.offsetAt(position);
        if (isNotebook) {
            return this.clientHandler.getTypeFromContentPosition(offset, document.getText(), "hover")
        } else {
            return this.clientHandler.getTypeFromFilePosition(offset, document.fileName, "hover");
        }
    }

    public async resolveType(document: vscode.TextDocument, position: vscode.Position): Promise<ResolveResult> {
        const isNotebook = document.uri.scheme === Constants.notebookscheme;
        const offset = document.offsetAt(position);
        const env = this.fileStateService.getEnv(document.uri);
        const properties: { [prop: string]: string } = {}
        Object.entries(this.fileStateService.getProperties(document.uri)).forEach(([key, options]) => {
            for (const prop of options) {
                if (prop.enabled) {
                    properties[key] = prop.value;
                }
            }
        });
        const propertyFile = this.fileStateService.getEnvFile()?.fsPath ?? null;
        if (isNotebook) {
            const notebookDoc = vscode.window.activeNotebookEditor;
            if (notebookDoc?.notebook.uri.fsPath !== document.uri.fsPath) {
                throw new Error("notebook uri mismatch");
            }
            const contexts = notebookDoc.notebook.getCells().map(cell => cell.document.getText());
            return this.clientHandler.resolveContentFromContentPosition(offset, document.uri.fsPath, document.getText(), contexts, propertyFile, env, properties, "hover")
        } else {
            return this.clientHandler.resolveContentFromFilePosition(offset, document.fileName, propertyFile, env, properties, "hover");
        }
    }
}

export class TestScriptSuggetions extends TypeResultMixin implements vscode.CodeActionProvider {

    action(suggestionName: string, codeFix: string, uri: vscode.Uri, range: vscode.Range) {
        const is200Action = new vscode.CodeAction(suggestionName, vscode.CodeActionKind.QuickFix);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(uri, range, codeFix);
        is200Action.edit = edit;
        return is200Action;

    }
    async provideCodeActions(document: vscode.TextDocument, range: vscode.Selection, _context: vscode.CodeActionContext, _token: vscode.CancellationToken): Promise<(vscode.Command | vscode.CodeAction)[]> {
        const result = await this.getTypeResult(document, range.start);
        if (result.type !== DothttpTypes.SCRIPT) {
            return []
        }
        return [
            this.action("add status code 200 test", `
def test_has_key_in_json():
    assert client.response.status_code == 200, "Non 200 status code"
`, document.uri, range),
            this.action("add has key in json", `
def test_has_key_in_json():
    json_data = client.response.json()
    assert (json_data.get('key')) == "value", "invalid value"
`, document.uri, range),
            this.action("check response time", `
def test_response_time():
    assert client.response.elapsed.total_seconds() < 0.2, "response time >200 ms"
`, document.uri, range)
        ];

    }
}

export class DothttpClickDefinitionProvider extends TypeResultMixin implements vscode.DefinitionProvider, vscode.HoverProvider {
    async provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): Promise<vscode.Hover | null> {
        // along with document and position, 
        // we need to send all variables, env, proeprties
        const result = await this.resolveType(document, position);
        const typeAtPos = result.type;
        let hoverText = "";
        let resolvedProperty = "";

        if (result.resolved) {
            if (typeof result.resolved === 'object') {
                hoverText = JSON.stringify(result.resolved, null, 2);
            } else if (typeAtPos !== DothttpTypes.NAME) {
                hoverText = result.resolved;
            }
        }

        if (result.property_at_pos) {
            if (result.property_at_pos.value) {
                resolvedProperty = `## Resolved Properties \`${result.property_at_pos.name}\`
\`\`\`jsonc
${JSON.stringify(result.property_at_pos.value, null, 2)}
\`\`\`
\n\n\n\n\n`;
            } else {
                resolvedProperty = `## Property UnResolved \`${result.property_at_pos.name}\`
\`Property may be not resolved in content\`
\n\n\n\n\n`;
            }
        }

        if (hoverText && resolvedProperty) {
            return new vscode.Hover(new vscode.MarkdownString(
                `${resolvedProperty}
## After Replacing Properties
\`\`\`jsonc
${hoverText}
\`\`\`
\n\n\n\n##### Docs \n  ${DotHovers[typeAtPos].value}`
            ));
        } else if (hoverText) {
            return new vscode.Hover(new vscode.MarkdownString(
                `## After Replacing Properties
\`\`\`jsonc
${hoverText}
\`\`\`
\n\n\n\n##### Docs \n  ${DotHovers[typeAtPos].value}`
            ));
        } else if (resolvedProperty) {
            return new vscode.Hover(new vscode.MarkdownString(
                `${resolvedProperty}
\n\n\n\n##### Docs \n  ${DotHovers[typeAtPos].value}`
            ));
        } else {
            return new vscode.Hover(DotHovers[typeAtPos].value);
        }
    }
    async provideDefinition(document: vscode.TextDocument, position: vscode.Position):
        Promise<vscode.Definition | vscode.LocationLink[]> {
        const result = await this.getTypeResult(document, position);
        if (result.type === DothttpTypes.NAME) {
            return new vscode.Location(document.uri, document.positionAt(result.base_start!));
        } else if (result.type === DothttpTypes.IMPORT) {
            let filename = result.filename!;
            if (!filename.endsWith('.http')) {
                filename = filename + '.http';
            }
            let uri;
            if (!path.isAbsolute(filename)) {
                const dirUri = Utils.dirname(document.uri);
                uri = Utils.joinPath(dirUri, filename).with({ scheme: 'file' });
            } else {
                uri = document.uri.with({ path: filename, scheme: 'file' });
            }
            return new vscode.Location(uri, new vscode.Position(0, 0));
        }
        return [];
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
            const offerToConvertToProperty = new vscode.CodeAction("convert to property", vscode.CodeActionKind.RefactorExtract);
            // ask for property name
            offerToConvertToProperty.command = {
                title: "Add property",
                command: Constants.PROPERTY_FROM_TEXT,
                arguments: [document.uri, range, text],
            }

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
                    return [action, offerToConvertToProperty];
                }
            }
            return [offerToConvertToProperty];
        } catch (e) {
        }
        return [];
    }

    public async provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): Promise<DothttpPositions[]> {
        const isNotebook = document.uri.scheme === Constants.notebookscheme;
        // vscode-notebook-cell
        // if scheme is vscode-notebook-cell 
        // then use content to provide code lens

        var namesObj = null;
        if (isNotebook) {
            namesObj = await this.clientHandler.getVirtualDocumentSymbols(document.getText());
        } else {
            namesObj = await this.clientHandler.getDocumentSymbols(document.fileName);
        }
        if (namesObj.names) {
            this.diagnostics.clear();
            return this.getCodeLens(namesObj, document, isNotebook);
        } else {
            this.updateDiagnostics(namesObj, document);
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
                // gives feasibilty to filter just url targets names
                new SymbolInformation("#" + element.name, vscode.SymbolKind.Class,
                    new Range(
                        document.positionAt(element.start),
                        document.positionAt(element.end)),
                )).concat((result.urls ?? []).map(element =>
                    // gives feasibilty to filter just url
                    new SymbolInformation("^" + element.url + " -- " + element.method, vscode.SymbolKind.Field,
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