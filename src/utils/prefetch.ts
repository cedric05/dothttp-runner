import { downloadDothttp, fetchPlatformDownloadurl, getVersion } from "./download";
import { promises as fsPromises } from "fs";
import { argv } from "process";

async function downloadLatest(platformType: NodeJS.Platform, arch: NodeJS.Architecture) {
    let versionInfo = await getVersion(false);
    console.log("versionInfo", versionInfo);
    console.log(versionInfo);
    const url = fetchPlatformDownloadurl(versionInfo, platformType, arch);
    console.log("downloading from", url);
    await downloadDothttp("./", url!, { report: console.log })
    console.log("downloaded successfully");
    if (platformType !== 'win32') {
        console.log("changing permission for linux/mac");
        await fsPromises.chmod("./cli/cli", 0o755);
    }
    console.log("done with download step");
}

const platformType = argv[2] as NodeJS.Platform;
const arch = argv[3] as NodeJS.Architecture;

console.log("prefetching");
console.log(`downloading platform=${platformType} arch=${arch}`);

downloadLatest(platformType, arch).then(() => {
    console.log("downloaded successfully");
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});