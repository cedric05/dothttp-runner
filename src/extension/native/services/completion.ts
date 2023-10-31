/**
 * CompletionProvider copied/inspired from 
 * https://github.com/tanhakabir/rest-book/blob/5b519c618c707d0087a55e99605131583cd81375/src/extension/languageProvider.ts
 * see https://github.com/tanhakabir/rest-book/blob/5b519c618c707d0087a55e99605131583cd81375/LICENSE for license 
 */

import { CancellationToken, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, Position, ProviderResult, SnippetString, TextDocument } from 'vscode';
import * as parser from 'jsonc-parser';
import * as _ from 'lodash';
import { Method, MIMEType, RequestHeaderField } from '../../web/types/completiontypes';
import { UrlStore } from "../../web/types/url";
import { IFileState } from '../../web/types/properties';
import { Utils } from 'vscode-uri';
import { fsExists, read } from '../../web/utils/fsUtils';
import { ClientHandler } from './client';
import { ApplicationServices } from '../../web/services/global';

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
    store?: UrlStore;

    constructor(client: ClientHandler, store: UrlStore) {
        this.client = client;
        this.store = store;
    }


    provideCompletionItems(document: TextDocument, _position: Position, _token: CancellationToken, _context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
        return this.getHistoryUrls(document.fileName);
    }

    private async getHistoryUrls(fileName: string): Promise<CompletionItem[]> {
        const historyUrls = this.store?.fetchUrls().map(item => ({
            insertText: item.url,
            label: item.url,
            kind: CompletionItemKind.Unit,
            documentation: "recent request",
            detail: item.url,
            keepWhitespace: true,
        }));
        const targets = await this.client?.getDocumentSymbols(fileName);
        if (targets?.error) {
            return historyUrls ?? [];
        }

        // @ts-expect-error
        return _.concat(_.uniqBy(
            targets?.urls!.map(item => ({
                ...item,
                label: `${item.method ?? "GET"} "${item.url}"`
            })), item => item.label)
            .map(item => ({
                insertText: item.label,
                label: item.label,
                kind: CompletionItemKind.Unit,
                documentation: "url request",
                detail: item.url,
                keepWhitespace: true,
            })), historyUrls);
    }

}

export class ExtendHttpCompletionProvider implements CompletionItemProvider {
    async provideCompletionItems(document: TextDocument, _position: Position, _token: CancellationToken, _context: CompletionContext): Promise<CompletionItem[]> {
        const result = [];
        const client = ApplicationServices.get().getClientHandler();
        const symbols = await client?.getVirtualDocumentSymbols(document.getText(), "notebook", document.fileName);
        result.push(...(symbols?.names?.map(i => ({
            label: `extend ${i.name}`,
            insertText: `"${i.name}"`,
            kind: CompletionItemKind.Reference,
            detail: `extend ${i.name}`,
            keepWhitespace: true,
        })) ?? []));
        result.push(...(symbols?.imports?.names?.map(i => ({
            label: `extend http '${i.name}'`,
            insertText: `: "${i.name}"`,
            kind: CompletionItemKind.Reference,
            detail: `extend http '${i.name}'`,
            keepWhitespace: true,
        })) ?? []));
        return result;
    }
}


export class VariableCompletionProvider implements CompletionItemProvider {
    static readonly triggerCharacters = ["{", "{{"]

    private static readonly INFILE_VAR_FINDER = /{{(.*?)(=.*)?}}/gm;


    private readonly fileStateService?: IFileState;


    static readonly randomSuggesstionsList: ReadonlyArray<string> = ["$randomStr",
        "$randomFloat", "$guid", "$randomLoremSlug",
        "$randomInt", "$randomBool", "$randomSlug", "$uuid", "$timestamp"]


    static readonly randomSuggestions: ReadonlyArray<CompletionItem> = VariableCompletionProvider.randomSuggesstionsList.map(item => ({
        label: item,
        insertText: new SnippetString()
            .appendText(`${item}}}`)
        ,
        documentation: "generate random construct",
        kind: CompletionItemKind.Variable,
        keepWhitespace: true
    }))


    constructor(filestate: IFileState) {
        this.fileStateService = filestate;
    }


    async provideCompletionItems(document: TextDocument, _position: Position, _token: CancellationToken, _context: CompletionContext): Promise<CompletionItem[]> {
        const result = [];
        result.push(...await this.infileCompletions(document));;
        result.push(...await this.getEnvironmentProperties(document));
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



    private async getEnvironmentProperties(document: TextDocument): Promise<Array<CompletionItem>> {
        const dothttpJsonUri = Utils.joinPath(document.uri, ".dothttp.json");
        var envProperties: CompletionItem[][] = [];
        if (await fsExists(dothttpJsonUri)) {
            const envList = this.fileStateService?.getEnv(document.uri) ?? [];
            const data = await read(dothttpJsonUri);
            const envFile: { [envName: string]: { propName: string } } = parser.parse(data);


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

        const properties = _.uniq(
            this.fileStateService?.getProperties(document.uri)
                .filter(prop => prop.enabled)
                .map(prop => prop.key))
            .map(this.variableCompletionItem("From Properties"))
        return _.concat([], ...envProperties, ...properties);
    }

    private variableCompletionItem(detail: string): (item: string) => CompletionItem {
        return (item: string) =>
        ({
            label: item,
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
        "file",
        "multipart",
        "text",
        "form",
        "awsauth",
        "fileinput",
        "digestauth",
        "ntlmauth",
        "key",
        "p12",
        "certificate",
        "cert",
        "password",
        "@insecure",
        "@name(",
        "@clear",
        "header",
        "query",
        "output"
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