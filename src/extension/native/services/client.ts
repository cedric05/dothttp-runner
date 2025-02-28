import { DothttpExecuteResponse } from '../../../common/response';
import { DothttpRunOptions } from '../../web/types/misc';
import { HttpFileTargetsDef } from '../../web/types/lang-parse';
import { ICommandClient, RunType, DotTttpSymbol, TypeResult, ImportHarResult, ResolveResult } from '../../web/types/types';
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
    static CONTENT_RESOLVE_COMMAND = "/content/resolve";
    static FILE_RESOLVE_COMMAND = "/file/resolve";
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

    async getVirtualDocumentSymbols(content: string, source?: string, file?: string, context?: [string]): Promise<DotTttpSymbol> {
        return await this.cli?.request(ClientHandler.CONTENT_TARGETS_COMMAND, { file: file ?? "", content, source: source || 'default', context });
    }


    async getTypeFromFilePosition(position: number, filename: string | null, source?: string): Promise<TypeResult> {
        return await this.cli?.request(ClientHandler.CONTENT_TYPE_COMMAND, {
            filename, position: position, source
        }) as TypeResult;
    }

    async resolveContentFromContentPosition(
        position: number,
        filename: string | null,
        content: string | null,
        contexts: string[],
        propertyFile: string | null,
        env: string[],
        properties: { [prop: string]: string },
        source?: string): Promise<ResolveResult> {
        return await this.cli?.request(ClientHandler.CONTENT_RESOLVE_COMMAND, {
            content, position: position, source, env, properties,
            file: filename,
            contexts,
            'property-file': propertyFile
        }) as ResolveResult;
    }

    async resolveContentFromFilePosition(
        position: number,
        filename: string | null,
        propertyFile: string | null,
        env: string[],
        properties?: { [prop: string]: string },
        source?: string): Promise<ResolveResult> {
        return await this.cli?.request(ClientHandler.CONTENT_RESOLVE_COMMAND, {
            file: filename, position: position, source, env, properties,
            'property-file': propertyFile
        }) as ResolveResult;
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

    async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        var ret: { "result": { "operation": string, "files": [[string, string]] } } = await this.cli?.request("/fs/read-directory", { source: uri.fsPath });
        return ret.result.files.map(([name, type]) => {
            switch (type) {
                case "file":
                    return [name, vscode.FileType.File];
                case "directory":
                    return [name, vscode.FileType.Directory];
                case "symlink":
                    return [name, vscode.FileType.SymbolicLink];
                default:
                    return [name, vscode.FileType.Unknown];
            }
        });
    }

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        var ret: { "result": { "operation": string, "content": string } } | { "error": boolean, "error_message": string } = await this.cli?.request("/fs/read", { source: uri.fsPath });
        if ("error" in ret) {
            switch (ret.error_message) {
                case "FileNotFound":
                    throw vscode.FileSystemError.FileNotFound(uri);
                case "PermissionDenied":
                    throw vscode.FileSystemError.NoPermissions(uri);
                case "FileIsADirectory":
                    throw vscode.FileSystemError.FileIsADirectory(uri);
                case "UnknownError":
                    throw vscode.FileSystemError.Unavailable;
            }
            throw new Error(ret.error_message);
        } else {
            // convert base64 to buffer
            var content = Buffer.from(ret.result.content, 'base64');
            return new Uint8Array(content);
        }
    }

    async statFile(uri: vscode.Uri): Promise<vscode.FileStat> {
        var ret: { "result": { "operation": string, "stat": [number, number, number, number, number, number, number, number, number, number,] } } | { "error": boolean, "error_message": string } = await this.cli?.request("/fs/stat", { source: uri.fsPath });
        if ("error" in ret) {
            switch (ret.error_message) {
                case "FileNotFound":
                    throw vscode.FileSystemError.FileNotFound(uri);
                case "PermissionDenied":
                    throw vscode.FileSystemError.NoPermissions(uri);
                case "FileIsADirectory":
                    throw vscode.FileSystemError.FileIsADirectory(uri);
                case "UnknownError":
                    throw vscode.FileSystemError.Unavailable;
            }
            throw new Error(ret.error_message);
        } else {
            const [st_mode, st_ino, st_dev, st_nlink, st_uid, st_gid, st_size, st_atime, st_mtime, st_ctime] = ret.result.stat;
            return {
                type: (st_mode & 61440) === 16384 ? vscode.FileType.Directory : vscode.FileType.File,
                ctime: st_ctime * 1000,
                mtime: st_mtime * 1000,
                size: st_size,
            };
        }
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
