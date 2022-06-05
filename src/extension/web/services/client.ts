import { DothttpExecuteResponse } from '../../../common/response';
import { HttpFileTargetsDef } from '../types/lang-parse';
import { ICommandClient, DotTttpSymbol, TypeResult, ImportHarResult } from '../types/types';
import * as vscode from 'vscode';
import { ExecuteFileOptions, ClientHandler } from '../../native/services/client';

var mime = require('mime-types');

export class ClientHandler2 {
    running: boolean = false;
    cli?: ICommandClient;
    decoder = new TextDecoder();

    setCli(cli: ICommandClient){
        this.cli = cli;
        return this;
    }

    start() {
        this.running = true;
        this.cli?.start();
    }


    restart() {
        this.cli?.stop();
        this.start()
    }

    isRunning() {
        return this.running
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
                file: options.uri.fsPath,
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



declare class TextDecoder {
    decode(data: Uint8Array): string;
}

declare class TextEncoder {
    encode(data: string): Uint8Array;
}