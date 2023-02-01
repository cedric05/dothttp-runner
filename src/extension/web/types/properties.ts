import * as vscode from 'vscode';
export interface Iproperties {
    key: string;
    value: string;
    enabled: boolean;
}
export interface FileInfo {
    envs: string[];
    properties: Iproperties[];
}

export interface IFileState {
    getEnv(file: vscode.Uri): string[];
    addEnv(file: vscode.Uri, env: string): void;
    removeEnv(file: vscode.Uri, env: string): void;
    hasEnv(file: vscode.Uri, env: string): boolean;

    getProperties(file: vscode.Uri): Iproperties[];
    addProperty(file: vscode.Uri, key: string, value: string): void;
    disableProperty(file: vscode.Uri, key: string, value: string): void;
    enableProperty(file: vscode.Uri, key: string, value: string): void;
    removeProperty(file: vscode.Uri, key: string, value: string): void;
    updateProperty(file: vscode.Uri, key: string, prev_value: string, value: string): void;

    setEnvFile(file: vscode.Uri): void;
    getEnvFile(): vscode.Uri | undefined;
}
