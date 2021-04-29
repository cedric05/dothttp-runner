import { CancellationToken, CompletionItem, CompletionItemKind, CompletionItemProvider, Position, SnippetString, TextDocument } from 'vscode';
import { ApplicationServices } from './global';
import * as parser from 'jsonc-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as _ from 'lodash';


const readFileProm = util.promisify(fs.readFile);



export class HttpCompletionItemProvider implements CompletionItemProvider {
    private readonly historyService: import("../tingohelpers").IHistoryService;
    private readonly fileStateService: import("./state").IFileState;

    private readonly client;

    constructor() {
        this.historyService = ApplicationServices.get().getHistoryService();
        this.fileStateService = ApplicationServices.get().getFileStateService();
        this.client = ApplicationServices.get().getClientHandler();
    }

    static readonly methods: ReadonlyArray<string> = ["GET", "POST", "OPTIONS"
        , "DELETE", "CONNECT", "PUT"
        , "HEAD", "TRACE", "PATCH"
        , "COPY", "LINK", "UNLINK"
        , "PURGE", "LOCK", "UNLOCK"
        , "PROPFIND", "VIEW"
    ]

    static readonly randomSuggesstionsList: ReadonlyArray<string> = ["$randomStr", "$randomInt", "$randomBool"]


    static readonly randomSuggestions: ReadonlyArray<CompletionItem> = HttpCompletionItemProvider.randomSuggesstionsList.map(item => ({
        label: `${item}`,
        insertText: new SnippetString()
            .appendText(`{{${item}}}\t`)
        ,
        kind: CompletionItemKind.Variable,
        keepWhitespace: true
    }))

    static readonly methodList: Array<CompletionItem> = HttpCompletionItemProvider.methods.map(item => (
        {
            label: `${item} for request`,
            insertText: new SnippetString()
                .appendText(`${item}\t`)
                .appendPlaceholder("''", 1)
            ,

            kind: CompletionItemKind.Constant,
            documentation: "Method of http request",
            detail: `${item} https://req.dothttp.dev or ${item} https://req.dothttp.dev`,
            keepWhitespace: true,
        }));


    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[] | undefined> {

        const fileName = document.fileName;

        // figure out if it is at url space, then query list of urls

        const result = [];
        result.push(...await this.getHistoryUrls(fileName))

        result.push(...HttpCompletionItemProvider.randomSuggestions);
        // TODO
        try {
            result.push(...await this.getEnvironmentProperties(fileName));
        } catch (error) {
            console.error("unknown error", error);
        }
        // TODO don't include for inbetween request (like before payload, in the payload or inbetween history)
        result.push(...HttpCompletionItemProvider.methodList);
        return result;
    }



    private async getEnvironmentProperties(fileName: string): Promise<Array<CompletionItem>> {
        const dothttpJson = path.join(path.dirname(fileName), ".dothttp.json");
        if (!fs.existsSync(dothttpJson)) {
            return [];
        }
        const envList = this.fileStateService.getEnv(fileName);
        const data = await readFileProm(dothttpJson);
        const envFile: { [envName: string]: { propName: string } } = parser.parse(data.toString());


        // add default environment properties
        envList.push("*")

        const envProperties = envList
            .filter(env => envFile[env] != null)
            .map(
                env => _.uniq(Object.keys(envFile[env]))
                    .map(this.variableCompletionItem
                    )
            )
        const properties = _.uniq(this.fileStateService
            .getProperties(fileName)
            .filter(prop => prop.enabled)
            .map(prop => prop.key))
            .map(this.variableCompletionItem)
        return _.concat([], ...envProperties, ...properties);
    }

    private variableCompletionItem(item: string): CompletionItem {
        return ({
            label: `"${item}"`,
            insertText: `{{${item}}}`,
            kind: CompletionItemKind.Variable,
            detail: `{{${item}}}`,
            keepWhitespace: true,
        } as CompletionItem);
    }

    private async getHistoryUrls(fileName: string): Promise<CompletionItem[]> {
        const targets = await this.client.getTargetsInHttpFile(fileName);
        return targets.urls!
            .map(item => ({
                insertText: `${item.method} "${item.url}"`,
                label: `"${item.url}"`,
                kind: CompletionItemKind.Variable,
                documentation: "url request",
                detail: `${item.url}`,
                keepWhitespace: true,
            }));
    }
}