

import { fsExists as fsExists } from './fsUtils';
import { Uri } from 'vscode';
import { Utils } from 'vscode-uri';

export function getUnSaved(scriptFileName: string) {
    const existsSync = require('fs')
    const path = require('path');
    if (!existsSync(scriptFileName)) {
        return scriptFileName;
    }
    const { dir, base: baseName } = path.parse(scriptFileName);
    const indexStart = baseName.indexOf('.');
    const fileNameWithOutExt = baseName.substr(0, indexStart);
    const ext = baseName.substr(indexStart);
    var i = 0;
    while (existsSync(path.join(dir, `${fileNameWithOutExt} (${i})${ext}`))) {
        i++;
    }
    return path.join(dir, `${fileNameWithOutExt} (${i})${ext}`);
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