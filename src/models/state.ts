import * as vscode from 'vscode';



export class FileState {
    private static _states: { [propName: string]: FileState } = {};

    filename: string;
    envs: Set<string> = new Set();
    propertys: { [propName: string]: string } = {};

    private constructor(filename: string) {
        this.filename = filename;
    }

    static getState() {
        const filename = vscode.window.activeTextEditor?.document.fileName;
        if (filename) {
            var fileState = FileState._states[filename];
            if (fileState) {
                return fileState;
            } else {
                fileState = new FileState(filename);
                FileState._states[filename] = fileState;
                return fileState;
            }
        }
    }

    static enableEnv(env: string) {
        this.getState()?.enableEnv(env);
    }

    static disableEnv(env: string) {
        this.getState()?.disableEnv(env);
    }

    static addProperty(key: string, value: string) {
        this.getState()?.addProperty(key, value);
    }

    disableEnv(env: string) {
        this.envs.delete(env);
    }
    enableEnv(env: string) {
        this.envs.add(env);
    }

    addProperty(key: string, value: string) {
        this.propertys[key] = value;
    }

}