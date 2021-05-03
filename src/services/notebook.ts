import { TextDecoder, TextEncoder } from "util";
import * as vscode from 'vscode'
import stringify = require('json-stringify-safe');
import fs = require('fs');
import path = require('path');
import { Constants } from "../models/constants";
import { ApplicationServices } from "./global";

interface RawNotebookCell {
    language: string;
    value: string;
    kind: vscode.NotebookCellKind;
    editable?: boolean;
    outputs: RawCellOutput[];
}

interface RawCellOutput {
    mime: string;
    value: any;
}


export interface ResponseRendererElements {
    status: number,
    statusText: string,
    headers?: any | undefined,
    config?: any | undefined,
    request?: any | undefined,
    data: any
}


export class NotebookKernel {
    readonly id = 'dothttp-kernel';
    readonly label = 'Dot Book Kernel';
    readonly supportedLanguages = [Constants.dothttpNotebook];

    private readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;
    client: import("/home/prasanth/cedric05/dothttp-runner/src/lib/client").ClientHandler;

    constructor() {
        this._controller = vscode.notebook.createNotebookController('dotbook-kernel',
            Constants.dothttpNotebook,
            'Dothttp Book');

        this._controller.supportedLanguages = ["dothttp-vscode"];
        this._controller.hasExecutionOrder = true;
        this._controller.description = 'A notebook for making http calls.';
        this._controller.executeHandler = this._executeAll.bind(this);
        this._controller.onDidReceiveMessage(this._handleMessage.bind(this));

        this.client = ApplicationServices.get().getClientHandler();
    }

    dispose(): void {
        this._controller.dispose();
    }

    private _executeAll(cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController): void {
        for (let cell of cells) {
            this._doExecution(cell);
        }
    }

    private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecutionTask(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start({ startTime: Date.now() });
        const httpDef = cell.document.getText();
        const out = await this.client.executeContent({
            content: httpDef,
            file: cell.document.fileName,
            env: [],
            properties: {},
            target: '1',
            curl: false,
        });

        if (out.error) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    new vscode.NotebookCellOutputItem("application/x.notebook.stderr", out.error_message)
                ])
            ]);

        } else {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    new vscode.NotebookCellOutputItem("text/plain", out.body)
                ])
            ]);

        }

        execution.end()

    }

    private async _handleMessage(event: any): Promise<any> {
        switch (event.message.command) {
            case 'save-response':
                this._saveDataToFile(event.message.data);
                return;
            default: break;
        }
    }

    private async _saveDataToFile(data: ResponseRendererElements) {
        const workSpaceDir = path.dirname(vscode.window.activeTextEditor?.document.uri.fsPath ?? '');
        if (!workSpaceDir) { return; }

        let name;
        const url = data.request?.responseUrl;
        if (url) {
            let name = url;
            name = name.replace(/^[A-Za-z0-9]+\./g, '');
            name = name.replace(/\.[A-Za-z0-9]+$/g, '');
            name = name.replace(/\./g, '-');
        } else {
            name = 'unknown-url';
        }

        let date = new Date().toDateString().replace(/\s/g, '-');

        const defaultPath = vscode.Uri.file(path.join(workSpaceDir, `response-${name}-${date}.json`));
        const location = await vscode.window.showSaveDialog({ defaultUri: defaultPath });
        if (!location) { return; }

        fs.writeFile(location?.fsPath, stringify(data, null, 4), { flag: 'w' }, (e) => {
            vscode.window.showInformationMessage(e?.message || `Saved response to ${location}`);
        });
    };
}


export class NotebookSerializer implements vscode.NotebookSerializer {

    async deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
        var contents = new TextDecoder().decode(content);    // convert to String to make JSON object

        // Read file contents
        let raw: RawNotebookCell[];
        try {
            raw = <RawNotebookCell[]>JSON.parse(contents);
        } catch {
            raw = [];
        }

        // Create array of Notebook cells for the VS Code API from file contents
        const cells = raw.map(item => new vscode.NotebookCellData(
            item.kind,
            item.value,
            item.language,
            item.outputs ? [new vscode.NotebookCellOutput(item.outputs.map(raw => new vscode.NotebookCellOutputItem(raw.mime, raw.value)))] : [],
            new vscode.NotebookCellMetadata()
        ));

        // Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
        return new vscode.NotebookData(
            cells,
            new vscode.NotebookDocumentMetadata()
        );
    }

    async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
        // function to take output renderer data to a format to save to the file
        function asRawOutput(cell: vscode.NotebookCellData): RawCellOutput[] {
            let result: RawCellOutput[] = [];
            for (let output of cell.outputs ?? []) {
                for (let item of output.outputs) {
                    result.push({ mime: item.mime, value: item.value });
                }
            }
            return result;
        }

        // Map the Notebook data into the format we want to save the Notebook data as

        let contents: RawNotebookCell[] = [];

        for (const cell of data.cells) {
            contents.push({
                kind: cell.kind,
                language: cell.language,
                value: cell.source,
                outputs: asRawOutput(cell)
            });
        }

        // Give a string of all the data to save and VS Code will handle the rest 
        return new TextEncoder().encode(stringify(contents));
    }
}
