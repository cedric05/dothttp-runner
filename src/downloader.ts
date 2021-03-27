import * as fs from 'fs';
import { chmodSync } from 'fs';
import { IncomingMessage } from 'http';
import * as https from 'https';
import { platform } from 'os';
import * as semver from 'semver';
import { Extract as extract } from 'unzipper';
import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';
import { Configuration, isDotHttpCorrect as isDothttpConfigured, isPythonConfigured } from './models/config';
import { Constants } from './models/constants';
import { ApplicationServices } from './services/global';
import path = require('path');
import child_process = require('child_process')

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
    const compatibleMat = resp.matrix[Constants.extensionVersion];
    if (compatibleMat) {
        const acceptableVersions = resp.availableversions
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
    if (res.headers.range) {
        try {
            range = Number.parseFloat(res.headers.range)
        } catch (_errorIgnored) { }
    }
    var contentDownloaded = 0;
    await vscode.window.withProgress({
        title: `downloading binaries from ${url}`,
        cancellable: false,
        location: vscode.ProgressLocation.Window
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
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(time);
        }, time);
    });
}


export async function setUp(context: ExtensionContext) {
    const dothttpConfigured = isDothttpConfigured();
    const pythonConfigured = isPythonConfigured();
    if (!pythonConfigured && !dothttpConfigured) {
        console.log('dothttpConfigured', dothttpConfigured);
        console.log('pythonConfigured', pythonConfigured);
        const globalStorageDir = context.globalStorageUri.fsPath;
        if (!fs.existsSync(globalStorageDir)) {
            fs.mkdirSync(globalStorageDir);
            console.log('making global storage directory ', globalStorageDir);
        }
        const downloadLocation = path.join(globalStorageDir, 'cli');
        if (context.globalState.get("dothttp.downloadContentCompleted", false)) {
            if (fs.existsSync(downloadLocation)) {
                fs.rmdirSync(downloadLocation);
            }
        }
        console.log('download directory ', downloadLocation);
        const acceptableVersion = await getVersion();
        const url = fetchDownloadUrl(acceptableVersion);
        await downloadDothttp(downloadLocation, url!);
        console.log('download successfull ', downloadLocation);
        var exePath = path.join(downloadLocation, 'cli');
        exePath = getExePath(exePath);
        Configuration.setDothttpPath(exePath)
        console.log('dothttp path set to', exePath);
        context.globalState.update("dothttp.downloadContentCompleted", true);
        await wait(4000);
        return acceptableVersion.version;
    }
}

function getExePath(exePath: string) {
    if (platform() === 'win32') {
        exePath = path.join(exePath, 'cli.exe');
    } else if (platform() === "linux") {
        exePath = path.join(exePath, 'cli');
        fs.chmodSync(exePath, 0o755);
    }
    return exePath;
}

export async function updateDothttpIfAvailable(globalStorageDir: string) {
    const currentVersion: string = ApplicationServices.get().getVersionInfo().getVersionDothttpInfo();
    const versionData = await getVersion();
    if (semver.lt(currentVersion, versionData.version)) {
        const accepted = await vscode.window.showInformationMessage(
            'new version available', 'upgrade', 'leave')
        if (accepted === 'upgrade') {
            // ApplicationServices.get().clientHanler.close();
            if (isPythonConfigured()) {
                // using exec is better in this scenario,
                // but need to check
                child_process.spawn(Configuration.getPath(),
                    ["-m", "pip", "install", `dothttp-req==${versionData.version}`, '--upgrade'],
                    { stdio: ["pipe", "pipe", "inherit"] }
                );
            } else if (isDothttpConfigured()) {
                const downloadLocation = path.join(globalStorageDir, `cli-${versionData.version}`);
                const url = fetchDownloadUrl(versionData)
                await downloadDothttp(downloadLocation, url!);
                const originalLocation = path.join(globalStorageDir, 'cli');
                ApplicationServices.get().clientHanler.close();
                fs.rmdirSync(originalLocation, { recursive: true });
                fs.renameSync(downloadLocation, originalLocation)
                getExePath(path.join(originalLocation, 'cli'));
            }
            ApplicationServices.get().getVersionInfo().setVersionDothttpInfo(versionData.version);
            const shouldReload = await vscode.window.showInformationMessage(
                'dothttp upgrade completed, reload to view latest updates', 'reload', 'leave')
            if (shouldReload === 'reload') {
                vscode.commands.executeCommand(
                    'workbench.action.reloadWindow',
                );
            }
        }
    }
}