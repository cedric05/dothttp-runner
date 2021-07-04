/**
 * CompletionProvider copied/inspired from 
 * https://github.com/tanhakabir/rest-book/blob/5b519c618c707d0087a55e99605131583cd81375/src/extension/languageProvider.ts
 * see https://github.com/tanhakabir/rest-book/blob/5b519c618c707d0087a55e99605131583cd81375/LICENSE for license 
 */

import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Position, ProviderResult, SnippetString, TextDocument } from 'vscode';
import { ApplicationServices } from './global';
import * as parser from 'jsonc-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as _ from 'lodash';
import { Method, MIMEType, RequestHeaderField } from '../models/completiontypes';
import { UrlStore } from './UrlStorage';


const readFileProm = util.promisify(fs.readFile);



export class UrlCompletionProvider implements CompletionItemProvider {
    static readonly triggerCharacters = [
        "https://", "http://",
        "GET", "POST", "OPTIONS"
        , "DELETE", "CONNECT", "PUT"
        , "HEAD", "TRACE", "PATCH"
        , "COPY", "LINK", "UNLINK"
        , "PURGE", "LOCK", "UNLOCK"
        , "PROPFIND", "VIEW"
    ]

    private readonly client;
    store: UrlStore;

    constructor() {
        const appContext = ApplicationServices.get();
        this.client = appContext.getClientHandler();
        this.store = appContext.getUrlStore();
    }


    provideCompletionItems(document: TextDocument, _position: Position, _token: CancellationToken, _context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
        return this.getHistoryUrls(document.fileName);
    }

    private async getHistoryUrls(fileName: string): Promise<CompletionItem[]> {
        const historyUrls = this.store.fetchUrls().map(item => ({
            insertText: item.url,
            label: item.url,
            kind: CompletionItemKind.Unit,
            documentation: "recent request",
            detail: `${item.url}`,
            keepWhitespace: true,
        }));
        const targets = await this.client.getDocumentSymbols(fileName);
        if (targets.error) {
            return historyUrls;
        }
        return _.concat(_.uniqBy(targets.urls!
            .map(item => ({
                ...item,
                label: `${item.method ?? "GET"} "${item.url}"`
            })), item => item.label)
            .map(item => ({
                insertText: item.label,
                label: item.label,
                kind: CompletionItemKind.Unit,
                documentation: "url request",
                detail: `${item.url}`,
                keepWhitespace: true,
            })), historyUrls);
    }

}



export class VariableCompletionProvider implements CompletionItemProvider {
    static readonly triggerCharacters = ["{", "{{"]

    private static readonly INFILE_VAR_FINDER = /{{(.*?)(=.*)?}}/gm;


    private readonly fileStateService: import("./state").IFileState;


    static readonly randomSuggesstionsList: ReadonlyArray<string> = ["$randomStr",
        "$randomInt", "$randomBool", "$randomSlug", "$uuid", "$timestamp"]


    static readonly randomSuggestions: ReadonlyArray<CompletionItem> = VariableCompletionProvider.randomSuggesstionsList.map(item => ({
        label: `${item}`,
        insertText: new SnippetString()
            .appendText(`${item}}}`)
        ,
        documentation: "generate random construct",
        kind: CompletionItemKind.Variable,
        keepWhitespace: true
    }))


    constructor() {
        this.fileStateService = ApplicationServices.get().getFileStateService();
    }


    async provideCompletionItems(document: TextDocument, _position: Position, _token: CancellationToken, _context: CompletionContext): Promise<CompletionItem[]> {
        const result = [];
        result.push(...await this.infileCompletions(document));;
        result.push(...await this.getEnvironmentProperties(document.fileName));
        result.push(...VariableCompletionProvider.randomSuggestions);
        return result
    }



    public async infileCompletions(document: TextDocument): Promise<CompletionItem[]> {
        const text = document.getText();
        const infileVars = (VariableCompletionProvider
            .INFILE_VAR_FINDER.exec(text) ?? []).filter((_match, index) => index === 1);
        return _.uniq((infileVars ?? [])
            .map(this.variableCompletionItem("From Infile")));
    }



    private async getEnvironmentProperties(fileName: string): Promise<Array<CompletionItem>> {
        const dothttpJson = path.join(path.dirname(fileName), ".dothttp.json");
        var envProperties: CompletionItem[][] = [];
        if (fs.existsSync(dothttpJson)) {
            const envList = this.fileStateService.getEnv(fileName);
            const data = await readFileProm(dothttpJson);
            const envFile: { [envName: string]: { propName: string } } = parser.parse(data.toString());


            // add default environment properties
            envList.push("*")

            envProperties = _.uniq(envList)
                .filter(env => envFile[env] != null)
                .map(
                    env => _.uniq(Object.keys(envFile[env]))
                        .map(this.variableCompletionItem(`From Environment \`${env}\``)
                        )
                )
        }

        const properties = _.uniq(this.fileStateService
            .getProperties(fileName)
            .filter(prop => prop.enabled)
            .map(prop => prop.key))
            .map(this.variableCompletionItem("From Properties"))
        return _.concat([], ...envProperties, ...properties);
    }

    private variableCompletionItem(detail: string): (item: string) => CompletionItem {
        return (item: string) =>
        ({
            label: `"${item}"`,
            insertText: `{${item}}`,
            commitCharacters: ["{"],
            kind: CompletionItemKind.Variable,
            detail: item + " " + detail,
            keepWhitespace: true,
        } as CompletionItem);
    }
}


export class HeaderCompletionItemProvider implements CompletionItemProvider {
    static readonly triggerCharacters = [':'];

    provideCompletionItems(_document: TextDocument, _position: Position, _token: CancellationToken, _context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
        const result: CompletionItem[] = [];

        for (const field of Object.values(MIMEType)) {
            result.push({
                insertText: `"${field}"`,
                label: field,
                detail: 'HTTP MIME type',
                kind: CompletionItemKind.EnumMember
            });
        }

        return result;
    }
}



export class KeywordCompletionItemProvider implements CompletionItemProvider {
    static readonly triggerCharacters = [];
    static payloadkeywords = [
        "basicauth",
        "data",
        "json",
        "urlencoded",
        "files",
        "form",
        "fileinput",
        "digestauth",
        "cert",
        "p12",
        "certificate",
        "cert",
        "file",
        "password",
        "@insecure",
        "@name(",
        "@clear"

    ];

    provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
        const result: CompletionItem[] = [];

        let autocompleteMethod: Boolean = position.line === 0 ? true : false;

        for (const field of Object.values(Method)) {
            if (document.lineAt(position).text.includes(field)) {
                autocompleteMethod = false;
            }
        }

        if (autocompleteMethod) {
            for (const field of Object.values(Method)) {
                result.push({
                    label: field,
                    insertText: `${field} `,
                    detail: 'HTTP request method',
                    kind: CompletionItemKind.Method
                });
            }
        }

        if (position.line !== 0) {
            for (const field of Object.values(RequestHeaderField)) {
                result.push({
                    label: field,
                    insertText: `"${field}" : `,
                    detail: 'HTTP request header field',
                    kind: CompletionItemKind.Field
                });
            }
            for (const field of KeywordCompletionItemProvider.payloadkeywords) {
                result.push({
                    label: field,
                    insertText: `${field}(`,
                    detail: `${field} Payload for POST/PUT/PATCH methods`,
                    kind: CompletionItemKind.Keyword
                });
            }
        }

        if (position.line == 0) {
            result.push({
                label: "@name",
                insertText: "@name",
                detail: 'name http target',
                kind: CompletionItemKind.Keyword
            });
        }

        return result;
    }
}