import * as vscode from 'vscode';
import { DothttpExecuteResponse, NotebookExecutionMetadata, Response } from '../../../common/response';
import { ClientHandler2 } from "./client";
import { IFileState } from "../types/properties";
import dateFormat = require("dateformat");
import { LocalStorageService } from './storage';
import { PropertyTree } from '../../views/tree';
import { Constants } from '../utils/constants';
import { Configuration } from '../utils/config';
var mime = require('mime-types');

const hasInbuiltPreview = ["html",
    // support for below are taken care by text/x-json ...
    /*
    "json", 
     "xml",
     "md",
    */
    "svg",
    "png",
    "jpeg",
    "txt"]
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
    config?: Configuration;

    constructor() {
        this._controller = vscode.notebooks.createNotebookController(NotebookKernel.id,
            Constants.dothttpNotebook,
            'Dothttp Book');
        this._controller.supportedLanguages = [Constants.LANG_CODE as string];
        this._controller.supportsExecutionOrder = true;
        this._controller.description = 'A notebook for making http calls.';
        this._controller.executeHandler = this._executeAll.bind(this);
    }
    configure(client: ClientHandler2, fileStateService: IFileState, treeprovider: PropertyTree, config: Configuration) {
        this.client = client;
        this.fileStateService = fileStateService;
        // @ts-ignore
        this.storageService = fileStateService.storage;
        this.treeprovider = treeprovider;
        this.config = config;
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

        const { uri } = cell.document;
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
        try {
            const out = await this.getResponse(httpDef, cell, { filename: uri, target, curl, contexts }) as DothttpExecuteResponse;
            const end = Date.now();
            const metadata: NotebookExecutionMetadata = {
                uri: cell.document.uri,
                cellNo: cell.index,
                date: dateFormat(start, 'yyyy-MM-dd--HH-mm-ss'),
                target: target,
                executionTime: ((end - start) / 1000).toFixed(1),
            };
            if (out.script_result && out.script_result.properties) {
                this.treeprovider?.addProperties(cell.document.uri, out.script_result.properties);
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

            try {
                if (out.error) {
                    execution.replaceOutput([
                        new vscode.NotebookCellOutput([
                            vscode.NotebookCellOutputItem.stderr(out.error_message!)
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

        } catch (error) { }
    }
    async getResponse(httpDef: string, cell: vscode.NotebookCell, options: { filename: vscode.Uri, target: string, properties?: {}, curl: boolean, contexts: string[] }): Promise<DothttpExecuteResponse | undefined> {
        return await this.client?.executeWithExtension({
            content: httpDef,
            uri: cell.document.uri,
            env: this.fileStateService?.getEnv(options.filename) ?? [],
            noCookie: this.config?.noCookies,
            ...options
            // properties: options.properties,
            // target: options.target,
            // curl: options.curl,
            // contexts: options.contexts
        });
    }

    async _getTarget(uri: vscode.Uri, cellNo: number, httpDef: string) {
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
                    if (hasInbuiltPreview.indexOf(extension) > -1) {
                        return [
                            vscode.NotebookCellOutputItem.text(response.body, `text/x-${extension}`),
                            vscode.NotebookCellOutputItem.text(response.body, mime.lookup(extension))
                        ]
                    } else {
                        return [vscode.NotebookCellOutputItem.text(response.body, `text/x-${extension}`)];
                    }
                })
                .flat()
        }
        return [];
    }

    async generateCurl(cell: vscode.NotebookCell) {
        return this._doExecution(cell, true)
    }


}



