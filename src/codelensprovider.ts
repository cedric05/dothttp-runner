import * as vscode from 'vscode'
import { Range } from 'vscode';
import { GlobalState } from './global';
import * as loadsh from 'lodash';


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

    private state: GlobalState = GlobalState.getState();

    private codeLenses: DothttpPositions[] = [];
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        vscode.window.onDidChangeActiveTextEditor(loadsh.debounce(() => {
            this._onDidChangeCodeLenses.fire()
        }, 10000));
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): DothttpPositions[] | Thenable<DothttpPositions[]> {
        return new Promise(async (resolve) => {
            this.codeLenses = [];
            this.state.clientHanler.getNames(document.fileName).then((names) => {
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
                    this.codeLenses.push(runCommand);
                    this.codeLenses.push(curlCommand);
                    resolve(this.codeLenses);
                })
            });
        })
    }

    public resolveCodeLens(codeLens: DothttpPositions, token: vscode.CancellationToken) {
        codeLens.command = {
            title: !codeLens.curl ? "Run http" : "generate curl",
            tooltip: !codeLens.curl ? "Run http targets this definition" : "Generate curl targeting this def",
            command: "dothttp.command.run",
            arguments: [{ "target": codeLens.target, "curl": codeLens.curl }]
        };
        return codeLens;
    }
}