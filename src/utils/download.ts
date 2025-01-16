import * as fs from 'fs';
import { IncomingMessage } from 'http';
import * as https from 'https';
import { platform, arch } from 'os';
import * as semver from 'semver';
import { Constants, EXTENSION_VERSION } from '../extension/web/utils/constants';
import * as yauzl from 'yauzl';
import { file } from 'tmp-promise'
import path = require('node:path');


export interface version {
    downloadUrls: {
        linux?: string,
        linux_arm64: string,
        linux_amd64: string,
        windows?: string,
        darwin: string,
        darwin_arm64?: string
        darwin_amd64?: string
    }
    version: string,
    versionNotes?: string,
    stable: boolean,
    latest: boolean
}

export interface versionMatrix {
    [version: string]: {
        minVersion: string,
        maxVersion: string
    }
}

export interface versionResponse {
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

export async function getVersion(useUnStable: boolean): Promise<version> {
    var resp = await getJSON<versionResponse>(Constants.versionApi);
    console.log('response', resp);
    const compatibleMat = resp.matrix[EXTENSION_VERSION];
    console.log("Extension version", EXTENSION_VERSION);
    console.log("compatibleMat", resp.matrix[EXTENSION_VERSION]);
    if (compatibleMat) {
        const acceptableVersions = resp.availableversions
            .filter(mat => {
                if (useUnStable) {
                    return true;
                } else {
                    return mat.stable;
                }
            })
            .filter(versionInfo => semver.lte(compatibleMat.minVersion, versionInfo.version)
                && semver.lte(versionInfo.version, compatibleMat.maxVersion))
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
    throw new Error('Version Not Registered')
}

export function fetchPlatformDownloadurl(accepted: version, platform: NodeJS.Platform, arch: NodeJS.Architecture){
    switch (platform) {
        case "win32":
            return accepted.downloadUrls.windows;
        case "linux":
            {
                switch (arch) {
                    case "arm64":
                        return accepted.downloadUrls.linux_arm64;
                    case "x64":
                        return accepted.downloadUrls.linux_amd64 ?? accepted.downloadUrls.linux;
                    default:
                        throw new Error('un supported platform')
                }
            }
        case "darwin":{
            switch (arch) {
                case "arm64":
                    return accepted.downloadUrls.darwin_arm64 ?? accepted.downloadUrls.darwin;
                case "x64":
                    return accepted.downloadUrls.darwin_amd64 ?? accepted.downloadUrls.darwin;
                default:
                    throw new Error('un supported platform')
            }
        }
        default:
            throw new Error('un supported platform')
    }
}

export function fetchDownloadUrl(accepted: version) {
    return fetchPlatformDownloadurl(accepted, platform(), arch() as NodeJS.Architecture);
}
export interface Progress {
    report(val: { message: string, increment: number }): void;
}

async function unzip(packagePath: string, outputPath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		// using yauzl to unzip the file
        yauzl.open(packagePath, { lazyEntries: true }, (err, zipfile) => {
            if (err) {
                reject(err);
                return;
            }
            if (!zipfile) {
                reject(new Error('No zipfile'));
                return;
            }
            zipfile.readEntry();
            zipfile.on('entry', (entry) => {
                if (/\/$/.test(entry.fileName)) {
                    zipfile.readEntry();
                } else {
                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (!readStream) {
                            reject(new Error('No readStream'));
                            return;
                        }
                        readStream.on('end', () => {
                            zipfile.readEntry();
                        });

                        const filePath = path.join(outputPath, entry.fileName);
						fs.mkdirSync(path.dirname(filePath), { recursive: true });
                        const writeStream = fs.createWriteStream(filePath);
                        readStream.pipe(writeStream);
                    });
                }
            });
            zipfile.on('end', () => {
                resolve(outputPath);
            });
        });
	});
}

export async function downloadDothttp(downloadLocation: string, url: string, progress: Progress) {
    console.log("downloading to ", downloadLocation);
    if (!fs.existsSync(downloadLocation)) {
        fs.mkdirSync(downloadLocation);
    }
    console.log(`download from url ${url}`)
    const {fd, path: tempPath, cleanup} = await file();
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

    await new Promise((resolve, _reject) => {
        res.on('data', function (data) {
            contentDownloaded += data.length;
            const increment = (data.length / range) * 100
            const totalPercent = (contentDownloaded / range) * 100
            console.log(`downloaded ${totalPercent}`)
            progress.report({ message: 'completed successfully', increment: increment })
            fs.writeSync(fd, data);
        })
        res.on("end", async function(){
            resolve(null);
        })
    });
    console.log(`temp path is ${tempPath}`);
    await unzip(tempPath, downloadLocation);
    await cleanup();
    return;
}

