import { platform } from "os";
import { downloadDothttp, fetchDownloadUrl, getVersion } from "./download";
import { promises as fsPromises } from "fs";

async function downloadLatest() {
    let version = await getVersion(false);
    const url = fetchDownloadUrl(version);
    await downloadDothttp("./", url!, { report: console.log })
    if (platform() !== 'win32') {
        await fsPromises.chmod("./cli/cli", 0o755);
    }
}
downloadLatest().then(() => {
    console.log("downloaded successfully");
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
})