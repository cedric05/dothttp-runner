import * as vscode from 'vscode';
export interface IProperty {
    value: string,
    description: string,
    enabled: boolean
}

export interface IProperties {
    [key: string]: IProperty[]
}

export interface FileInfo {
    envs: string[];
    properties: IProperties;
}

export interface IFileState {
    getEnv(file: vscode.Uri): string[];
    addEnv(file: vscode.Uri, env: string): void;
    removeEnv(file: vscode.Uri, env: string): void;
    hasEnv(file: vscode.Uri, env: string): boolean;

    getProperties(file: vscode.Uri): IProperties;
    addProperty(file: vscode.Uri, key: string, value: string, description: string): void;
    disableProperty(file: vscode.Uri, key: string, value: string): void;
    enableProperty(file: vscode.Uri, key: string, value: string): void;
    removeProperty(file: vscode.Uri, key: string, value: string): void;
    updateProperty(file: vscode.Uri, key: string, prev_value: string, value: string): void;

    setEnvFile(file: vscode.Uri): void;
    getEnvFile(): vscode.Uri | undefined;
}
