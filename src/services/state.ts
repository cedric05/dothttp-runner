import { LocalStorageService } from './storage';

export interface FileInfo {
    envs: string[];
    properties: { [prop: string]: string };
}

export interface IFileState {
    getEnv(filename: string): FileInfo["envs"]
    getProperties(filename: string): FileInfo["properties"]
    addEnv(filename: string, env: string): void
    addProperty(filename: string, key: string, value: string): void
    removeProperty(filename: string, key: string): void
    removeEnv(filename: string, env: string): void
    hasEnv(fileName: string, env: string): boolean;
}


export class FileState implements IFileState {
    private static section = "files";

    state: Map<string, FileInfo> = new Map();
    storage: LocalStorageService;

    constructor(storage: LocalStorageService) {
        this.storage = storage;
    }
    hasEnv(fileName: string, env: string): boolean {
        const envs = this.getFileInfo(fileName).envs;
        if (envs.indexOf(env) > -1) {
            return true;
        } return false;
    }


    getFileInfo(filename: string): FileInfo {
        if (this.state.has(filename)) {
            return this.state.get(filename)!
        } else {
            return this.storage.getValue(
                FileState.getFileKey(filename), { envs: [], properties: {} })
        }
    }

    private static getFileKey(filename: string): string {
        return `${FileState.section}.${filename}`;
    }

    getEnv(filename: string): FileInfo['envs'] {
        const fileinfo = this.getFileInfo(filename);
        return fileinfo.envs
    }
    getProperties(filename: string): FileInfo['properties'] {
        const fileinfo = this.getFileInfo(filename);
        return fileinfo.properties
    }
    getProperty(filename: string, key: string) {
        return this.getProperties(filename)[key];
    }
    addEnv(filename: string, env: string): void {
        const fileinfo = this.getFileInfo(filename);
        const index = fileinfo.envs.indexOf(env);
        if (index > -1) {
            return;
        }
        fileinfo.envs.push(env);
        this.updateFileinfo(filename, fileinfo);
    }
    addProperty(filename: string, key: string, value: string): void {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.properties[key] = value;
        this.updateFileinfo(filename, fileinfo);
    }

    removeProperty(filename: string, key: string) {
        const fileinfo = this.getFileInfo(filename);
        delete fileinfo.properties[key];
        this.updateFileinfo(filename, fileinfo);
    }

    removeEnv(filename: string, env: string) {
        const fileinfo = this.getFileInfo(filename);
        const index = fileinfo.envs.indexOf(env);
        if (index > -1) {
            fileinfo.envs.splice(index);
        }
        this.updateFileinfo(filename, fileinfo);
    }

    private updateFileinfo(filename: string, fileinfo: FileInfo) {
        this.storage.setValue(FileState.getFileKey(filename), fileinfo);
    }
}