import { LocalStorageService } from './storage';

export interface FileInfo {
    envs: Set<string>;
    properties: Map<string, string>;
}

export interface IFileState {
    getEnv(filename: string): FileInfo["envs"]
    getProperties(filename: string): FileInfo["properties"]
    addEnv(filename: string, env: string): void
    addProperty(filename: string, key: string, value: string): void
    removeProperty(filename: string, key: string): void
    removeEnv(filename: string, env: string): void
}


export class FileState implements IFileState {
    private static section = "files";

    state: Map<string, FileInfo> = new Map();
    storage: LocalStorageService;

    constructor(storage: LocalStorageService) {
        this.storage = storage;
    }

    getFileInfo(filename: string): FileInfo {
        if (this.state.has(filename)) {
            return this.state.get(filename)!
        } else {
            return this.storage.getValue(
                FileState.getFileKey(filename), { envs: new Set(), properties: new Map() })
        }
    }

    private static getFileKey(filename: string): string {
        return `${FileState.section}.${filename}`;
    }

    getEnv(filename: string): Set<string> {
        const fileinfo = this.getFileInfo(filename);
        return fileinfo.envs
    }
    getProperties(filename: string): Map<string, string> {
        const fileinfo = this.getFileInfo(filename);
        return fileinfo.properties
    }
    getProperty(filename: string, key: string) {
        return this.getProperties(filename).get(key);
    }
    addEnv(filename: string, env: string): void {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.envs.add(env);
        this.updateFileinfo(filename, fileinfo);
    }
    addProperty(filename: string, key: string, value: string): void {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.properties.set(key, value);
        this.updateFileinfo(filename, fileinfo);
    }

    removeProperty(filename: string, key: string) {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.properties.delete(key);
        this.updateFileinfo(filename, fileinfo);
    }

    removeEnv(filename: string, env: string) {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.envs.delete(env);
        this.updateFileinfo(filename, fileinfo);
    }

    private updateFileinfo(filename: string, fileinfo: FileInfo) {
        this.storage.setValue(FileState.getFileKey(filename), fileinfo);
    }
}