import * as vscode from 'vscode';
import fs = require('fs');
import child_process = require('child_process');
import { Configuration } from '../../web/utils/config';
import { Constants } from '../../web/utils/constants';
import * as semver from 'semver';


function getPythonVersion(path: string): boolean {
    var sysout = child_process.execSync(`${path} --version`);
    if (!sysout) {
        return false;
    }
    var versionArr = new String(sysout).trim().split(" ");
    if (versionArr.length !== 2) {
        return false;
    }
    if (semver.lt(versionArr[1], "3.8.0")) {
        return false;
    }
    sysout = child_process.execSync(`${path} -m dotextensions.version`);
    return true;
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
