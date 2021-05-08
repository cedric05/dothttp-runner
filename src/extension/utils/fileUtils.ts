
import { existsSync } from 'fs';
import path = require('path');
export function getUnSaved(scriptFileName: string) {
    const dirname = path.dirname(scriptFileName);
    const extname = path.extname(scriptFileName);
    const basename = path.basename(scriptFileName);
    var i = 0;
    while (existsSync(path.join(dirname, `${basename} [${i}].${extname}`))) {
        i++;
    }
    return path.join(dirname, `${basename} [${i}].${extname}`);
}
