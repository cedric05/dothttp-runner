import * as vscode from 'vscode';
import fs = require('fs');
import child_process = require('child_process');

export enum ConfigVars {
    pythonPath = "dothttp.conf.pythonpath",
    dothttpPath = "dothttp.conf.path",
    experimental = "dothttp.conf.experimental",
    nocookie = "dothttp.conf.nocookie",
    history = "dothttp.conf.history",
    curl = "dothttp.conf.curl",
}


function getPythonVersion(path: string): boolean {
    const sysout = child_process.execSync(`${path} --version`);
    if (sysout) {
        const versionArr = new String(sysout).trim().split(" ");
        if (versionArr.length === 2) {
            return parseFloat(versionArr[1]) >= 3.9;
        }
    }
    return false;
}

export function isPythonConfigured() {
    if (Configuration.getPath()) {
        // checking file path exists is better, but if user gives `python3` --> its not a valid path but it will work in some scenarios

        const correctPath = getPythonVersion(Configuration.getPath());
        if (correctPath) { return true; }
        const version = getPythonVersion('python3');
        if (version) {
            vscode.workspace.getConfiguration().update(ConfigVars.pythonPath, "python3", vscode.ConfigurationTarget.Global);
            vscode.workspace.getConfiguration().update(ConfigVars.pythonPath, "python3", vscode.ConfigurationTarget.Workspace);
            vscode.workspace.getConfiguration().update(ConfigVars.pythonPath, "python3", vscode.ConfigurationTarget.WorkspaceFolder);
        }
        return version;
    }
    return false;
}

export function isDotHttpCorrect() {
    if (Configuration.getDothttpPath()) {
        if (fs.existsSync(Configuration.getPath())) {
            return true;
        }
    }
    return false;
}

export class Configuration {

    static getConfiguredValue(key: string) {
        return vscode.workspace.getConfiguration().get(key);
    }

    // isConfiguredPathCorrect?
    static getPath(): string {
        return Configuration.getConfiguredValue(ConfigVars.pythonPath) as unknown as string;
    }

    static getDothttpPath(): string {
        return Configuration.getConfiguredValue(ConfigVars.dothttpPath) as unknown as string;
    }

    static isExperimental(): boolean {
        return Configuration.getConfiguredValue(ConfigVars.experimental) as unknown as boolean;
    }

    static isCookiesNotEnabled(): boolean {
        return Configuration.getConfiguredValue(ConfigVars.nocookie) as unknown as boolean;
    }

    static isHistoryEnabled(): boolean {
        return Configuration.getConfiguredValue(ConfigVars.history) as unknown as boolean;
    }

    static isCurlEnabled(): boolean {
        return Configuration.getConfiguredValue(ConfigVars.curl) as unknown as boolean;
    }

}