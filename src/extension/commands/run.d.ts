import * as vscode from 'vscode';
export declare function importRequests(): Promise<void>;
export declare function runFileCommand(...arr: any[]): Promise<void>;
export declare function genCurlCommand(...arr: any[]): Promise<void>;
export declare function cacheAndGetTarget(arr: any[]): Promise<any>;
export declare function runHttpFileWithOptions(options: {
    curl: boolean;
    target: string;
}): Promise<void>;
export declare function addHistory(out: any, filename: string, options: {
    target: string;
}): void;
export declare function showEditor(textDoc: vscode.TextDocument, scriptContent: string, column?: number): void;
