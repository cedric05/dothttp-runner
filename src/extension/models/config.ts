import * as vscode from 'vscode';
import fs = require('fs');
import child_process = require('child_process');
import { Constants } from './constants';

function getPythonVersion(path: string): boolean {
    const sysout = child_process.execSync(`${path} --version`);
    if (sysout) {
        const versionArr = new String(sysout).trim().split(" ");
        if (versionArr.length === 2) {
            return parseFloat(versionArr[1]) >= 3.8;
        }
    }
    return false;
}

export function isPythonConfigured() {
    try {

        if (Configuration.getPath()) {
            // checking file path exists is better, but if user gives `python3` --> its not a valid path but it will work in some scenarios

            const correctPath = getPythonVersion(Configuration.getPath());
            if (correctPath) { return true; }
            const version = getPythonVersion('python3');
            if (version) {
                vscode.workspace.getConfiguration().update(Constants.pythonPath, "python3", vscode.ConfigurationTarget.Global);
                vscode.workspace.getConfiguration().update(Constants.pythonPath, "python3", vscode.ConfigurationTarget.Workspace);
                vscode.workspace.getConfiguration().update(Constants.pythonPath, "python3", vscode.ConfigurationTarget.WorkspaceFolder);
            }
            return version;
        }
    } catch (error) {
        return false;
    }
}

export function isDotHttpCorrect() {
    if (fs.existsSync(Configuration.getDothttpPath())) {
        return true;
    }
    return false;
}


// TODO
// instead of check configuration everytime, 
// keep a private copy and listener when ever property changes, update

export class Configuration {
    static getConfiguredValue(key: string) {
        if (vscode.env.remoteName) {
            return vscode.workspace.getConfiguration().get(key, vscode.ConfigurationTarget.Workspace) || vscode.workspace.getConfiguration().get(key, vscode.ConfigurationTarget.WorkspaceFolder);
        } else {
            return vscode.workspace.getConfiguration().get(key) as string;
        }
    }

    static setGlobalValue(key: string, value: string) {
        if (vscode.env.remoteName) {
            vscode.workspace.getConfiguration().update(key, value, vscode.ConfigurationTarget.Workspace);
            return vscode.workspace.getConfiguration().update(key, value, vscode.ConfigurationTarget.WorkspaceFolder);
        } else {
            return vscode.workspace.getConfiguration().update(key, value, vscode.ConfigurationTarget.Global);
        }
    }

    // isConfiguredPathCorrect?
    static getPath(): string {
        return Configuration.getConfiguredValue(Constants.pythonPath) as unknown as string;
    }

    static getDothttpPath(): string {
        return Configuration.getConfiguredValue(Constants.dothttpPath) as unknown as string;
    }

    static setDothttpPath(value: string) {
        return Configuration.setGlobalValue(Constants.dothttpPath, value);
    }

    static get isToUseUnStable() {
        return vscode.workspace.getConfiguration().get(Constants.CONFIG_DOTHTTP_USE_STABLE) as boolean;
    }


    reUseOld = false;
    runRecent = false;
    showHeaders = false;
    noCookies = false;
    isExperimental = false;
    history = true;
    configchange = vscode.workspace.onDidChangeConfiguration(() => this.update());
    pythonPath!: string;
    dothttpPath!: string;
    responseSaveDirectory!: string;


    private constructor() {
        this.preset();
    }

    preset() {
        const vsCodeconfig = vscode.workspace.getConfiguration();
        this.reUseOld = vsCodeconfig.get(Constants.reUseOldTab) as boolean;
        this.runRecent = vsCodeconfig.get(Constants.runConf) as boolean;
        this.showHeaders = vsCodeconfig.get(Constants.showheaders) as boolean;
        this.noCookies = vsCodeconfig.get(Constants.nocookie) as boolean
        this.pythonPath = vsCodeconfig.get(Constants.pythonPath) as string;
        this.dothttpPath = vsCodeconfig.get(Constants.dothttpPath) as string;
        this.responseSaveDirectory = vsCodeconfig.get(Constants.responseDirectory) as string;
        this.history = vsCodeconfig.get(Constants.history) as boolean;
    }

    public update() {
        this.preset();
    }


    private static _config: Configuration;
    static instance() {
        if (Configuration._config) {
            return Configuration._config;
        }
        Configuration._config = new Configuration();
        return Configuration._config;
    }

}