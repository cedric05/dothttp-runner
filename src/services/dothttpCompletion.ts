import { CancellationToken, CompletionItem, CompletionItemProvider, Position, TextDocument } from 'vscode';
import { ApplicationServices } from './global';

export class HttpCompletionItemProvider implements CompletionItemProvider {
    historyService: import("d:/dothttp/dothttp-runner/src/tingohelpers").IHistoryService;
    constructor() {
        this.historyService = ApplicationServices.get().getHistoryService();
    }
    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[] | undefined> {

        const fileName = document.fileName;
        const history = await this.historyService.fetchByFileName(fileName);


        const methods = [{
            label: "GET",
            insertText: "GET"
        },
        {
            label: "POST",
            insertText: "POST"
        },
        {
            label: "PUT",
            insertText: "PUT"
        }];
        // methods.push(...history.map(item => ({
        //     insertText: item.url,
        //     label: item.url
        // })))
        return methods;
    }
}