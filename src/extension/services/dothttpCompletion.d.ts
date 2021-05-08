/**
 * CompletionProvider copied/inspired from
 * https://github.com/tanhakabir/rest-book/blob/5b519c618c707d0087a55e99605131583cd81375/src/extension/languageProvider.ts
 * see https://github.com/tanhakabir/rest-book/blob/5b519c618c707d0087a55e99605131583cd81375/LICENSE for license
 */
import { CancellationToken, CompletionContext, CompletionItem, CompletionItemProvider, CompletionList, Position, ProviderResult, TextDocument } from 'vscode';
export declare class UrlCompletionProvider implements CompletionItemProvider {
    static readonly triggerCharacters: string[];
    private readonly client;
    constructor();
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>>;
    private getHistoryUrls;
}
export declare class VariableCompletionProvider implements CompletionItemProvider {
    static readonly triggerCharacters: string[];
    private static readonly INFILE_VAR_FINDER;
    private readonly fileStateService;
    static readonly randomSuggesstionsList: ReadonlyArray<string>;
    static readonly randomSuggestions: ReadonlyArray<CompletionItem>;
    constructor();
    provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): Promise<CompletionItem[]>;
    infileCompletions(document: TextDocument): Promise<CompletionItem[]>;
    private getEnvironmentProperties;
    private variableCompletionItem;
}
export declare class HeaderCompletionItemProvider implements CompletionItemProvider {
    static readonly triggerCharacters: string[];
    provideCompletionItems(_document: TextDocument, _position: Position, _token: CancellationToken, _context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>>;
}
export declare class KeywordCompletionItemProvider implements CompletionItemProvider {
    static readonly triggerCharacters: never[];
    provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _context: CompletionContext): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>>;
}
