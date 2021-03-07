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

async function getVersion() {
    // var resp = await getJSON<versionResponse>(Constants.versionApi);
    const resp: versionResponse = {
        availableversions: [{
            downloadUrls: {
                "linux": "https://github.com/cedric05/dotextensions-build/releases/download/v-0.0.8/dotextensions-0.0.8-linux.zip",
                "windows": "https://github.com/cedric05/dotextensions-build/releases/download/v-0.0.8/dotextensions-0.0.8-x86-windows.zip",
            },
            latest: false,
            stable: true,
            version: "0.0.8",
        }],
        matrix: {
            "0.0.5": {
                maxVersion: "0.0.8",
                minVersion: "0.0.8",
            }

        }

    };
    const compatibleMat = resp.matrix[Constants.extensionVersion];
    if (compatibleMat) {
        const acceptableVersions = resp.availableversions
            .filter(mat => semver.gte(compatibleMat.minVersion, mat.version)
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

async function fetchDownloadUrl() {
    const accepted = await getVersion();
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

async function downloadDothttp(downloadLocation: string) {
    if (!fs.existsSync(downloadLocation)) {
        fs.mkdirSync(downloadLocation);
    }
    const url = await fetchDownloadUrl();
    console.log(`download from url ${url}`)
    var res = await getStream(url!);
    if (res.statusCode === 302) {
        res = await getStream(res.headers.location!);
    }
    if (res.statusCode !== 200) {
        throw Error('Failed to get VS Code archive location');
    }
    return await new Promise((resolve, reject) => {
        res.pipe(extract({ path: downloadLocation }))
            .on('close', resolve)
            .on('error', reject)
    });
}

export async function setUp(context: ExtensionContext) {
    if (!isPythonConfigured() && !isDothttpConfigured()) {
        const globalStorageDir = context.globalStorageUri.fsPath;
        if (!fs.existsSync(globalStorageDir)) {
            fs.mkdirSync(globalStorageDir);
        }
        const downloadLocation = path.join(globalStorageDir, 'cli');
        await downloadDothttp(downloadLocation);
        var exePath = path.join(downloadLocation, 'cli');
        exePath = getExePath(exePath);
        Configuration.setDothttpPath(exePath)
    }
}

function getExePath(exePath: string) {
    if (platform() === 'win32') {
        exePath = path.join(exePath, 'cli.exe');
    } else if (platform() === "linux") {
        exePath = path.join(exePath, 'cli');
    }
    return exePath;
}

export async function updateDothttpIfAvailable(context: ExtensionContext) {
    const currentVersion: string = getCurrentVersion(context);
    const versionData = await getVersion();
    if (semver.gte(currentVersion, versionData.version)) {
        const accepted = await vscode.window.showInformationMessage(
            'new version available', 'upgrade', 'leave')
        if (accepted === 'upgrade') {
            ApplicationServices.get().clientHanler.close();
            if (isPythonConfigured()) {
                // using exec is better in this scenario,
                // but need to check
                child_process.spawn(Configuration.getPath(),
                    ["-m", "pip", "install", `dothttp-req==${versionData.version}`, '--upgrade'],
                    { stdio: ["pipe", "pipe", "inherit"] }
                );
            } else if (isDothttpConfigured()) {
                const globalStorageDir = context.globalStorageUri.fsPath;
                const downloadLocation = path.join(globalStorageDir, `cli-${versionData.version}`);
                await downloadDothttp(downloadLocation);
                const originalLocation = path.join(globalStorageDir, 'cli');
                fs.rmdirSync(originalLocation);
                fs.renameSync(downloadLocation, originalLocation)
                chmodSync(downloadLocation, fs.constants.S_IXOTH);
            }
            setCurrentVersion(context, versionData.version);
        }
    }
}

function getCurrentVersion(context: ExtensionContext): string {
    return context.globalState.get(Constants.dothttpVersion) as string;
}

function setCurrentVersion(context: ExtensionContext, version: string) {
    context.globalState.update(Constants.dothttpVersion, version);
}