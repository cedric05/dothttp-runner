import { LocalStorageService } from './storage';

interface Iproperties {
    key: string,
    value: string,
    enabled: boolean
}
export interface FileInfo {
    envs: string[];
    properties: Iproperties[];
}

export interface IFileState {
    getEnv(filename: string): FileInfo["envs"]
    addEnv(filename: string, env: string): void
    removeEnv(filename: string, env: string): void
    hasEnv(fileName: string, env: string): boolean;

    getProperties(filename: string): FileInfo["properties"]
    addProperty(filename: string, key: string, value: string): void
    disableProperty(filename: string, key: string, value: string): void
    enableProperty(filename: string, key: string, value: string): void
    removeProperty(filename: string, key: string, value: string): void
    updateProperty(filename: string, key: string, prev_value: string, value: string): void

}


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
            const value = this.storage.getValue(
                FileState.getFileKey(filename), {
                envs: [], properties: []
            });
            this.state.set(filename, value);
            return value
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
        const filtered = this.getProperties(filename).filter(prop => prop.key === key)
        if (filtered.length === 1) {
            return filtered[0];
        }
        return null;
    }
    addEnv(filename: string, env: string): void {
        if (env === "*"){
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
    addProperty(filename: string, key: string, value: string): void {
        const fileinfo = this.getFileInfo(filename);
        // paying pricing for old interface design
        if (!(fileinfo.properties instanceof Array)) {
            fileinfo.properties = [];
        }
        if (fileinfo.properties
            .filter(prop => prop.key === key && prop.value === value)
            .length !== 0) {
            // already added
            return;
        }
        fileinfo.properties.push({
            key,
            value,
            enabled: true
        });
        this.updateFileinfo(filename, fileinfo);
    }

    disableProperty(filename: string, key: string, value: string) {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.properties.filter(prop => prop.key === key && prop.value === value).forEach(prop => {
            prop.enabled = false;
        })
        this.updateFileinfo(filename, fileinfo);
    }

    updateProperty(filename: string, key: string, prev_value: string, value: string): void {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.properties.filter(prop => prop.key === key && prop.value === prev_value).forEach(prop => {
            prop.value = value
        })
        this.updateFileinfo(filename, fileinfo);
    }

    enableProperty(filename: string, key: string, value: string): void {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.properties.filter(prop => prop.key === key && prop.value === value).forEach(prop => {
            prop.enabled = true;
        })
        this.updateFileinfo(filename, fileinfo);
    }

    removeProperty(filename: string, key: string, value: string): void {
        const fileinfo = this.getFileInfo(filename);
        fileinfo.properties = fileinfo.properties.filter(prop => !(prop.key === key && prop.value === value))
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
        fileinfo.properties = fileinfo.properties.sort(function (a, b) {
            if (a.key < b.key) {
                return -1;
            } else if (a.key > b.key) {
                return 1;
            }
            return 0;
        })
        this.state.set(filename, fileinfo)
    }
}