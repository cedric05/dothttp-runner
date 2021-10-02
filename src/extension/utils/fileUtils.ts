
import { existsSync } from 'fs';
import path = require('path');
export function getUnSaved(scriptFileName: string) {
    if (!existsSync(scriptFileName)) {
        return scriptFileName;
    }
    const { dir, base: baseName } = path.parse(scriptFileName);
    const indexStart = baseName.indexOf('.');
    const fileNameWithOutExt = baseName.substr(0, indexStart);
    const ext = baseName.substr(indexStart);
    var i = 0;
    while (existsSync(path.join(dir, `${fileNameWithOutExt} [${i}]${ext}`))) {
        i++;
    }
    return path.join(dir, `${fileNameWithOutExt} [${i}]${ext}`);
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