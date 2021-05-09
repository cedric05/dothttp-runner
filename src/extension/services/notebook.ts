import { TextDecoder, TextEncoder } from "util";
import * as vscode from 'vscode';
import { Response, ResponseRendererElements } from '../../common/response';
import { addHistory } from '../commands/run';
import { ClientHandler } from "../lib/client";
import { Constants } from "../models/constants";
import DotHttpEditorView from "../views/editor";
import { ApplicationServices } from "./global";
import { IFileState } from "./state";
import stringify = require('json-stringify-safe');
import fs = require('fs');
import path = require('path');

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

export class NotebookKernel {
    readonly id = 'dothttp-kernel';
    readonly label = 'Dot Book Kernel';
    readonly supportedLanguages = [Constants.dothttpNotebook];

    private readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;
    client: ClientHandler;
    fileStateService: IFileState;

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
        this.fileStateService = ApplicationServices.get().getFileStateService();
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
        const filename = cell.document.fileName;
        // TODO
        // do we want to only execute first one?????
        const target = '1';
        const out = await this.client.executeContent({
            content: httpDef,
            file: cell.document.fileName,
            env: this.fileStateService.getEnv(filename),
            properties: DotHttpEditorView.getEnabledProperties(cell.document.fileName),
            target,
            curl: false,
        });
        addHistory(out, filename + ".http", { target });


        if (out.error) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    new vscode.NotebookCellOutputItem("application/x.notebook.stderr", out.error_message)
                ])
            ]);

        } else {
            const outs: Array<vscode.NotebookCellOutputItem> = [];
            this.parseAndAdd(outs, out.response);
            outs.push(new vscode.NotebookCellOutputItem(Constants.NOTEBOOK_MIME_TYPE, out));
            execution.replaceOutput([
                new vscode.NotebookCellOutput(outs)
            ]);
        }

        execution.end()

    }
    parseAndAdd(notebookDotOut: Array<vscode.NotebookCellOutputItem>, response: Response) {
        if (response.headers) {
            Object.keys(response.headers).filter(key => key.toLowerCase() === 'content-type').forEach(key => {
                const mimeType = response.headers![key];
                switch (mimeType) {
                    case "application/json":
                        notebookDotOut.push(new vscode.NotebookCellOutputItem(mimeType, JSON.parse(response.body)));
                        break;
                    default:
                        notebookDotOut.push(new vscode.NotebookCellOutputItem(mimeType.substring(0, mimeType.indexOf(';')), response.body));
                }
            })
        }
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

