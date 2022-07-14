import axios from 'axios';
import { promises as fs } from 'fs';
import { load as loadYaml } from "js-yaml";
import * as querystring from 'querystring';
// @ts-expect-error
import { swagger2har } from 'swagger-to-har2';
import * as temp from 'temp';
import * as vscode from 'vscode';
import { ApplicationServices } from '../../web/services/global';
import { Collection, PostmanClient, getPostmanClient } from '../export/postmanUtils';

import { promisify } from 'util';
import path = require('path');
import { Constants } from '../../web/utils/constants';
import { getUnSavedUri } from "../../web/utils/fsUtils";
import { Utils } from 'vscode-uri';
import { convert } from 'openapi-to-postmanv2';

const convertOpenApitoPostman = promisify(convert);
var curlToHar = require('curl-to-har');
const curl2Postman = require('curl-to-postmanv2/src/lib');

enum ImportOptions {
    postman = 'postman',
    postman_workspace = "postman_workspace",
    swagger2 = 'swagger2',
    swagger3 = 'swagger3',
    // swagger = "swagger",
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
        [option in ImportOptions]?: string;
    };
} = {
    "file": {
        'postman': "Postman Collection (Have <Filename>.Postman_collection.Json File?)",
        "swagger2": "Swagger Schema (Have <Swagger Schema 2>.<Yaml/Json> File?)",
        "swagger3": "Swagger3/OpenAPI Schema (Have <Swagger3/OpenAPI Schema>.<Yaml/Json> File?)",
        'curl': "Reads Curl Statement From File (Preferred)",
        "curlv2": "Reads Curl Statement From File (Preferred)",
        "har": "Har requests in a file"
    },
    "link": {
        'postman': "Postman Collection Link",
        "swagger2": "Swagger2 Schema (Json/Yaml) Link",
        "swagger3": "Swagger3/OpenApi Schema (Json/Yaml) Link",
        'curl': "Paste Curl Statement In Input Box",
        "curlv2": "Paste Curl Statement In Input Box",
        "har": "Http Link To Har Collection",
    }
};
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



async function importCurl(version: string, isNotebook: string) {
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
        const save_filename = await getUnSavedUri(Utils.joinPath(directory, `from_curl.${isNotebook == 'notebook' ? 'httpbook' : 'http'}`));
        const result = await ApplicationServices.get().getClientHandler()?.importHttpFromHar([harType], directory.fsPath, save_filename.fsPath, isNotebook);
        if (result?.error) {
            vscode.window.showErrorMessage(`import curl failed with error, ${result}`);
            return;
        }
        if (result)
            await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(result.filename));
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
    await vscode.workspace.fs.createDirectory(folder);
    return folder;
}

export async function importRequests() {
    const pickType = (await vscode.window.showQuickPick([
        { "picktype": ImportOptions.postman, description: "Import using Public collection url/file shared by some one else", "label": "Postman Individual Collection" },
        { "picktype": ImportOptions.postman_workspace, description: "Import by connecting to postman account via postman apis", label: "Postman Self Account" },
        { "picktype": ImportOptions.swagger2, label: "Swagger(v2)", description: "is a specification and framework for describing REST APIs" },
        { "picktype": ImportOptions.swagger3, label: "Swagger(v3)/OpenAPI", description: "is a specification and framework for describing REST APIs" },
        { "picktype": ImportOptions.har, label: "Har", description: "Har is http archive, easy way to Capture Web session traffic info: https://support.google.com/admanager/answer/10358597?hl=en" },
        { "picktype": ImportOptions.curlv2, label: "CurlV2" },
        { "picktype": ImportOptions.curl, label: "Curl" },
    ] as Array<{ picktype: ImportOptions } & vscode.QuickPickItem>, { ignoreFocusOut: true }))?.picktype;

    if (!pickType) { return; }
    const isNotebookImport = (await vscode.window.showQuickPick([
        { label: "Import as Http Notebook", "filetype": 'notebook' },
        { label: "Import as Http File", filetype: "http" },
    ], {
        ignoreFocusOut: true,
        canPickMany: false,
    }))?.filetype ?? 'http';
    try {
        // const pickType = importoptions.postman;
        if (pickType === ImportOptions.postman_workspace) {
            try {
                return await importPostmanInternal(isNotebookImport);
            } catch (error) {
                if ((error as Error & { isAxiosError: boolean }).isAxiosError) {
                    error = await vscode.window.showWarningMessage("Postman API Key is revoked and is removed, please try again now", "Enter Postman key again?");
                    if (error == "Enter Postman key again?") {
                        return await vscode.commands.executeCommand(Constants.IMPORT_RESOURCE_COMMAND);
                    }
                } else {
                    return await vscode.window.showErrorMessage(`Unknown Error ${error} happened!, Please create Bug`)
                }
            }
        }
        if (pickType === ImportOptions.curl || pickType === ImportOptions.curlv2) {
            importCurl(pickType, isNotebookImport);
            return;
        }
        const linkOrFile = await vscode.window.showQuickPick([{
            label: ImportType.link,
            // @ts-ignore
            description: IMPORTOPTION_MESSAGES[ImportType.link][pickType],
            picked: true,
            alwaysShow: true,
        }, {
            label: ImportType.file,
            // @ts-ignore
            description: IMPORTOPTION_MESSAGES[ImportType.file][pickType],
            picked: false,
            alwaysShow: true,
        }]);
        var filenameToimport: string | undefined;
        if (linkOrFile) {
            const linkOrFileType = linkOrFile['label'];
            if (linkOrFileType === 'link') {
                filenameToimport = await vscode.window.showInputBox({
                    // @ts-ignore
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
                if (pickType === ImportOptions.swagger2 || pickType === ImportOptions.swagger3) {
                    filters.Swagger = ["json", "yaml", "yml"];
                } else if (pickType === ImportOptions.har) {
                    filters.har = ["har", "har.json", "json"];
                } else {
                    filters["Postman Collection"] = ["json", "postman_collection.json"];
                }
                const importUri = await vscode.window.showOpenDialog({
                    canSelectFolders: false,
                    canSelectFiles: true,
                    // @ts-ignore
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
                await postmanFromCollectionFile(directory, filenameToimport, isNotebookImport, pickType);
            } else if (pickType === ImportOptions.swagger2 || pickType === ImportOptions.swagger3 || pickType === ImportOptions.har) {
                try {
                    const swaggerInStr = await getFileOrLink(linkOrFile, filenameToimport);
                    const result = await importSwagger(swaggerInStr, filenameToimport, directory,
                        pickType, isNotebookImport);
                    if (result?.error === true) {
                        throw new Error(result.error_message);
                    }
                    // show after import 
                    vscode.window.showInformationMessage(`import ${pickType} successfull`);
                    if (result) {
                        const newNotebookOrHttp = vscode.Uri.file(result.filename);
                        await vscode.commands.executeCommand("vscode.open", newNotebookOrHttp);
                    }
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


async function postmanFromCollectionFile(directory: vscode.Uri, filenameToimport: string | null, isNotebookImport: string, pickType: ImportOptions, collection?: any) {
    const result = await ApplicationServices.get().getClientHandler()?.importPostman({ directory: directory.fsPath, link: filenameToimport, save: true, "postman-collection": collection, filetype: isNotebookImport });
    if (result.error == true) {
        if ((result.error_message as string).indexOf("File exists")) {
            await vscode.window.showErrorMessage(`file already exists in \`${directory}\`!, pick different directory`);
        } else {
            await vscode.window.showErrorMessage(`import ${pickType} failed with error ${result.error_message}. 
    this usually happens for postman schema 1.0.0,
    follow https://learning.postman.com/docs/getting-started/imp    orting-and-exporting-data/#converting-postman-collections-from-v1-to-v2
    or raise bug`);
        }
    } else {
        await vscode.window.showInformationMessage(`checkout ${directory} !! import from postman completed successfully`);
    }
}

async function getFileOrLink(linkOrFile: { label: string | undefined; }, filenameToimport: string): Promise<string> {
    if (linkOrFile['label'] === 'link') {
        const out = await axios.get(filenameToimport);
        return out.data;
    } else {
        return (await fs.readFile(filenameToimport)).toString('utf-8');
    }
}

async function importSwagger(data: any, filename: string, directory: vscode.Uri, picktype: ImportOptions, isNotebooK: string): Promise<{ error?: boolean, error_message?: string, filename: string } | undefined> {
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
    saveFilename = saveFilename + (isNotebooK == 'notebook' ? ".hnbk" : ".http");

    // check if swagger, load har
    // if har, just use it
    let harFormat = [];
    if (picktype === ImportOptions.swagger2) {
        let _libFormat = swagger2har(hardata);
        const libFormat: Array<{ har: any; }> = _libFormat;
        if (!(libFormat && libFormat.length > 0)) {
            throw new Error("swagger file had problem or not able to import");
        }
        for (var har of libFormat) {
            harFormat.push(har.har);
        }
    } else if (picktype === ImportOptions.swagger3) {
        const result: any = await convertOpenApitoPostman({ 'type': 'json', data: hardata }, undefined);
        await postmanFromCollectionFile(directory, null, isNotebooK, picktype, result.output[0]['data']);
        return {
            error: false,
            filename: directory.fsPath
        }
    } else {
        harFormat = hardata.log.entries.map((entry: { request: any; }) => entry.request);
    }
    return await ApplicationServices.get().getClientHandler()?.importHttpFromHar(harFormat, directory.fsPath, saveFilename, isNotebooK);
}


async function importPostmanInternal(isNotebook: string) {
    const postmanClient = await getPostmanClient();
    const directory = await pickDirectoryToImport();
    if (!directory) {
        return;
    }
    const category = await vscode.window.showQuickPick(
        [
            { "label": "All Collectoins", "type": "Collections", description: "Collections from all Workspaces" },
            { "label": "Pick from workspace", "type": "workspace", description: "Pick collection from specific Workspaces" }
        ], { ignoreFocusOut: true });
    if (!category) {
        return;
    }
    // temp will track each file
    temp.track();
    let results: Array<CollectionImportErrorInfo | undefined>;
    if (category.type === "Collections") {
        // error can happen at this point
        // but it is irrecoverable
        const collectionsListResponse = await postmanClient.listCollections();
        results = await Promise.all(collectionsListResponse.data.collections.map(
            (collectionInfo) => importPostmanCollectionHandler(collectionInfo, postmanClient, directory, isNotebook)
        ));
    } else {
        // error can happen at this point
        // but it is irrecoverable
        const workspaceResponse = await postmanClient.listWorkSpaces();
        const workspacePicks = workspaceResponse.data.workspaces.map(workspace => {
            return {
                "label": `${workspace.name}, id: ${workspace.id}`,
                "workspaceType": "existing",
                "description": "use existing workspace",
                ...workspace
            }
        })
        const picked = await vscode.window.showQuickPick(workspacePicks);
        if (!picked) {
            return;
        }
        // error can happen at this point
        // but it is irrecoverable
        const worksapce = await postmanClient.getWorkspace(picked.id);
        const { collections } = worksapce.data.workspace;
        if (!collections || collections.length == 0) {
            await vscode.window.showInformationMessage(`No Collections availaible in workspace : '${worksapce.data.workspace.name}' ${directory}`);
            return;
        }
        results = await Promise.all(collections.map(
            (collectionInfo) => importPostmanCollectionHandler(collectionInfo, postmanClient, directory, isNotebook)
        ))
    }
    const failures = results.filter(error => error).map(er => `${er!.id} msg: ${er!.message}`).join(", ");
    // delete all collections
    await temp.cleanup();
    if (failures) {
        await vscode.window.showWarningMessage(`Only Few Collections have been imported in ${directory}, other ran into error info: ${results}`);
    } else {
        await vscode.window.showInformationMessage(`All Collections have been imported in ${directory}`);
    }
}


type CollectionImportErrorInfo = Error & { id: string }


async function importPostmanCollectionHandler(aCollectionInfo: Collection, client: PostmanClient, directory: vscode.Uri, isNotebookImport: string): Promise<CollectionImportErrorInfo | undefined> {
    try {
        const collectionResponse = await client.getCollection(aCollectionInfo.uid);
        const { collection } = collectionResponse.data;
        const tempFileInfo = await temp.open("dothttp_collection");
        await fs.writeFile(tempFileInfo.path, JSON.stringify(collection));
        await ApplicationServices.get().getClientHandler()?.importPostman({ link: tempFileInfo.path, directory: directory.fsPath, save: true, filetype: isNotebookImport });
    } catch (err) {
        const error = new Error(err as unknown as string) as CollectionImportErrorInfo;
        error.id = aCollectionInfo.name;
        return error;
    }
};

