import * as vscode from 'vscode';
import { DothttpExecuteResponse, MessageType, NotebookExecutionMetadata, Response } from '../../common/response';
// import { generateLang, generateLangFromOptions } from "../commands/export/generate";
// import { addHistory } from '../commands/run';
import { ClientHandler2 } from "../lib/client";
import { Constants } from "../models/constants";
import { IFileState } from "./Iproperties";
import dateFormat = require("dateformat");
import { LocalStorageService } from './storage';
import { PropertyTree } from '../views/tree';
import { generateLang, generateLangFromOptions } from '../commands/export/generate';
import { contructFileName, showInUntitledView } from '../commands/run';
var mime = require('mime-types');

export class NotebookKernel {
    static id = 'dothttp-kernel';
    readonly id = NotebookKernel.id;
    readonly label = 'Dot Book Kernel';
    readonly supportedLanguages = [Constants.dothttpNotebook];

    readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;
    client?: ClientHandler2;
    fileStateService?: IFileState;
    storageService?: LocalStorageService;
    treeprovider?: PropertyTree;

    constructor() {
        this._controller = vscode.notebooks.createNotebookController(NotebookKernel.id,
            Constants.dothttpNotebook,
            'Dothttp Book');
        this._controller.supportedLanguages = [Constants.LANG_CODE as string];
        this._controller.supportsExecutionOrder = true;
        this._controller.description = 'A notebook for making http calls.';
        this._controller.executeHandler = this._executeAll.bind(this);

        const _renderer = vscode.notebooks.createRendererMessaging("dothttp-book");
        _renderer.onDidReceiveMessage(this.onMessage.bind(this))
    }
    configure(client: ClientHandler2, fileStateService: IFileState, treeprovider: PropertyTree) {
        this.client = client;
        this.fileStateService = fileStateService;
        // @ts-ignore
        this.storageService = fileStateService.storage;
        this.treeprovider = treeprovider;
    }

    async onMessage(e: any) {
        const { metadata, response } = e.message;
        const {
            target,
            date,
            uri,
            // cellNo
        } = metadata as NotebookExecutionMetadata;
        switch (e.message.request) {
            case MessageType.generate: {
                return generateLang({ uri: uri, target, content: response.http })
            }
            case MessageType.save: {
                const fileNameWithInfo = contructFileName(uri.fsPath, { curl: false, target: target }, response, date);
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
                console.error("ran into error ", error);
            }
        }
    }

    private async _doExecution(cell: vscode.NotebookCell, curl = false): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        const start = Date.now();
        execution.start(start);

        const { uri, fileName: filename } = cell.document;
        const cellNo = parseInt(uri.fragment.substring(2));
        const httpDef = cell.document.getText();

        const contexts = cell.notebook
            .getCells()
            .filter(cell => cell.kind == vscode.NotebookCellKind.Code)
            .map(cell => cell.document.getText());

        const target: string = await this._getTarget(uri, cellNo, httpDef);
        execution.token.onCancellationRequested(() => {
            execution.end(false, Date.now())

        });
        let properties = {}
        try {
            // properties = DotHttpEditorView.getEnabledProperties(cell.document.fileName) ?? {}; } catch (error) { }
            const out = await this.client?.executeWithExtension({
                content: httpDef,
                uri: cell.document.uri,
                env: this.fileStateService?.getEnv(filename) ?? [],
                properties,
                target,
                curl,
                contexts: contexts
            }) as DothttpExecuteResponse;
            const end = Date.now();
            const metadata: NotebookExecutionMetadata = {
                uri: cell.document.uri,
                cellNo: cell.index,
                date: dateFormat(start, 'hh:MM:ss'),
                target: target,
                executionTime: ((end - start) / 1000).toFixed(1),
            };
            if (out.script_result && out.script_result.properties) {
                this.treeprovider?.addProperties(cell.document.fileName, out.script_result.properties);
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
            if (false) {
                // TODO
                // addHistory(out, filename + "-notebook-cell.http", { target });
            }

            try {
                if (out.error) {
                    execution.replaceOutput([
                        new vscode.NotebookCellOutput([
                            vscode.NotebookCellOutputItem.error(new Error(out.error_message!))
                        ])
                    ]);
                    execution.end(false, end);
                } else {
                    if (curl) {
                        execution.replaceOutput([
                            new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.text(out.body, "text/x-shell")])
                        ]);
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
                    }

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

        } catch(error){}
    }
    private async _getTarget(uri: vscode.Uri, cellNo: number, httpDef: string) {
        let target: string = this.storageService?.getValue(`notebooktarget:${uri.fsPath}:${cellNo}`) ?? '1';
        const availabileTargets = ((await this.client?.documentSymbols(uri, httpDef)) ?? {}).names?.map(x => x.name);
        if (availabileTargets) {
            let intTarget: number = 0;
            try {
                intTarget = parseInt(target);
            } catch (_ignored) {
            }
            if (availabileTargets?.indexOf(target) == -1 || (
                intTarget > availabileTargets?.length)) {
                target = '1';
            }
        }
        return target;
    }

    parseAndAdd(response: Response): Array<vscode.NotebookCellOutputItem> {
        if (response.headers) {
            return Object.keys(response.headers).filter(key => key.toLowerCase() === 'content-type')
                .map(key => mime.extension(response.headers![key]))
                .filter(key => key)
                .map(extension => {
                    response.contentType = mime.lookup(extension);
                    return vscode.NotebookCellOutputItem.text(response.body, `text/x-${extension}`);
                })
        }
        return [];
    }

    async generateCurl(cell: vscode.NotebookCell) {
        return this._doExecution(cell, true)
    }

    async generateProgrammingLang(cell: vscode.NotebookCell) {
        const execution = this._controller.createNotebookCellExecution(cell);
        try {
            execution.start(Date.now());
            const cellUri = cell.document.uri;
            const contexts = cell.notebook
                .getCells()
                .filter(cell => cell.kind == vscode.NotebookCellKind.Code)
                .map(cell => cell.document.getText());
            const cellNo = parseInt(cellUri.fragment.substring(2));
            const content = cell.document.getText();
            const target: string = await this._getTarget(cellUri, cellNo, content);
            const langspec = await generateLangFromOptions({ content, uri: cell.document.uri, target, contexts });
            if (langspec && langspec.code) {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.text(langspec.code as string, `text/x-${langspec.language}`)])
                ]);
            } else {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr("Failed to generate code, Probably syntax error")])
                ]);
            }
        } catch (error) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`Failed to generate code. error: ${error}`)])
            ]);
        }
        execution.end(true, Date.now());
    }
}



