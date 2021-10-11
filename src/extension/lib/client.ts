// import axios, { AxiosResponse } from 'axios';
import * as child_process from 'child_process';
import { once } from 'events';
import { createInterface, Interface } from 'readline';
import * as vscode from 'vscode';
import { DothttpExecuteResponse } from '../../common/response';
import { runSync } from '../downloader';
import { Configuration, isDotHttpCorrect } from '../models/config';
import { DothttpRunOptions, DothttpTypes } from '../models/misc';
import { HttpFileTargetsDef } from './lang-parse';
import EventEmitter = require('events');
var mime = require('mime-types');


interface ICommandClient {
    request(method: string, params: {}): Promise<{}>;
    stop(): void;
}

interface ICommand {
    method: string,
    id?: Number,
    params: {}
}


interface IResult {
    id: Number,
    result: {},
}

class CmdClientError extends Error {

}


abstract class BaseSpanClient implements ICommandClient {
    proc: child_process.ChildProcess;
    private static count = 1; // restricts only stdserver or httpserver not both!!!!
    channel: vscode.OutputChannel;

    constructor(options: { pythonpath: string, stdargs: string[] }) {
        this.proc = child_process.spawn(options.pythonpath,
            options.stdargs,
            { stdio: ["pipe", "pipe", "inherit"] }
        );

        this.channel = vscode.window.createOutputChannel('dothttp-code');
    }

    async request(method: string, params: {}): Promise<any> {
        const id = BaseSpanClient.count++;
        const requestData = { method, params, id };
        this.channel.appendLine(JSON.stringify(requestData));
        const result = await this.call(requestData);
        this.channel.appendLine(JSON.stringify(result));
        if (result.id !== id) {
            throw new CmdClientError("id's are not same");
        }
        return result.result;
    }
    abstract call(command: ICommand): Promise<IResult>;

    stop(): void {
        this.proc.kill();
    }

}

export class StdoutClient extends BaseSpanClient {
    rl!: Interface;
    eventS: EventEmitter = new EventEmitter();

    constructor(options: { pythonpath: string, stdargs: string[], type: RunType }) {
        super(options);
        this.setup();
        this.healInstallation(options);
    }
    private setup() {
        this.rl = createInterface({
            input: this.proc.stdout!,
            terminal: false
        });
        // start readline to listen
        this.rl.on("line", (line) => {
            const result: IResult = JSON.parse(line);
            this.eventS.emit(result.id + '', result);
        });
    }

    async call(command: ICommand): Promise<IResult> {
        const commandInString = JSON.stringify(command) + '\n';
        this.proc.stdin!.write(commandInString);
        const results = await once(this.eventS, command.id + '');
        // once retruns multiple at a time.
        // technically you should recive only one.
        if (results.length > 1) throw new CmdClientError("inconsistant state");
        return results[0] as unknown as IResult;
    }


    async healInstallation(options: { pythonpath: string, stdargs: string[], type: RunType }) {
        if (
            // @ts-ignore
            !this.proc.pid
        ) {
            if (options.type === RunType.python) {
                // install
                await runSync(options.pythonpath, ["-m", "pip", "install", 'dothttp-req']);
                this.proc = child_process.spawn(options.pythonpath, options.stdargs,
                    { stdio: ["pipe", "pipe", "inherit"] });
                this.setup();
            }
        }
    }

}


// export class HttpClient extends BaseSpanClient {
//     constructor(options: { pythonpath: string, stdargs: string[] }) {
//         super(options);
//     }
//     async call(command: ICommand): Promise<IResult> {
//         const id = command.id;
//         const axiosResponse: AxiosResponse<IResult> = await axios({
//             url: new URL(command.method, 'http://localhost:5000/').href,
//             method: "POST",
//             params: {
//                 id
//             },
//             data: command.params
//         });
//         return axiosResponse.data
//     }
// }


export type TargetSymbolInfo = {
    name: string;
    start: number;
    end: number;
};


export type UrlSymbolInfo = {
    start: number;
    url: string;
    method: string;
    end: number;
};

export interface DotTttpSymbol {
    names?: Array<TargetSymbolInfo>,
    urls?: Array<UrlSymbolInfo>,
    error?: boolean,
    error_message?: string,
}

export interface TypeResult {
    "type": DothttpTypes,
    "target": string | null,
    "target_base": string | null,
    "base_start": number | null
}

enum RunType {
    binary,
    python
}

export type ImportHarResult = {
    error?: boolean;
    error_message?: string;
    filename: string;
    http: string;
};

export class ClientHandler {
    cli: BaseSpanClient;

    static FILE_EXECUTE_COMMAND = "/file/execute";
    static CONTENT_EXECUTE_COMMAND = "/content/execute";
    static GET_FILE_TARGETS_COMMAND = "/file/names";
    static CONTENT_TARGETS_COMMAND = "/content/names";
    static IMPORT_POSTMAN_COMMAND = "/import/postman";
    static GET_HAR_FORMAT_COMMAND = "/file/parse";
    static CONTENT_TYPE_COMMAND = "/content/type";
    static HAR_IMPORT_COMMAND = "/export/har2http";
    static POSTMAN_EXPORT_COMMAND = "/export/http2postman";

    options: { pythonpath: string; stdargs: string[]; type: RunType; };

    constructor(_clientOptions: { std: boolean }) {
        this.options = this.getOptions();
        // if (clientOptions.std) {
        this.cli = new StdoutClient(this.options);
        // } else {
        //     options.stdargs.push('http');
        //     this.cli = new HttpClient(options);
        // }
    }

    restart() {
        this.cli.stop();
        this.cli = new StdoutClient(this.options);
    }

    private getOptions() {
        const options = { stdargs: [] } as unknown as { pythonpath: string; stdargs: string[]; type: RunType; };
        if (isDotHttpCorrect()) {
            options.pythonpath = Configuration.getDothttpPath();
            options.type = RunType.binary;
        } else {
            options.pythonpath = Configuration.getPath();
            options.stdargs.push('-m');
            options.stdargs.push('dotextensions.server');
            options.type = RunType.python;
        }
        console.log("launch params", JSON.stringify(options));
        return options;
    }

    async executeFile(options: DothttpRunOptions): Promise<DothttpExecuteResponse> {
        return await this.cli.request(ClientHandler.FILE_EXECUTE_COMMAND, {
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
        return await this.cli.request(ClientHandler.CONTENT_EXECUTE_COMMAND, {
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
        return await this.cli.request(ClientHandler.IMPORT_POSTMAN_COMMAND, options)
    }

    async getDocumentSymbols(filename: string, source?: string): Promise<DotTttpSymbol> {
        return await this.cli.request(ClientHandler.GET_FILE_TARGETS_COMMAND, { file: filename, source: source || 'default' })
    }

    async getVirtualDocumentSymbols(content: string, source?: string): Promise<DotTttpSymbol> {
        return await this.cli.request(ClientHandler.CONTENT_TARGETS_COMMAND, { file: "", content, source: source || 'default' })
    }


    async getTypeFromFilePosition(position: number, filename: string | null, source?: string): Promise<TypeResult> {
        return await this.cli.request(ClientHandler.CONTENT_TYPE_COMMAND, {
            filename, position: position, source
        }) as TypeResult
    }

    async getTypeFromContentPosition(position: number, content: string, source?: string): Promise<TypeResult> {
        return await this.cli.request(ClientHandler.CONTENT_TYPE_COMMAND, {
            content, position: position, source
        }) as TypeResult
    }


    async importHarFromLink(filename: number, save_directory: string, filetype?: string): Promise<ImportHarResult> {
        return await this.cli.request(ClientHandler.HAR_IMPORT_COMMAND, {
            filename, save_directory, filetype
        })
    }

    async importHttpFromHar(har: {}, save_directory: string, save_filename?: string, filetype?: string): Promise<ImportHarResult> {
        return await this.cli.request(ClientHandler.HAR_IMPORT_COMMAND, {
            har, save_directory, save_filename, filetype
        })
    }

    async exportToPostman(filename: string) {
        return await this.cli.request(ClientHandler.POSTMAN_EXPORT_COMMAND, {
            filename
        })
    }

    async generateLangHttp(options: DothttpRunOptions & { content?: string }): Promise<HttpFileTargetsDef> {
        return await this.cli.request(ClientHandler.GET_HAR_FORMAT_COMMAND, {
            env: options.env,
            file: options.file,
            properties: options.properties,
            nocookie: options.noCookie,
            target: options.target,
        })
    }

    async generateLangFromVirtualDocHttp(options: DothttpRunOptions & { content?: string }): Promise<HttpFileTargetsDef> {
        return await this.cli.request(ClientHandler.GET_HAR_FORMAT_COMMAND, {
            content: options.content,
            env: options.env,
            properties: options.properties,
            nocookie: options.noCookie,
            target: options.target,
        })
    }

    close() {
        this.cli.stop();
    }
}