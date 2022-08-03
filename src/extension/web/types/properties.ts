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
    getEnv(filename: string): string[];
    addEnv(filename: string, env: string): void;
    removeEnv(filename: string, env: string): void;
    hasEnv(fileName: string, env: string): boolean;

    getProperties(filename: string): Iproperties[];
    addProperty(filename: string, key: string, value: string): void;
    disableProperty(filename: string, key: string, value: string): void;
    enableProperty(filename: string, key: string, value: string): void;
    removeProperty(filename: string, key: string, value: string): void;
    updateProperty(filename: string, key: string, prev_value: string, value: string): void;

}
