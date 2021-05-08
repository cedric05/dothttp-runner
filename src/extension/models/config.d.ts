import * as vscode from 'vscode';
export declare function isPythonConfigured(): boolean | undefined;
export declare function isDotHttpCorrect(): boolean;
export declare class Configuration {
    static getConfiguredValue(key: string): unknown;
    static setGlobalValue(key: string, value: string): Thenable<void>;
    static getPath(): string;
    static getDothttpPath(): string;
    static setDothttpPath(value: string): Thenable<void>;
    reUseOld: boolean;
    runRecent: boolean;
    showHeaders: boolean;
    noCookies: boolean;
    isExperimental: boolean;
    configchange: vscode.Disposable;
    pythonPath: string;
    dothttpPath: string;
    responseSaveDirectory: string;
    private constructor();
    preset(): void;
    update(): void;
    private static _config;
    static instance(): Configuration;
}
