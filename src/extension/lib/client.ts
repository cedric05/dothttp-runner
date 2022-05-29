// import axios, { AxiosResponse } from 'axios';
import { DothttpExecuteResponse } from '../../common/response';
import { DothttpRunOptions } from '../models/misc';
import { HttpFileTargetsDef } from './lang-parse';
import { ICommandClient, RunType, ClientLaunchParams, DotTttpSymbol, TypeResult, ImportHarResult } from './types';
import * as vscode from 'vscode';
import { TextDecoder } from 'util';

var mime = require('mime-types');


export class ClientHandler {
    running: boolean = false;
    cli?: ICommandClient;
    clientLaunchArguments?: { pythonpath: string; stdargs: string[]; type: RunType; };

    static FILE_EXECUTE_COMMAND = "/file/execute";
    static CONTENT_EXECUTE_COMMAND = "/content/execute";
    static GET_FILE_TARGETS_COMMAND = "/file/names";
    static CONTENT_TARGETS_COMMAND = "/content/names";
    static IMPORT_POSTMAN_COMMAND = "/import/postman";
    static GET_HAR_FORMAT_COMMAND = "/file/parse";
    static CONTENT_TYPE_COMMAND = "/content/type";
    static HAR_IMPORT_COMMAND = "/export/har2http";
    static POSTMAN_EXPORT_COMMAND = "/export/http2postman";


    constructor(_clientOptions: { std: boolean }) {
    }

    setLaunchParams(params: ClientLaunchParams) {
        this._setParams(params);
        return this;
    }

    start() {
        if (this.clientLaunchArguments) {
            if (this.clientLaunchArguments.type == RunType.http) {
                const { HttpClient } = require('./handlers/HttpClient');
                this.cli = new HttpClient(this.clientLaunchArguments);
                this.running = true;
            } else {
                const { StdoutClient } = require('./handlers/StdoutClient');
                this.cli = new StdoutClient(this.clientLaunchArguments);
                this.running = true;
            }
        }
    }


    restart() {
        this.cli?.stop();
        this.start()
    }

    isRunning() {
        return this.running
    }

    private _setParams(params: ClientLaunchParams) {
        let stdargs = params.type == RunType.python ? ['-m', 'dotextensions.server'] : [];
        this.clientLaunchArguments = {
            stdargs: stdargs,
            pythonpath: params.path,
            ...params,
        };
        console.log("launch params", JSON.stringify(this.clientLaunchArguments));
    }

    async executeFile(options: DothttpRunOptions): Promise<DothttpExecuteResponse> {
        return await this.cli?.request(ClientHandler.FILE_EXECUTE_COMMAND, {
            file: options.file,
            env: options.env,
            properties: options.properties,
            nocookie: options.noCookie,
            target: options.target,
            curl: options.curl,
        })
    }

    async executeFileWithExtension(options: DothttpRunOptions): Promise<DothttpExecuteResponse> {
        const out = await this.executeFile(options);
        out['filenameExtension'] = 'txt';
        const headers = out['headers'] ?? {};
        Object.keys(headers).filter(key => key.toLowerCase() === 'content-type').forEach(key => {
            out['filenameExtension'] = mime.extension(headers[key]);
        });
        return out;
    }

    async executeContent(options: DothttpRunOptions & { content: string }): Promise<DothttpExecuteResponse> {
        return await this.cli?.request(ClientHandler.CONTENT_EXECUTE_COMMAND, {
            content: options.content,
            env: options.env,
            file: options.file,
            properties: options.properties,
            nocookie: options.noCookie,
            target: options.target,
            curl: options.curl,
            contexts: options.contexts
        })
    }

    async executeContentWithExtension(options: DothttpRunOptions & { content: string }): Promise<DothttpExecuteResponse> {
        const out = await this.executeContent(options);
        out['filenameExtension'] = 'txt';
        const headers = out['headers'] ?? {};
        Object.keys(headers).filter(key => key.toLowerCase() === 'content-type').forEach(key => {
            out['filenameExtension'] = mime.extension(headers[key]);
        });
        return out;
    }

    async importPostman(options: { link: string, directory: string, save: boolean, filetype?: string }) {
        return await this.cli?.request(ClientHandler.IMPORT_POSTMAN_COMMAND, options)
    }

    async getDocumentSymbols(filename: string, source?: string): Promise<DotTttpSymbol> {
        return await this.cli?.request(ClientHandler.GET_FILE_TARGETS_COMMAND, { file: filename, source: source || 'default' })
    }

    async getVirtualDocumentSymbols(content: string, source?: string): Promise<DotTttpSymbol> {
        return await this.cli?.request(ClientHandler.CONTENT_TARGETS_COMMAND, { file: "", content, source: source || 'default' })
    }


    async getTypeFromFilePosition(position: number, filename: string | null, source?: string): Promise<TypeResult> {
        return await this.cli?.request(ClientHandler.CONTENT_TYPE_COMMAND, {
            filename, position: position, source
        }) as TypeResult
    }

    async getTypeFromContentPosition(position: number, content: string, source?: string): Promise<TypeResult> {
        return await this.cli?.request(ClientHandler.CONTENT_TYPE_COMMAND, {
            content, position: position, source
        }) as TypeResult
    }


    async importHarFromLink(filename: number, save_directory: string, filetype?: string): Promise<ImportHarResult> {
        return await this.cli?.request(ClientHandler.HAR_IMPORT_COMMAND, {
            filename, save_directory, filetype
        })
    }

    async importHttpFromHar(har: {}, save_directory: string, save_filename?: string, filetype?: string): Promise<ImportHarResult> {
        return await this.cli?.request(ClientHandler.HAR_IMPORT_COMMAND, {
            har, save_directory, save_filename, filetype
        })
    }

    async exportToPostman(filename: string) {
        return await this.cli?.request(ClientHandler.POSTMAN_EXPORT_COMMAND, {
            filename
        })
    }

    async generateLangHttp(options: DothttpRunOptions & { content?: string }): Promise<HttpFileTargetsDef> {
        return await this.cli?.request(ClientHandler.GET_HAR_FORMAT_COMMAND, {
            env: options.env,
            file: options.file,
            properties: options.properties,
            nocookie: options.noCookie,
            target: options.target,
            contexts: options.contexts,
        })
    }

    async generateLangFromVirtualDocHttp(options: DothttpRunOptions & { content?: string }): Promise<HttpFileTargetsDef> {
        return await this.cli?.request(ClientHandler.GET_HAR_FORMAT_COMMAND, {
            content: options.content,
            env: options.env,
            properties: options.properties,
            nocookie: options.noCookie,
            target: options.target,
            contexts: options.contexts,
        })
    }

    close() {
        this.cli?.stop();
    }
}



type ExecuteFileOptions = {
    content?: string,
    noCookie?: boolean,
    experimental?: boolean,
    env?: string[],
    propertyFile?: String,
    curl: boolean
    uri: vscode.Uri,
    target?: string,
    contexts?: Array<string>,
    properties?: { [prop: string]: string },
}


export class ClientHandler2 {
    running: boolean = false;
    cli?: ICommandClient;
    clientLaunchArguments?: { pythonpath: string; stdargs: string[]; type: RunType; url?: string };
    decoder = new TextDecoder();

    constructor(_clientOptions: { std: boolean }) {
    }

    setLaunchParams(params: ClientLaunchParams) {
        this._setParams(params);
        return this;
    }

    start() {
        if (this.clientLaunchArguments) {
            if (this.clientLaunchArguments.type == RunType.http) {
                const { HttpClient } = require('./handlers/HttpClient');
                this.cli = new HttpClient(this.clientLaunchArguments.url!);
                this.running = true;
            } else {
                const { StdoutClient } = require('./handlers/StdoutClient');
                this.cli = new StdoutClient(this.clientLaunchArguments);
                this.running = true;
            }
        }
    }


    restart() {
        this.cli?.stop();
        this.start()
    }

    isRunning() {
        return this.running
    }

    private _setParams(params: ClientLaunchParams) {
        let stdargs = params.type == RunType.python ? ['-m', 'dotextensions.server'] : [];
        this.clientLaunchArguments = {
            stdargs: stdargs,
            pythonpath: params.path,
            ...params,
        };
        console.log("launch params", JSON.stringify(this.clientLaunchArguments));
    }

    async fileData(file: vscode.Uri) {
        const data = await vscode.workspace.fs.readFile(file);
        return this.decoder.decode(data)
    }

    async execute(options: ExecuteFileOptions): Promise<DothttpExecuteResponse> {
        if (options.content || !this.cli?.isSupportsNative()) {
            if (!options.content) {
                options.content = await this.fileData(options.uri)
            };
            return await this.cli?.request(ClientHandler.CONTENT_EXECUTE_COMMAND, {
                file: null,
                ...options
            })
        } else {
            return await this.cli?.request(ClientHandler.FILE_EXECUTE_COMMAND, {
                file: options.uri.fsPath,
                ...options,
            })
        }
    }

    async executeWithExtension(options: ExecuteFileOptions): Promise<DothttpExecuteResponse> {
        const out = await this.execute(options);
        out['filenameExtension'] = 'txt';
        const headers = out['headers'] ?? {};
        Object.keys(headers).filter(key => key.toLowerCase() === 'content-type').forEach(key => {
            out['filenameExtension'] = mime.extension(headers[key]);
        });
        return out;
    }

    async documentSymbols(uri: vscode.Uri, content?: string, source?: string): Promise<DotTttpSymbol> {
        if (this.cli?.isSupportsNative() || content) {
            if (!content) {
                content = await this.fileData(uri);
            }
            return await this.cli?.request(ClientHandler.CONTENT_TARGETS_COMMAND, { file: "", content: content, source: source || 'default' })
        } else {
            return await this.cli?.request(ClientHandler.GET_FILE_TARGETS_COMMAND, { file: uri.fsPath, source: source || 'default' })
        }
    }

    async getTypeFromFilePosition(position: number, uri: vscode.Uri, source: string): Promise<TypeResult> {
        if (this.cli?.isSupportsNative()) {
            return await this.cli?.request(ClientHandler.CONTENT_TYPE_COMMAND, {
                filename: uri.fsPath, position: position, source
            }) as TypeResult
        } else {
            return await this.cli?.request(ClientHandler.CONTENT_TYPE_COMMAND, {
                content: await this.fileData(uri), position: position, source
            }) as TypeResult
        }
    }

    async importPostman(options: { link: string, directory: string, save: boolean, filetype?: string }) {
        if (this.cli?.isSupportsNative()) {
            return await this.cli?.request(ClientHandler.IMPORT_POSTMAN_COMMAND, options)
        } else {
            throw Error("unsupported error ");
        }
    }

    async importHar(har: {}, save_directory: string, save_filename?: string, filetype?: string): Promise<ImportHarResult> {
        return await this.cli?.request(ClientHandler.HAR_IMPORT_COMMAND, {
            har, save_directory, save_filename, filetype
        })
    }

    async exportToPostman(filename: string) {
        if (this.cli?.isSupportsNative()) {
            return await this.cli?.request(ClientHandler.POSTMAN_EXPORT_COMMAND, {
                filename
            })
        } else {
            throw Error("unsupported");
        }
    }

    async generateLangHttp(options: ExecuteFileOptions & { content?: string }): Promise<HttpFileTargetsDef> {
        if (options.content || !this.cli?.isSupportsNative()) {
            return await this.cli?.request(ClientHandler.GET_HAR_FORMAT_COMMAND, {
                ...options
            })
        } else {
            return await this.cli?.request(ClientHandler.GET_HAR_FORMAT_COMMAND, {
                file: options.uri.fsPath,
                ...options
            })
        }
    }

    close() {
        this.cli?.stop();
    }


}