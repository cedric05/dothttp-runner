import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { platform } from 'os';
import * as semver from 'semver';
import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';
import { Configuration } from './web/utils/config';
import { isPythonConfigured } from "./native/utils/installUtils";
import { ApplicationServices } from './web/services/global';
import path = require('path');
import child_process = require('child_process')
import { ClientLaunchParams, RunType } from "./web/types/types";
import { Constants } from './web/utils/constants';
import { downloadDothttp, fetchDownloadUrl, getVersion } from '../utils/download';


async function downloadDothttpWithProgress(downloadLocation: string, url: string,) {
    await vscode.window.withProgress({
        title: `Downloading Dothttp lannguage Server from [github](${url})`,
        cancellable: false,
        location: vscode.ProgressLocation.Notification
    }, async function (progress) {
        await downloadDothttp(downloadLocation, url!, progress);
    });
}


export async function getLaunchArgs(context: ExtensionContext): Promise<ClientLaunchParams> {
    const configureddothttpPath = Configuration.getDothttpPath();
    const workspacedothttPath = context.workspaceState.get(Constants.dothttpPath) as string;
    const globalStorageDir = context.globalStorageUri.fsPath;
    const downloadLocation = path.join(globalStorageDir, 'cli');
    const defaultExePath = getExePath(path.join(downloadLocation, 'cli'));
    if (isPythonConfigured()) {
        const pythonPath = Configuration.getPath();
        return { path: pythonPath, type: RunType.python }
    }
    const cliWithExtension = vscode.Uri.joinPath(
        context.extensionUri,
        "cli",
        getCliWithExtension(),
    ).fsPath;

    // Priority 1: explicit user config.
    if (configureddothttpPath && fs.existsSync(configureddothttpPath)) {
        console.log(`using configured dothttp path: ${configureddothttpPath}`);
        return { path: configureddothttpPath, type: RunType.binary };
    }

    // Priority 2: pick the newest among extension-bundled, workspace, and globally downloaded binaries.
    // Binary layout is <root>/cli/<binary> with version.json at <root>/cli/version.json,
    // so readInstalledVersion expects the <root> dir (one level above the cli/ subdir).
    type Candidate = { path: string; version: string | undefined; type: RunType };
    const candidates: Candidate[] = [];

    if (fs.existsSync(cliWithExtension)) {
        candidates.push({
            path: cliWithExtension,
            version: readInstalledVersion(path.dirname(path.dirname(cliWithExtension)))?.version,
            type: RunType.binary_from_extension,
        });
    }
    if (workspacedothttPath && fs.existsSync(workspacedothttPath)) {
        candidates.push({
            path: workspacedothttPath,
            version: readInstalledVersion(path.dirname(path.dirname(workspacedothttPath)))?.version,
            type: RunType.binary,
        });
    }
    if (fs.existsSync(defaultExePath)) {
        candidates.push({
            path: defaultExePath,
            version: readInstalledVersion(downloadLocation)?.version,
            type: RunType.binary,
        });
    }

    if (candidates.length > 0) {
        // Versioned candidates are ranked by semver; those without version.json keep their
        // insertion order (extension-bundled first) and lose to any versioned candidate.
        const versioned = candidates.filter(c => c.version);
        const best = versioned.length > 0
            ? versioned.reduce((a, b) => compareCliVersions(a.version, b.version) >= 0 ? a : b)
            : candidates[0];
        console.log(`selected cli ${best.path} version ${best.version}`);
        return { version: best.version, path: best.path, type: best.type };
    }
    console.log('no installation found, will download and install');
    try {
        if (fs.existsSync(downloadLocation)) {
            await fsPromises.rm(downloadLocation, { recursive: true })
        }
    } catch (ignored) {
        console.error(ignored);
    }
    context.globalState.update("dothttp.downloadContentCompleted", false)
    console.log('download directory ', downloadLocation);
    const acceptableVersion = await getVersion(Configuration.isToUseUnStable);
    const url = fetchDownloadUrl(acceptableVersion);
    await downloadDothttpWithProgress(downloadLocation, url!);
    if (platform() !== 'win32') {
        await fsPromises.chmod(defaultExePath, 0o755);
    }
    console.log('download successfull ', downloadLocation);
    Configuration.setDothttpPath(defaultExePath)
    console.log('dothttp path set to', defaultExePath);
    context.globalState.update("dothttp.downloadContentCompleted", true);
    context.workspaceState.update('dothttp.conf.path', defaultExePath);
    return { version: acceptableVersion.version, path: defaultExePath, type: RunType.binary }
}

// Compares two cli version strings using Python PEP 440 format (e.g. "0.0.44a33").
// Converts to semver pre-release notation ("0.0.44-a.33") so semver handles comparison natively.
// Returns positive if a > b, negative if a < b, 0 if equal.
function compareCliVersions(a: string | undefined, b: string | undefined): number {
    const toSemver = (v: string | undefined) =>
        semver.coerce(v?.replace(/(\d)(a|b|rc)(\d)/, '$1-$2.$3')) ?? new semver.SemVer('0.0.0');
    return semver.compare(toSemver(a), toSemver(b));
}

export interface InstalledVersionInfo {
    version: string;
    dothttp_req: string;
    python: string;
    pyinstaller: string;
    platform: string;
    runner_os: string;
    runner_arch: string;
    build_id: string;
    build_number: string;
    commit: string;
    source: string;
}

export function readInstalledVersion(downloadLocation: string): InstalledVersionInfo | undefined {
    const versionFile = path.join(downloadLocation, 'cli', 'version.json');
    try {
        const raw = fs.readFileSync(versionFile, 'utf8');
        return JSON.parse(raw) as InstalledVersionInfo;
    } catch {
        return undefined;
    }
}

function getExePath(downloadLocation: string) {
    return path.join(downloadLocation, getCliWithExtension())
}

function getCliWithExtension() {
    switch (platform()) {
        case "win32": {
            return 'cli.exe'
        }
        case "linux":
        case 'darwin': {
            return 'cli'
        }
        default:
            return 'cli'
    }
}

export async function updateDothttpIfAvailable(globalStorageDir: string) {
    const currentVersion: string = ApplicationServices.get().getVersionInfo()!.getVersionDothttpInfo();
    const versionData = await getVersion(Configuration.isToUseUnStable);
    if (semver.lt(currentVersion, versionData.version)) {
        const accepted = await vscode.window.showInformationMessage(
            'Dothttp Client New version Available', 'Upgrade', 'Cancel')
        if (accepted === 'Upgrade') {
            // ApplicationServices.get().clientHanler.close();
            if (isPythonConfigured()) {
                // using exec is better in this scenario,
                // but need to check
                await runSync(Configuration.getPath(), ["-m", "pip", "install", `dothttp-req==${versionData.version}`, '--upgrade']);
            } else {
                const downloadLocation = path.join(globalStorageDir, `cli-${versionData.version}`);
                const url = fetchDownloadUrl(versionData)
                await downloadDothttpWithProgress(downloadLocation, url!);
                const originalLocation = path.join(globalStorageDir, 'cli');
                ApplicationServices.get().getClientHandler()?.close();
                fs.rmdirSync(originalLocation, { recursive: true });
                fs.renameSync(downloadLocation, originalLocation)
                const location = getExePath(path.join(originalLocation, 'cli'));
                if (platform() !== 'win32') {
                    fs.chmodSync(location, 0o755);
                }
            }
            ApplicationServices.get().getVersionInfo()!.setVersionDothttpInfo(versionData.version);
            vscode.window.showInformationMessage('dothttp upgrade completed')
            vscode.commands.executeCommand(Constants.RESTART_CLI_COMMAND);
        }
    }
}

export async function runSync(path: string, args: Array<string>) {
    return new Promise<void>((_resolve, _reject) => {
        const proc = child_process.spawn(path,
            args
        );
        proc.stdout.on('data', (data) => console.log(new String(data)));
        proc.stderr.on('data', (data) => console.error(new String(data)));
        proc.on('exit', function () {
            _resolve();
        })
    })

}
