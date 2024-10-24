import { downloadDothttp, fetchPlatformDownloadurl, getVersion } from "./download";
import { promises as fsPromises } from "fs";
import { argv } from "process";

async function downloadLatest(platformType: NodeJS.Platform, arch: NodeJS.Architecture) {
    let version = await getVersion(false);
    const url = fetchPlatformDownloadurl(version, platformType, arch);
    await downloadDothttp("./", url!, { report: console.log })
    if (platformType !== 'win32') {
        await fsPromises.chmod("./cli/cli", 0o755);
    }
}

const platformType = argv[2] as NodeJS.Platform;
const arch = argv[3] as NodeJS.Architecture;

downloadLatest(platformType, arch).then(() => {
    console.log("downloaded successfully");
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
})