import * as vscode from 'vscode';
import { Constants } from "../models/constants";
import { ClientHandler } from "../lib/client";
import { IFileState } from "./state";
export interface ResponseRendererElements {
    status: number;
    statusText: string;
    headers?: any | undefined;
    config?: any | undefined;
    request?: any | undefined;
    data: any;
}
export declare class NotebookKernel {
    readonly id = "dothttp-kernel";
    readonly label = "Dot Book Kernel";
    readonly supportedLanguages: Constants[];
    private readonly _controller;
    private _executionOrder;
    client: ClientHandler;
    fileStateService: IFileState;
    constructor();
    dispose(): void;
    private _executeAll;
    private _doExecution;
    private _handleMessage;
    private _saveDataToFile;
}
export declare class NotebookSerializer implements vscode.NotebookSerializer {
    deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData>;
    serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array>;
}
