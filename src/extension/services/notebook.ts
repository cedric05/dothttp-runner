import { TextDecoder, TextEncoder } from "util";
import * as vscode from 'vscode';
import { Response } from '../../common/response';
import { addHistory } from '../commands/run';
import { ClientHandler } from "../lib/client";
import { Constants } from "../models/constants";
import DotHttpEditorView from "../views/editor";
import { ApplicationServices } from "./global";
import { IFileState } from "./state";
import stringify = require('json-stringify-safe');
var mime = require('mime-types');

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
    static id = 'dothttp-kernel';
    readonly id = NotebookKernel.id;
    readonly label = 'Dot Book Kernel';
    readonly supportedLanguages = [Constants.dothttpNotebook];

    private readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;
    client: ClientHandler;
    fileStateService: IFileState;

    constructor() {
        this._controller = vscode.notebooks.createNotebookController(NotebookKernel.id,
            Constants.dothttpNotebook,
            'Dothttp Book');

        this._controller.supportedLanguages = [Constants.langCode];
        this._controller.supportsExecutionOrder = true;
        this._controller.description = 'A notebook for making http calls.';
        this._controller.executeHandler = this._executeAll.bind(this);

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
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now());
        const httpDef = cell.document.getText();
        const filename = cell.document.fileName;
        // TODO
        // do we want to only execute first one?????
        const target = '1';
        execution.token.onCancellationRequested(() => {
            // incase of cancellation, there is no need to replace out.
            // may appending could help

            // execution.replaceOutput([
            //     new vscode.NotebookCellOutput([
            //         // vscode.NotebookCellOutputItem.error("aborted")
            //     ])
            // ]);
            execution.end(false, Date.now())

        });
        const out = await this.client.executeContent({
            content: httpDef,
            file: cell.document.fileName,
            env: this.fileStateService.getEnv(filename),
            properties: DotHttpEditorView.getEnabledProperties(cell.document.fileName),
            target,
            curl: false,
        });
        if (out.script_result && out.script_result.properties)
            ApplicationServices.get().getPropTreeProvider().addProperties(cell.document.fileName, out.script_result.properties);
        addHistory(out, filename + "-notebook-cell.http", { target });

        try {
            if (out.error) {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.error(new Error(out.error_message!))
                    ])
                ]);
                execution.end(false, Date.now());
            } else {
                out.body = "";
                out.headers = {};
                const outs: Array<vscode.NotebookCellOutputItem> = [];
                const nativeContentTypes = this.parseAndAdd(out.response);
                outs.push(vscode.NotebookCellOutputItem.json(out, Constants.NOTEBOOK_MIME_TYPE));
                outs.push(...nativeContentTypes);
                execution.replaceOutput([
                    new vscode.NotebookCellOutput(outs)
                ]);
                execution.end(true, Date.now())
            }
        } catch (error) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.stderr(error),
                    vscode.NotebookCellOutputItem.stdout(error),
                    vscode.NotebookCellOutputItem.text(error)
                ])
            ]);
            execution.end(false, Date.now())
        }

    }
    parseAndAdd(response: Response): Array<vscode.NotebookCellOutputItem> {
        if (response.headers) {
            return Object.keys(response.headers).filter(key => key.toLowerCase() === 'content-type').map(key => {
                const mimeType = mime.lookup(mime.extension(response.headers![key]))
                // this is a hack
                // unless its called, it will not be available
                // and its not customary to call this function
                response.contentType = mimeType;
                const ret = vscode.NotebookCellOutputItem.text(response.body, mimeType);
                return ret;
            })
        }
        return [];
    }

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
        const cells = raw.map(item => {
            const cell = new vscode.NotebookCellData(
                item.kind,
                item.value,
                item.language
            );
            cell.outputs = item.outputs ? [new vscode.NotebookCellOutput(
                item.outputs.map(output => vscode.NotebookCellOutputItem.text(output.value, output.mime))
            )] : [];

            return cell;
        });
        // Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
        return new vscode.NotebookData(
            cells,
        );
    }

    async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
        // function to take output renderer data to a format to save to the file
        const decoder = new TextDecoder("utf-8");
        function asRawOutput(cell: vscode.NotebookCellData): RawCellOutput[] {
            let result: RawCellOutput[] = [];
            for (let output of cell.outputs ?? []) {
                if (output.items)
                    for (let item of output.items) {
                        result.push({ mime: item.mime, value: decoder.decode(item.data) });
                    }
            }
            return result;
        }

        // Map the Notebook data into the format we want to save the Notebook data as

        let contents: RawNotebookCell[] = [];

        for (const cell of data.cells) {
            contents.push({
                kind: cell.kind,
                // TODO removeme once code-insiders picksup latest
                // @ts-ignore
                language: cell.language || cell.languageId,
                // @ts-ignore
                value: cell.value || cell.source,
                outputs: asRawOutput(cell)
            });
        }

        // Give a string of all the data to save and VS Code will handle the rest 
        return new TextEncoder().encode(stringify(contents, null, 1));
    }
}

