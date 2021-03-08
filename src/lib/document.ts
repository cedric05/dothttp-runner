import * as vscode from 'vscode';
import { Range, SymbolInformation } from 'vscode';
import { ApplicationServices } from '../services/global';
import { ClientHandler } from './client';


export class DothttpNameSymbolProvider implements vscode.DocumentSymbolProvider {
    readonly clientHandler: ClientHandler;

    constructor() {
        this.clientHandler = ApplicationServices.get().getClientHandler();
    }
    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        return new Promise<SymbolInformation[]>(async (resolve, reject) => {
            const names = await this.clientHandler.getNames(document.fileName);
            resolve(names.names.map(element =>
                new SymbolInformation(element.name, vscode.SymbolKind.Class,
                    new Range(
                        document.positionAt(element.start),
                        document.positionAt(element.end)),
                )));
        })
    }

}