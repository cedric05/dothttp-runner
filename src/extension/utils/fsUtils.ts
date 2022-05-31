import { FileType, Uri, workspace } from "vscode";

export async function fsExists(uri: Uri) {
    const stat = await workspace.fs.stat(uri);
    return stat ? true : false;
}

export async function read(uri: Uri) {
    const stat = await workspace.fs.readFile(uri);
    // @ts-expect-error
    return new TextDecoder().decode(stat);
}


export async function isDirectory(uri: Uri) {
    const stat = await workspace.fs.stat(uri);
    return stat?.type == FileType.Directory
}