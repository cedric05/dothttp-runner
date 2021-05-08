import { LocalStorageService } from './storage';
interface Iproperties {
    key: string;
    value: string;
    enabled: boolean;
}
export interface FileInfo {
    envs: string[];
    properties: Iproperties[];
}
export interface IFileState {
    getEnv(filename: string): FileInfo["envs"];
    addEnv(filename: string, env: string): void;
    removeEnv(filename: string, env: string): void;
    hasEnv(fileName: string, env: string): boolean;
    getProperties(filename: string): FileInfo["properties"];
    addProperty(filename: string, key: string, value: string): void;
    disableProperty(filename: string, key: string, value: string): void;
    enableProperty(filename: string, key: string, value: string): void;
    removeProperty(filename: string, key: string, value: string): void;
    updateProperty(filename: string, key: string, prev_value: string, value: string): void;
}
export declare class VersionInfo {
    storage: LocalStorageService;
    private static readonly versionKey;
    constructor(storage: LocalStorageService);
    setVersionDothttpInfo(version: string): void;
    getVersionDothttpInfo(): string;
}
export declare class FileState implements IFileState {
    private static section;
    state: Map<string, FileInfo>;
    storage: LocalStorageService;
    constructor(storage: LocalStorageService);
    hasEnv(fileName: string, env: string): boolean;
    getFileInfo(filename: string): FileInfo;
    private static getFileKey;
    getEnv(filename: string): FileInfo['envs'];
    getProperties(filename: string): FileInfo['properties'];
    getProperty(filename: string, key: string): Iproperties | null;
    addEnv(filename: string, env: string): void;
    addProperty(filename: string, key: string, value: string): void;
    disableProperty(filename: string, key: string, value: string): void;
    updateProperty(filename: string, key: string, prev_value: string, value: string): void;
    enableProperty(filename: string, key: string, value: string): void;
    removeProperty(filename: string, key: string, value: string): void;
    removeEnv(filename: string, env: string): void;
    private updateFileinfo;
}
export {};
