import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { IncomingMessage } from 'http';
import * as https from 'https';
import { platform } from 'os';
import * as semver from 'semver';
import { Extract as extract } from 'unzipper';
import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';
import { Configuration } from './web/utils/config';
import { isDotHttpCorrect as isDothttpConfigured, isPythonConfigured } from "./native/utils/installUtils";
import { ApplicationServices } from './web/services/global';
import path = require('path');
import child_process = require('child_process')
import { ClientLaunchParams, RunType } from "./web/types/types";
import { Constants } from './web/utils/constants';

interface version {
    downloadUrls: {
        linux?: string,
        windows?: string,
        darwin?: string
    }
    version: string,
    versionNotes?: string,
    stable: boolean,
    latest: boolean
}

interface versionMatrix {
    [version: string]: {
        minVersion: string,
        maxVersion: string
    }
}

interface versionResponse {
    matrix: versionMatrix,
    availableversions: [version]
}



export async function getStream(api: string): Promise<IncomingMessage> {
    return new Promise<IncomingMessage>((resolve, reject) => {
        https.get(api, {}, res => resolve(res)).on('error', reject)
    });
}

export async function getJSON<T>(api: string): Promise<T> {
    return new Promise((resolve, reject) => {
        https.get(api, {}, res => {
            if (res.statusCode !== 200) {
                reject('Failed to get JSON');
            }

            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (err) {
                    console.error(`Failed to parse response from ${api} as JSON`);
                    reject(err);
                }
            });

            res.on('error', err => {
                reject(err);
            });
        });
    });
}

export async function getVersion(): Promise<version> {
    var resp = await getJSON<versionResponse>(Constants.versionApi);
    const compatibleMat = resp.matrix[Constants.EXTENSION_VERSION];
    const useUnStable = Configuration.isToUseUnStable;
    if (compatibleMat) {
        const acceptableVersions = resp.availableversions
            .filter(mat => {
                if (useUnStable) {
                    return true;
                } else {
                    return mat.stable;
                }
            })
            .filter(mat => semver.lte(compatibleMat.minVersion, mat.version)
                && semver.lte(mat.version, compatibleMat.maxVersion))
            .sort((a, b) => {
                if (semver.gte(a.version, b.version)) {
                    return -1;
                }
                return 1;
            })
        if (acceptableVersions.length === 0) {
            throw new Error('no version compatiable')
        }
        const accepted = acceptableVersions[0];
        return accepted;
    }
    throw new Error('version not available')
}

function fetchDownloadUrl(accepted: version) {
    const plat = platform();
    switch (plat) {
        case "win32":
            return accepted.downloadUrls.windows;
        case "linux":
            return accepted.downloadUrls.linux;
        case "darwin":
            return accepted.downloadUrls.darwin;
        default:
            throw new Error('un supported platform')
    }
}

async function downloadDothttp(downloadLocation: string, url: string) {
    console.log("downloading to ", downloadLocation);
    if (!fs.existsSync(downloadLocation)) {
        fs.mkdirSync(downloadLocation);
    }
    console.log(`download from url ${url}`)
    var res = await getStream(url!);
    if (res.statusCode === 302) {
        res = await getStream(res.headers.location!);
    }
    if (res.statusCode !== 200) {
        throw Error('Failed to get VS Code archive location');
    }
    console.log(`download from url ${url}`)
    var range = 20 * 1024 * 1024;
    if (res.headers['content-length']) {
        try {
            range = Number.parseFloat(res.headers['content-length'])
        } catch (_errorIgnored) { }
    }
    var contentDownloaded = 0;
    await vscode.window.withProgress({
        title: `Downloading Dothttp lannguage Server from [github](${url})`,
        cancellable: false,
        location: vscode.ProgressLocation.Notification
    }, async function (progress) {
        await new Promise((resolve, reject) => {
            res.on('data', function (data) {
                contentDownloaded += data.length;
                const increment = (data.length / range) * 100
                const totalPercent = (contentDownloaded / range) * 100
                console.log(`downloaded ${totalPercent}`)
                progress.report({ message: 'completed successfully', increment: increment })
            })
            res.pipe(extract({ path: downloadLocation }))
                .on('close', () => {
                    progress.report({ message: 'completed successfully', increment: 100 })
                    resolve(null);
                })
                .on('error', (error) => {
                    progress.report({ message: 'ran into error', increment: 100 })
                    reject(error);
                })
                ;
        });
    });
    return;
}

async function wait(time = 1000) {
    return new Promise((resolve, _reject) => {
        setTimeout(() => {
            resolve(time);
        }, time);
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
    for (const [lookupLocation, assumedPath] of Object.entries({ configureddothttpPath, workspacedothttPath, defaultPath: defaultExePath })) {
        console.log(`checking ${lookupLocation}: ${assumedPath}`);
        if (assumedPath && fs.existsSync(assumedPath)) {
            console.log(`working ${lookupLocation}: ${assumedPath}`);
            return { path: assumedPath, type: RunType.binary }
        }
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
    const acceptableVersion = await getVersion();
    const url = fetchDownloadUrl(acceptableVersion);
    await downloadDothttp(downloadLocation, url!);
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

function getExePath(downloadLocation: string) {
    switch (platform()) {
        case "win32": {
            return path.join(downloadLocation, 'cli.exe');
        }
        case "linux":
        case 'darwin': {
            return path.join(downloadLocation, 'cli');
        }
        default:
            return path.join(downloadLocation, 'cli');
    }

}

export async function updateDothttpIfAvailable(globalStorageDir: string) {
    const currentVersion: string = ApplicationServices.get().getVersionInfo()!.getVersionDothttpInfo();
    const versionData = await getVersion();
    if (semver.lt(currentVersion, versionData.version)) {
        const accepted = await vscode.window.showInformationMessage(
            'Dothttp Client New version Available', 'Upgrade', 'Cancel')
        if (accepted === 'Upgrade') {
            // ApplicationServices.get().clientHanler.close();
            if (isPythonConfigured()) {
                // using exec is better in this scenario,
                // but need to check
                await runSync(Configuration.getPath(), ["-m", "pip", "install", `dothttp-req==${versionData.version}`, '--upgrade']);
            } else if (isDothttpConfigured()) {
                const downloadLocation = path.join(globalStorageDir, `cli-${versionData.version}`);
                const url = fetchDownloadUrl(versionData)
                await downloadDothttp(downloadLocation, url!);
                const originalLocation = path.join(globalStorageDir, 'cli');
                ApplicationServices.get().getClientHandler()!.close();
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
