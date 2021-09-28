
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
