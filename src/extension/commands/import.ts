import axios from 'axios';
import { readFile as fsreadFile } from 'fs';
import { load as loadYaml } from "js-yaml";
// @ts-expect-error
import { swagger2har } from 'swagger-to-har2';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { ImportHarResult } from '../lib/client';
import { ApplicationServices } from '../services/global';
import path = require('path');
import * as querystring from 'querystring';
var curlToHar = require('curl-to-har');
const curl2Postman = require('curl-to-postmanv2/src/lib');

enum ImportOptions {
    postman = 'postman',
    // swagger2 = 'swagger2.0',
    // swagger3 = 'swagger3.0',
    swagger = "swagger",
    curl = 'curl',
    curlv2 = "curlv2",
    har = "har"
}
enum ImportType {
    file = 'file',
    link = 'link'
}
const IMPORTOPTION_MESSAGES: {
    [imptype in ImportType]: {
        [option in ImportOptions]: string;
    };
} = {
    "file": {
        'postman': "Postman Collection (Have <Filename>.Postman_collection.Json File?)",
        "swagger": "Swagger Schema (Have <Swagger Schema 2/3>.<Yaml/Json> File?)",
        'curl': "Reads Curl Statement From File (Preferred)",
        "curlv2": "Reads Curl Statement From File (Preferred)",
        "har": "Har requests in a file"
    },
    "link": {
        'postman': "Postman Collection Link",
        "swagger": "Swagger Schema (Json/Yaml) Link",
        'curl': "Paste Curl Statement In Input Box",
        "curlv2": "Paste Curl Statement In Input Box",
        "har": "Http Link To Har Collection",
    }
};
const readFile = promisify(fsreadFile);
function curltoHarUsingpostmanconverter(statmenet: string) {
    const obj = curl2Postman.convertCurlToRequest(statmenet);
    let postData: {
        mimeType: null | string;
        text: string | null;
        params: {};
    } | null = null;
    if (obj.body && obj.body.mode) {
        // @ts-ignore
        postData = {};
        switch (obj.body.mode) {
            case "urlencoded":
                postData!.mimeType = "application/x-www-form-urlencoded";
                const urlencodedpostobj: { [key: string]: string; } = {};
                obj.body.urlencoded.forEach((a: { key: any; value: any; }) => {
                    urlencodedpostobj[a.key] = a.value;
                });
                postData!.text = querystring.stringify(urlencodedpostobj);
                break;
            case "raw":
                const headers: { [key: string]: string; } = {};
                obj.header.forEach((element: { key: string; value: string; }) => {
                    headers[element.key.toLowerCase()] = element.value.toLowerCase();
                });
                if (headers['content-type'].indexOf("application/json") > -1)
                    postData!.mimeType = "application/json";

                else
                    postData!.mimeType = "text/plain";
                postData!.text = obj.body.raw;
                break;
            case "formdata":
                const formpostdata = obj.body.formdata.map((element: { key: any; value: any; type: any; }) => {
                    const dat = {
                        name: element.key,
                        value: element.value,
                        contentType: element.type,
                        fileName: null
                    };
                    if (dat.value[0] === '@') {
                        dat.value = dat.value.substr(1);
                        // @ts-ignore
                        dat.fileName = path.basename(dat.value);
                    }
                    return dat;

                });
                postData!.mimeType = "multipart/form-data";
                postData!.params = formpostdata;
                break;
        }
    }
    return {
        method: obj.method,
        name: obj.name,
        url: obj.url,
        headers: obj.header ? obj.header.map((val: { key: any; value: any; }) => ({ name: val.key, value: val.value })) : [],
        postData: postData
    };
}



async function importCurl(version: string) {
    const category = await vscode.window.showQuickPick([
        { label: "file", description: IMPORTOPTION_MESSAGES.file.curl, },
        { label: "paste", description: IMPORTOPTION_MESSAGES.link.curl },
    ]);
    let curlStatement: string | undefined = "";
    if (!category) {
        return;
    }
    if (category.label === "file") {
        let filenameToimport;
        const importUri = await vscode.window.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            title: IMPORTOPTION_MESSAGES.file.curl,
            canSelectMany: false,
        });
        if (importUri && importUri.length > 0) {
            filenameToimport = importUri[0].fsPath;
        } else {
            return;
        }
        curlStatement = await getFileOrLink({ label: 'file' }, filenameToimport);
    } else {
        curlStatement = await vscode.window.showInputBox({
            title: IMPORTOPTION_MESSAGES.link.curl,
            ignoreFocusOut: true,
            placeHolder: "curl -X GET https://httpbin.org/get",
        });
    }
    if (!curlStatement) {
        // don't process if user hasn't pasted any thing
        return;
    }
    // problem with multiline curl
    // inputopions is removing all new line chars
    // which is causing this mitigation
    // this is not perfect fix, but solves most use cases
    curlStatement = curlStatement?.replace(/ \\ -/g, ' -');

    const harType = version === ImportOptions.curlv2 ? curltoHarUsingpostmanconverter(curlStatement!) : curlToHar(curlStatement);
    const directory = await pickDirectoryToImport();
    if (directory) {
        const result = await ApplicationServices.get().getClientHandler().importHttpFromHar([harType], directory);
        if (result.error) {
            vscode.window.showErrorMessage(`import curl failed with error, ${result}`);
            return;
        }
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(result.filename));
        vscode.window.showTextDocument(doc);
    }
}
export async function pickDirectoryToImport() {
    const importUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        title: "Select Folder To Import Resource",
        canSelectMany: false,
        openLabel: "Select Folder To Import"
    });
    if (importUri?.length === 0) { return; }
    const folder = importUri![0];
    if (!folder?.fsPath) { return; }
    const directory = folder.fsPath!;
    await vscode.workspace.fs.createDirectory(folder);
    return directory;
}

export async function importRequests() {
    const pickType = await vscode.window.showQuickPick([
        ImportOptions.postman,
        ImportOptions.swagger,
        ImportOptions.har,
        ImportOptions.curlv2,
        ImportOptions.curl,
    ]) as ImportOptions;
    try {
        // const pickType = importoptions.postman;
        if (!pickType) { return; }
        if (pickType === ImportOptions.curl || pickType === ImportOptions.curlv2) {
            importCurl(pickType);
            return;
        }
        const linkOrFile = await vscode.window.showQuickPick([{
            label: ImportType.link,
            description: IMPORTOPTION_MESSAGES[ImportType.link][pickType],
            picked: true,
            alwaysShow: true,
        }, {
            label: ImportType.file,
            description: IMPORTOPTION_MESSAGES[ImportType.file][pickType],
            picked: false,
            alwaysShow: true,
        }]);
        var filenameToimport: string | undefined;
        if (linkOrFile) {
            const linkOrFileType = linkOrFile['label'];
            if (linkOrFileType === 'link') {
                filenameToimport = await vscode.window.showInputBox({
                    prompt: IMPORTOPTION_MESSAGES[linkOrFileType][pickType],
                    ignoreFocusOut: true,
                    // validateInput: (value) => {
                    // if (value.startsWith("https://www.getpostman.com/collections") ||
                    //     value.startsWith("https://www.postman.com/collections")) {
                    //     return null;
                    // } else return "link should start with https://www.getpostman.com/collections/ or https://postman.com/collections";
                    // },
                    placeHolder: "https://getpostman.com/collections"
                });
            } else if (linkOrFileType === 'file') {
                const filters: { [ram: string]: any; } = {};
                if (pickType === ImportOptions.swagger) {
                    filters.Swagger = ["json", "yaml"];
                } else if (pickType === ImportOptions.har) {
                    filters.har = ["har", "har.json", "json"];
                } else {
                    filters["Postman Collection"] = ["json", "postman_collection.json"];
                }
                const importUri = await vscode.window.showOpenDialog({
                    canSelectFolders: false,
                    canSelectFiles: true,
                    title: IMPORTOPTION_MESSAGES[linkOrFileType][pickType],
                    filters: filters,
                    canSelectMany: false,
                });
                if (importUri && importUri.length > 0) {
                    filenameToimport = importUri[0].fsPath;
                }
            }
        } else { return; }
        if (!filenameToimport) {
            return;
        }
        const directory = await pickDirectoryToImport();
        if (directory) {
            if (pickType === ImportOptions.postman) {
                const result = await ApplicationServices.get().clientHanler.importPostman({ directory, link: filenameToimport!, save: true });
                if (result.error == true) {
                    if ((result.error_message as string).indexOf("File exists")) {
                        await vscode.window.showErrorMessage(`file already exists in \`${directory}\`!, pick different directory`);
                    } else {
                        await vscode.window.showErrorMessage(`import ${pickType} failed with error ${result.error_message}. 
    this usually happens for postman schema 1.0.0,
    follow https://learning.postman.com/docs/getting-started/importing-and-exporting-data/#converting-postman-collections-from-v1-to-v2
    or raise bug`);
                    }
                } else {
                    await vscode.window.showInformationMessage(`checkout ${directory} !! import from postman completed successfully`);
                }
            } else if (pickType === ImportOptions.swagger || pickType === ImportOptions.har) {
                try {
                    const swaggerInStr = await getFileOrLink(linkOrFile, filenameToimport);
                    const result = await importSwagger(swaggerInStr, filenameToimport, directory,
                        pickType);
                    if (result.error === true) {
                        throw new Error(result.error_message);
                    }
                    // show after import 
                    vscode.window.showInformationMessage(`import ${pickType} successfull`);
                    const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(result.filename));
                    vscode.window.showTextDocument(doc);
                } catch (error) {
                    vscode.window.showErrorMessage(`import ${pickType} failed with error ${error}. create bug`);
                    return;
                }
            }
        }

    } catch (err) {
        vscode.window.showInformationMessage(`import ${pickType} failed with error ${err}. raise bug`);
    }
}


async function getFileOrLink(linkOrFile: { label: string | undefined; }, filenameToimport: string): Promise<string> {
    if (linkOrFile['label'] === 'link') {
        const out = await axios.get(filenameToimport);
        return out.data;
    } else {
        return (await readFile(filenameToimport)).toString('utf-8');
    }
}

async function importSwagger(data: any, filename: string, directory: string, picktype: ImportOptions): Promise<ImportHarResult> {
    var hardata;
    if (typeof data === 'string') {
        if (filename.indexOf("json") >= -1) {
            // will check if it is json, if not, just blindly go with json
            // as most swagger files are madeup of yaml files
            try {
                hardata = JSON.parse(data);
            } catch (error) {
                hardata = loadYaml(data);
            }
        } else {
            hardata = loadYaml(data);
        }
    } else {
        hardata = data;
    }
    // figure file name from swagger info
    var saveFilename;
    if (hardata && hardata.info && hardata.info.title) {
        saveFilename = hardata.info.title;
    } else {
        saveFilename = path.basename(filename);
    }
    saveFilename = saveFilename + ".http";

    // check if swagger, load har
    // if har, just use it
    let harFormat = [];
    if (picktype === ImportOptions.swagger) {
        let _libFormat = swagger2har(hardata);
        const libFormat: Array<{ har: any; }> = _libFormat;
        if (!(libFormat && libFormat.length > 0)) {
            throw new Error("swagger file had problem or not able to import");
        }
        for (var har of libFormat) {
            harFormat.push(har.har);
        }
    } else {
        harFormat = hardata.log.entries.map((entry: { request: any; }) => entry.request);
    }
    return await ApplicationServices.get().clientHanler.importHttpFromHar(harFormat, directory, saveFilename);
}
