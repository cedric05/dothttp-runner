/// <reference types="node" />
import * as child_process from 'child_process';
import { Interface } from 'readline';
import { DothttpRunOptions } from '../models/dotoptions';
import EventEmitter = require('events');
import * as vscode from 'vscode';
import { HttpFileTargetsDef } from './lang-parse';
interface ICommandClient {
    request(method: string, params: {}): Promise<{}>;
    stop(): void;
}
interface ICommand {
    method: string;
    id?: Number;
    params: {};
}
interface IResult {
    id: Number;
    result: {};
}
declare abstract class BaseSpanClient implements ICommandClient {
    readonly proc: child_process.ChildProcess;
    private static count;
    channel: vscode.OutputChannel;
    constructor(options: {
        pythonpath: string;
        stdargs: string[];
    });
    request(method: string, params: {}): Promise<any>;
    abstract call(command: ICommand): Promise<IResult>;
    stop(): void;
}
export declare class StdoutClient extends BaseSpanClient {
    rl: Interface;
    eventS: EventEmitter;
    constructor(options: {
        pythonpath: string;
        stdargs: string[];
    });
    call(command: ICommand): Promise<IResult>;
}
export declare type TargetSymbolInfo = {
    name: string;
    start: number;
    end: number;
};
export declare type UrlSymbolInfo = {
    start: number;
    url: string;
    method: string;
    end: number;
};
export interface DotTttpSymbol {
    names?: Array<TargetSymbolInfo>;
    urls?: Array<UrlSymbolInfo>;
    error?: boolean;
    error_message?: string;
}
export declare class ClientHandler {
    cli: BaseSpanClient;
    static fileExecuteCommand: string;
    static contentExecutecommand: string;
    static namescommand: string;
    static importPostman: string;
    static generateLangHttp: string;
    constructor(clientOptions: {
        std: boolean;
    });
    executeFile(options: DothttpRunOptions): Promise<any>;
    executeContent(options: DothttpRunOptions & {
        content: string;
    }): Promise<any>;
    importPostman(options: {
        link: string;
        directory: string;
        save: boolean;
    }): Promise<any>;
    getTargetsInHttpFile(filename: string, source?: string): Promise<DotTttpSymbol>;
    generateLangHttp(options: DothttpRunOptions & {
        content: string;
    }): Promise<HttpFileTargetsDef>;
    close(): void;
}
export {};
