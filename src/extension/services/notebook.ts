import * as vscode from 'vscode';
import { DothttpExecuteResponse, MessageType, NotebookExecutionMetadata, Response } from '../../common/response';
import { generateLang } from "../commands/export/generate";
import { addHistory, contructFileName, showInUntitledView } from '../commands/run';
import { ClientHandler } from "../lib/client";
import { Constants } from "../models/constants";
import DotHttpEditorView from "../views/editor";
import { ApplicationServices } from "./global";
import { IFileState } from "./state";
import dateFormat = require("dateformat");
var mime = require('mime-types');

export class NotebookKernel {
    static id = 'dothttp-kernel';
    readonly id = NotebookKernel.id;
    readonly label = 'Dot Book Kernel';
    readonly supportedLanguages = [Constants.dothttpNotebook];

    readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;
    client: ClientHandler;
    fileStateService: IFileState;

    constructor() {
        this._controller = vscode.notebooks.createNotebookController(NotebookKernel.id,
            Constants.dothttpNotebook,
            'Dothttp Book');

        this._controller.supportedLanguages = [Constants.LANG_CODE];
        this._controller.supportsExecutionOrder = true;
        this._controller.description = 'A notebook for making http calls.';
        this._controller.executeHandler = this._executeAll.bind(this);

        this.client = ApplicationServices.get().getClientHandler();
        this.fileStateService = ApplicationServices.get().getFileStateService();
        const _renderer = vscode.notebooks.createRendererMessaging("dothttp-book");
        _renderer.onDidReceiveMessage(this.onMessage.bind(this))
    }
    async onMessage(e: any) {
        const { metadata, response } = e.message;
        const {
            target,
            date,
            fileName,
            // cellNo
        } = metadata as NotebookExecutionMetadata;
        switch (e.message.request) {
            case MessageType.generate: {
                return generateLang({ filename: fileName, target, content: response.http })
            }
            case MessageType.save: {
                const fileNameWithInfo = contructFileName(fileName, { curl: false, target: target }, response, date);
                return showInUntitledView(fileNameWithInfo.filename, fileNameWithInfo.header, response);
            }
            default:
                break;
        }

    }

    dispose(): void {
        this._controller.dispose();
    }

    private async _executeAll(cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController): Promise<void> {
        for (let cell of cells) {
            try {
                await this._doExecution(cell);
            } catch (error) {

            }
        }
    }

    private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;

        const cellNo = parseInt(cell.document.uri.fragment.substring(2));
        const { uri } = cell.document;
        const target: string = ApplicationServices.get().getStorageService().getValue(`notebooktarget:${uri.fsPath}:${cellNo}`) ?? '1';

        const start = Date.now();
        execution.start(start);
        const httpDef = cell.document.getText();
        const filename = cell.document.fileName;
        const contexts = cell.notebook
            .getCells()
            .filter(cell => cell.kind == vscode.NotebookCellKind.Code)
            .map(cell => cell.document.getText());
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
        const out = await this.client.executeContentWithExtension({
            content: httpDef,
            file: cell.document.fileName,
            env: this.fileStateService.getEnv(filename),
            properties: DotHttpEditorView.getEnabledProperties(cell.document.fileName),
            target,
            curl: false,
            contexts: contexts
        }) as DothttpExecuteResponse;
        const end = Date.now();
        const metadata: NotebookExecutionMetadata = {
            fileName: cell.document.fileName,
            cellNo: cell.index,
            date: dateFormat(start, 'hh:MM:ss'),
            target: target,
            executionTime: ((end - start) / 1000).toFixed(1),
        }
        if (out.script_result && out.script_result.properties) {
            ApplicationServices.get().getPropTreeProvider().addProperties(cell.document.fileName, out.script_result.properties);
            // const totalProps = out.script_result!.properties;
            // const app = ApplicationServices.get();
            // const newprops: { [a: string]: string } = {};
            // (app
            //     .getFileStateService()
            //     .getProperties(cell.document.fileName) ?? []
            // )
            //     .filter(property => property.enabled)
            //     .filter(prop =>
            //         (totalProps[prop.key] !== prop.value))
            //     .forEach(prop => {
            //         newprops[prop.key] = totalProps[prop.key]
            //     });
            // app.getPropTreeProvider().addProperties(cell.document.fileName, out.script_result.properties);
            // out.script_result.properties = newprops;
        }
        addHistory(out, filename + "-notebook-cell.http", { target });

        try {
            if (out.error) {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.error(new Error(out.error_message!))
                    ])
                ]);
                execution.end(false, end);
            } else {
                out.body = "";
                out.headers = {};
                const outs: Array<vscode.NotebookCellOutputItem> = [];
                const nativeContentTypes = this.parseAndAdd(out.response);
                outs.push(vscode.NotebookCellOutputItem.json({ response: out, metadata: metadata }, Constants.NOTEBOOK_MIME_TYPE));
                outs.push(...nativeContentTypes);
                execution.replaceOutput([
                    new vscode.NotebookCellOutput(outs)
                ]);
                execution.end(true, end)
            }
        } catch (error) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    // @ts-ignore
                    vscode.NotebookCellOutputItem.stderr(error), vscode.NotebookCellOutputItem.stdout(error), vscode.NotebookCellOutputItem.text(error)
                ])
            ]);
            execution.end(false, Date.now())
        }

    }
    parseAndAdd(response: Response): Array<vscode.NotebookCellOutputItem> {
        if (response.headers) {
            return Object.keys(response.headers).filter(key => key.toLowerCase() === 'content-type')
                .map(key => mime.extension(response.headers![key]))
                .filter(key => key)
                .map(extension => {
                    const mimeType = mime.lookup(extension)
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



