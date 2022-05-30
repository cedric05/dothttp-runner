import { FileType, Uri, workspace } from "vscode";

export async function existsSync(uri: Uri) {
    const stat = await workspace.fs.stat(uri);
    return stat ? true : false;
}

export async function isDirectory(uri: Uri) {
    const stat = await workspace.fs.stat(uri);
    return stat?.type == FileType.Directory
}