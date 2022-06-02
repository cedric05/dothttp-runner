import { FileType, Uri, workspace } from "vscode";
import { Utils } from 'vscode-uri';

export async function fsExists(uri: Uri) {
    try {
        const stat = await workspace.fs.stat(uri);
        return stat ? true : false;
    } catch (error) {
        return false;
    }
}

export async function read(uri: Uri) {
    const stat = await workspace.fs.readFile(uri);
    // @ts-expect-error
    return new TextDecoder().decode(stat);
}


export async function isDirectory(uri: Uri) {
    try {
        const stat = await workspace.fs.stat(uri);
        return stat?.type == FileType.Directory
    } catch (error) {
        return false;
    }
}


export async function writeFile(uri: Uri, s: string) {
    // @ts-expect-error
    await workspace.fs.writeFile(uri, new TextEncoder().encode(s));
}

export async function getUnSavedUri(uri: Uri) {

    if (!fsExists(uri)) {
        return uri;
    }
    const baseName = Utils.basename(uri);
    const dir = Utils.dirname(uri);
    const indexStart = baseName.indexOf('.');
    const fileNameWithOutExt = baseName.substr(0, indexStart);
    const ext = baseName.substr(indexStart);
    var i = 0;
    while (await fsExists(Utils.joinPath(dir, `${fileNameWithOutExt} (${i})${ext}`))) {
        i++;
    }
    return Utils.joinPath(dir, `${fileNameWithOutExt} (${i})${ext}`);
}



// copied from 
// https://stackoverflow.com/a/57625661
export const cleanEmpty: any = (obj: any) => {
    if (Array.isArray(obj)) {
        return obj
            .map(v => (v && typeof v === 'object') ? cleanEmpty(v) : v)
            .filter(v => !(v == null));
    } else {
        return Object.entries(obj)
            .map(([k, v]) => [k, v && typeof v === 'object' ? cleanEmpty(v) : v])
            // @ts-ignore
            .reduce((a, [k, v]) => (v == null ? a : (a[k] = v, a)), {});
    }
}