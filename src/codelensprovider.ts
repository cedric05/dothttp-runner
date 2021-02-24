import * as vscode from 'vscode'
import { Range } from 'vscode';
import { ApplicationServices } from './services/global';
import * as loadsh from 'lodash';
import { ClientHandler } from './lib/client';


class DothttpPositions extends vscode.CodeLens {
    target!: string;
    curl!: boolean;
    constructor(range: Range, target: string, curl: boolean) {
        super(range);
        this.target = target;
        this.curl = curl;
    }
}


export class CodelensProvider implements vscode.CodeLensProvider<DothttpPositions> {


    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;
    private clientHandler: ClientHandler;

    constructor() {
        vscode.window.onDidChangeActiveTextEditor(loadsh.debounce(() => {
            this._onDidChangeCodeLenses.fire()
        }, 10000));
        this.clientHandler = ApplicationServices.get().getClientHandler();
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): DothttpPositions[] | Thenable<DothttpPositions[]> {
        return new Promise(async (resolve) => {
            const codeLenses: DothttpPositions[] = [];
            this.clientHandler.getNames(document.fileName).then((names) => {
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
}