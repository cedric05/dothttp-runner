import * as fs from 'fs';
import { IncomingMessage } from 'http';
import * as https from 'https';
import { platform, arch } from 'os';
import * as semver from 'semver';
import { Extract as extract } from 'unzipper';
import { Constants, EXTENSION_VERSION } from '../extension/web/utils/constants';

export interface version {
    downloadUrls: {
        linux?: string,
        linux_arm64: string,
        linux_amd64: string,
        windows?: string,
        darwin?: string
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
    const compatibleMat = resp.matrix[EXTENSION_VERSION];
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
    throw new Error('Version Not Registered')
}

export function fetchDownloadUrl(accepted: version) {
    switch (platform()) {
        case "win32":
            return accepted.downloadUrls.windows;
        case "linux":
            {
                switch (arch()) {
                    case "arm64":
                        return accepted.downloadUrls.linux_arm64;
                    case "x64":
                        return accepted.downloadUrls.linux_amd64 ?? accepted.downloadUrls.linux;
                    default:
                        throw new Error('un supported platform')
                }
            }
        case "darwin":
            return accepted.downloadUrls.darwin;
        default:
            throw new Error('un supported platform')
    }
}
export interface Progress {
    report(val: { message: string, increment: number }): void;
}

export async function downloadDothttp(downloadLocation: string, url: string, progress: Progress) {
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
    return;
}

