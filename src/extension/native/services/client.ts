import { DothttpExecuteResponse } from '../../../common/response';
import { DothttpRunOptions } from '../../web/types/misc';
import { HttpFileTargetsDef } from '../../web/types/lang-parse';
import { ICommandClient, RunType, DotTttpSymbol, TypeResult, ImportHarResult } from '../../web/types/types';
import * as vscode from 'vscode';
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


    setCli(cli: ICommandClient) {
        this.cli = cli;
        return this;
    }

    start() {
        this.running = true;
        this.cli?.start();
    }

    restart() {
        this.cli?.stop();
        this.start();
    }

    isRunning() {
        return this.cli?.isRunning;
    }



    async executeFile(options: DothttpRunOptions): Promise<DothttpExecuteResponse> {
        return await this.cli?.request(ClientHandler.FILE_EXECUTE_COMMAND, {
            file: options.file,
            env: options.env,
            properties: options.properties,
            nocookie: options.noCookie,
            target: options.target,
            curl: options.curl,
            'property-file': options.propertyFile?.fsPath ?? null,
        });
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

    async executeContent(options: DothttpRunOptions & { content: string; }): Promise<DothttpExecuteResponse> {
        return await this.cli?.request(ClientHandler.CONTENT_EXECUTE_COMMAND, {
            content: options.content,
            env: options.env,
            file: options.file,
            properties: options.properties,
            nocookie: options.noCookie,
            target: options.target,
            curl: options.curl,
            contexts: options.contexts,
            'property-file': options.propertyFile?.fsPath ?? null,
        });
    }

    async executeContentWithExtension(options: DothttpRunOptions & { content: string; }): Promise<DothttpExecuteResponse> {
        const out = await this.executeContent(options);
        out['filenameExtension'] = 'txt';
        const headers = out['headers'] ?? {};
        Object.keys(headers).filter(key => key.toLowerCase() === 'content-type').forEach(key => {
            out['filenameExtension'] = mime.extension(headers[key]);
        });
        return out;
    }

    async importPostman(options: { link: string | null; directory: string; save: boolean; filetype?: string; "postman-collection"?: any }) {
        return await this.cli?.request(ClientHandler.IMPORT_POSTMAN_COMMAND, options);
    }

    async getDocumentSymbols(filename: string, source?: string): Promise<DotTttpSymbol> {
        return await this.cli?.request(ClientHandler.GET_FILE_TARGETS_COMMAND, { file: filename, source: source || 'default' });
    }

    async getVirtualDocumentSymbols(content: string, source?: string): Promise<DotTttpSymbol> {
        return await this.cli?.request(ClientHandler.CONTENT_TARGETS_COMMAND, { file: "", content, source: source || 'default' });
    }


    async getTypeFromFilePosition(position: number, filename: string | null, source?: string): Promise<TypeResult> {
        return await this.cli?.request(ClientHandler.CONTENT_TYPE_COMMAND, {
            filename, position: position, source
        }) as TypeResult;
    }

    async getTypeFromContentPosition(position: number, content: string, source?: string): Promise<TypeResult> {
        return await this.cli?.request(ClientHandler.CONTENT_TYPE_COMMAND, {
            content, position: position, source
        }) as TypeResult;
    }


    async importHarFromLink(filename: number, save_directory: string, filetype?: string): Promise<ImportHarResult> {
        return await this.cli?.request(ClientHandler.HAR_IMPORT_COMMAND, {
            filename, save_directory, filetype
        });
    }

    async importHttpFromHar(har: {}, save_directory: string, save_filename?: string, filetype?: string): Promise<ImportHarResult> {
        return await this.cli?.request(ClientHandler.HAR_IMPORT_COMMAND, {
            har, save_directory, save_filename, filetype
        });
    }

    async exportToPostman(filename: string) {
        return await this.cli?.request(ClientHandler.POSTMAN_EXPORT_COMMAND, {
            filename
        });
    }

    async generateLangHttp(options: DothttpRunOptions & { content?: string; }): Promise<HttpFileTargetsDef> {
        return await this.cli?.request(ClientHandler.GET_HAR_FORMAT_COMMAND, {
            env: options.env,
            file: options.file,
            properties: options.properties,
            nocookie: options.noCookie,
            target: options.target,
            contexts: options.contexts,
        });
    }

    async generateLangFromVirtualDocHttp(options: DothttpRunOptions & { content?: string; }): Promise<HttpFileTargetsDef> {
        return await this.cli?.request(ClientHandler.GET_HAR_FORMAT_COMMAND, {
            content: options.content,
            env: options.env,
            properties: options.properties,
            nocookie: options.noCookie,
            target: options.target,
            contexts: options.contexts,
        });
    }

    close() {
        this.cli?.stop();
    }
}
export type ExecuteFileOptions = {
    content?: string;
    noCookie?: boolean;
    experimental?: boolean;
    env?: string[];
    propertyFile?: vscode.Uri;
    curl: boolean;
    uri: vscode.Uri;
    target?: string;
    contexts?: Array<string>;
    properties?: { [prop: string]: string; };
};
