import { DothttpTypes } from './misc';

export interface ICommandClient {
    request(method: string, params: {}): Promise<any>;
    start(): void;
    stop(): void;
    isRunning(): boolean;
    isSupportsNative(): boolean;
}

export interface ICommand {
    method: string;
    id?: Number;
    params: {};
}


export interface IResult {
    id: Number;
    result: {};
}

export class CmdClientError extends Error {
}

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
    names?: Array<TargetSymbolInfo>;
    urls?: Array<UrlSymbolInfo>;
    error?: boolean;
    error_message?: string;
}

export interface TypeResult {
    "type": DothttpTypes;
    "target": string | null;
    "target_base": string | null;
    "base_start": number | null;
}

export enum RunType {
    binary,
    python,
    http,
    binary_from_extension,
}

export type ImportHarResult = {
    error?: boolean;
    error_message?: string;
    filename: string;
    http: string;
};


export interface ClientLaunchParams {
    version?: string;
    path: string;
    type: RunType;
    url?: string,
}
