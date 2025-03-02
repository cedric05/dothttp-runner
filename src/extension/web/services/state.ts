import { IFileState, FileInfo, IProperties } from '../types/properties';
import { LocalStorageService } from './storage';
import { Uri } from 'vscode';
import * as vscode from 'vscode';

export class VersionInfo {
    storage: LocalStorageService;
    private static readonly versionKey = 'dotthtp-req';

    constructor(storage: LocalStorageService) {
        this.storage = storage;
    }
    setVersionDothttpInfo(version: string) {
        this.storage.setValue(VersionInfo.versionKey, version);
    }
    getVersionDothttpInfo() {
        return this.storage.getValue(VersionInfo.versionKey, '0.0.8');
    }
}


export class FileState implements IFileState {
    private static section = "files";
    private static env = "env";

    state: Map<string, FileInfo> = new Map();
    storage: LocalStorageService;

    constructor(storage: LocalStorageService) {
        this.storage = storage;
    }
    setEnvFile(file: Uri): void {
        if (file)
            this.storage.setValue(FileState.env, file.toString())
    }

    getEnvFile(): Uri | undefined {
        let envFile: string | null = this.storage.getValue(FileState.env);
        if (envFile) {
            return Uri.parse(envFile)
        }
    }

    hasEnv(fileName: Uri, env: string): boolean {
        const envs = this.getFileInfo(fileName).envs;
        if (envs.indexOf(env) > -1) {
            return true;
        } return false;
    }


    getFileInfo(filename: Uri): FileInfo {
        let key = FileState.getKeyFromUri(filename);
        if (this.state.has(key)) {
            return this.state.get(key)!
        } else {
            const value = this.storage.getValue(
                key, {
                envs: [], properties: {}
            });
            this.state.set(key, value);
            return value
        }
    }

    private static getKeyFromUri(filename: Uri): string {
        if (filename.scheme === 'vscode-notebook-cell') {
            filename = vscode.Uri.parse(filename.fsPath);
        }
        let workspace = vscode.workspace.getWorkspaceFolder(filename);
        const name = workspace?.name ?? 'empty-workspace';
        let key = `${FileState.section}.${name}`;
        return key;
    }

    getEnv(filename: Uri): FileInfo['envs'] {
        const fileinfo = this.getFileInfo(filename);
        return fileinfo.envs
    }
    getProperties(filename: Uri): IProperties {
        const fileinfo = this.getFileInfo(filename);
        return fileinfo.properties
    }
    addEnv(filename: Uri, env: string): void {
        if (env === "*") {
            return;
        }
        const fileinfo = this.getFileInfo(filename);
        const index = fileinfo.envs.indexOf(env);
        if (index > -1) {
            return;
        }
        fileinfo.envs.push(env);
        this.updateFileinfo(filename, fileinfo);
    }
    addProperty(filename: Uri, key: string, value: string, description: string): void {
        const fileinfo = this.getFileInfo(filename);
        // paying pricing for old interface design
        if (!(fileinfo.properties instanceof Object)) {
            fileinfo.properties = {};
        }

        if (!fileinfo.properties[key]) {
            fileinfo.properties[key] = [];
        }

        var propertiesAlreadyHasValue = false;
        fileinfo.properties[key].forEach(prop => {
            if (prop.value === value) {
                prop.enabled = true;
                propertiesAlreadyHasValue = true;
                prop.description = description;
                return;
            } else {
                prop.enabled = false;
            }
        })
        if (!propertiesAlreadyHasValue) {
            fileinfo.properties[key].push({
                value,
                description: description,
                enabled: true
            });
        }
        this.updateFileinfo(filename, fileinfo);
    }

    disableProperty(_filename: Uri, _key: string, _value: string) {
        // noOp
    }

    updateProperty(filename: Uri, key: string, prev_value: string, value: string): void {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.properties[key].filter(prop => prop.value === prev_value).forEach(prop => {
            prop.value = value
        })
        this.updateFileinfo(filename, fileinfo);
    }

    enableProperty(filename: Uri, key: string, value: string): void {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.properties[key].filter(prop => prop.value === value).forEach(prop => {
            prop.enabled = true;
        })
        this.updateFileinfo(filename, fileinfo);
    }

    removeProperty(filename: Uri, key: string, value: string): void {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.properties[key] = fileinfo.properties[key].filter(prop => !(prop.value === value))
        this.updateFileinfo(filename, fileinfo);
    }


    removeEnv(filename: Uri, env: string) {
        const fileinfo = this.getFileInfo(filename);
        const index = fileinfo.envs.indexOf(env);
        if (index > -1) {
            // delete just one instead of all
            fileinfo.envs.splice(index, 1);
        }
        this.updateFileinfo(filename, fileinfo);
    }

    private updateFileinfo(filename: Uri, fileinfo: FileInfo) {
        const key = FileState.getKeyFromUri(filename);
        this.storage.setValue(key, fileinfo);
        this.state.set(key, fileinfo)
    }
}