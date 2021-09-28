import axios from 'axios';
import { existsSync, lstatSync, readFile as fsreadFile } from 'fs';
import { load as loadYaml } from "js-yaml";
import { zip } from 'lodash';
import { platform } from 'os';
// @ts-expect-error
import { swagger2har } from 'swagger-to-har2';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { ImportHarResult, TargetSymbolInfo } from '../lib/client';
import { Configuration } from '../models/config';
import { Constants } from '../models/constants';
import { ApplicationServices } from '../services/global';
import { getUnSaved } from '../utils/fileUtils';
import DotHttpEditorView from '../views/editor';
import dateFormat = require('dateformat');
import path = require('path');
import * as querystring from 'querystring';
import { TextEditorEdit, TextEditor } from 'vscode';
import { DothttpExecuteResponse } from '../../common/response';
var curlToHar = require('curl-to-har');
const curl2Postman = require('curl-to-postmanv2/src/lib')

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
    [imptype in ImportType]: { [option in ImportOptions]: string }
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

}

const readFile = promisify(fsreadFile);

function curltoHarUsingpostmanconverter(statmenet: string) {
    const obj = curl2Postman.convertCurlToRequest(statmenet);
    let postData: {
        mimeType: null | string,
        text: string | null,
        params: {}
    } | null = null;
    if (obj.body && obj.body.mode) {
        // @ts-ignore
        postData = {}
        switch (obj.body.mode) {
            case "urlencoded":
                postData!.mimeType = "application/x-www-form-urlencoded"
                const urlencodedpostobj: { [key: string]: string } = {}
                obj.body.urlencoded.forEach((a: { key: any; value: any; }) => {
                    urlencodedpostobj[a.key] = a.value
                });
                postData!.text = querystring.stringify(urlencodedpostobj);
                break;
            case "raw":
                const headers: { [key: string]: string } = {}
                obj.header.forEach((element: { key: string; value: string; }) => {
                    headers[element.key.toLowerCase()] = element.value.toLowerCase();
                });
                if (headers['content-type'].indexOf("application/json") > -1)
                    postData!.mimeType = "application/json"
                else
                    postData!.mimeType = "text/plain"
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
                postData!.mimeType = "multipart/form-data"
                postData!.params = formpostdata
                break;
        }
    }
    return {
        method: obj.method,
        name: obj.name,
        url: obj.url,
        headers: obj.header ? obj.header.map((val: { key: any; value: any; }) => ({ name: val.key, value: val.value })) : [],
        postData: postData

    }
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
        return
    }
    // problem with multiline curl
    // inputopions is removing all new line chars
    // which is causing this mitigation
    // this is not perfect fix, but solves most use cases
    curlStatement = curlStatement?.replace(/ \\ -/g, ' -');

    const harType = version === ImportOptions.curlv2 ? curltoHarUsingpostmanconverter(curlStatement!) : curlToHar(curlStatement)
    const directory = await pickDirectoryToImport();
    if (directory) {
        const result = await ApplicationServices.get().getClientHandler().importHttpFromHar([harType], directory)
        if (result.error) {
            vscode.window.showErrorMessage(`import curl failed with error, ${result}`)
            return;
        }
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(result.filename));
        vscode.window.showTextDocument(doc);
    }
}
async function pickDirectoryToImport() {
    const importUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        title: "Select Folder To Import Resource",
        canSelectMany: false,
        openLabel: "Select Folder To Import"

    });
    if (importUri?.length === 0) { return; }
    const folder = importUri![0];
    if (!folder?.fsPath) { return }
    const directory = folder.fsPath!;
    await vscode.workspace.fs.createDirectory(folder);
    return directory;
}

export async function exportToPostman(uri: vscode.Uri) {
    const doc = await vscode.workspace.openTextDocument(uri);
    const directory = await pickDirectoryToImport();
    if (directory) {
        const result = await ApplicationServices.get().getClientHandler().exportToPostman(doc.fileName);
        if (result.error) {
            vscode.window.showErrorMessage(`export postman failed with error, ${result}`)
            return;
        }
        const collection = result.collection;
        const uri = vscode.Uri.parse("untitled:" + doc.fileName + ".postman_collection.json");
        const collectionDoc = await vscode.workspace.openTextDocument(uri);
        showEditor(collectionDoc, JSON.stringify(collection));
    }
    return;
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
        if (!pickType) { return }
        if (pickType === ImportOptions.curl || pickType === ImportOptions.curlv2) {
            importCurl(pickType);
            return
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
                const filters: { [ram: string]: any } = {}
                if (pickType === ImportOptions.swagger) {
                    filters.Swagger = ["json", "yaml"]
                } else if (pickType === ImportOptions.har) {
                    filters.har = ["har", "har.json", "json"]
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
        } else { return }
        if (!filenameToimport) {
            return;
        }
        const directory = await pickDirectoryToImport();
        if (directory) {
            if (pickType === ImportOptions.postman) {
                const result = await ApplicationServices.get().clientHanler.importPostman({ directory, link: filenameToimport!, save: true });
                if (result.error == true) {
                    vscode.window.showErrorMessage(`import ${pickType} failed with error ${result.error_message}. 
this usually happens for postman schema 1.0.0,
follow https://learning.postman.com/docs/getting-started/importing-and-exporting-data/#converting-postman-collections-from-v1-to-v2
or raise bug`);
                }
                await vscode.window.showInformationMessage(`checkout ${directory} !! import from postman completed successfully`);
            } else if (pickType === ImportOptions.swagger || pickType === ImportOptions.har) {
                try {
                    const swaggerInStr = await getFileOrLink(linkOrFile, filenameToimport);
                    const result = await importSwagger(swaggerInStr, filenameToimport, directory
                        , pickType);
                    if (result.error === true) {
                        throw new Error(result.error_message)
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


async function getFileOrLink(linkOrFile: { label: string | undefined }, filenameToimport: string): Promise<string> {
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
        let _libFormat = swagger2har(hardata)
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

export async function runTargetInCell(arr: { uri: string, cellNo: number, target: string }) {
    const uri = vscode.Uri.file(arr.uri);
    const cellNo = arr.cellNo;
    const notebook = await vscode.workspace.openNotebookDocument(uri);
    const cell = notebook.cellAt(cellNo);
    const kernel = ApplicationServices.get().getNotebookkernel();
    kernel.executeCell(cell, arr.target);
}


export async function runHttpCodeLensCommand(...arr: any[]) {
    const { uri, target, curl } = arr[2];
    return runHttpFileWithOptions({ curl: curl, target: target, fileName: uri });
}



export async function runFileCommand(editor: TextEditor, _edit: TextEditorEdit, _uri: vscode.Uri) {
    const target = await cacheAndGetTarget(editor, editor.document);
    if (target) {
        return runHttpFileWithOptions({ curl: false, target: target, fileName: _uri.fsPath });
    }
}

export async function genCurlCommand(editor: TextEditor, _edit: TextEditorEdit, _uri: vscode.Uri) {
    const target = await cacheAndGetTarget(editor, editor.document);
    if (target) {
        return runHttpFileWithOptions({ curl: true, target: target, fileName: _uri.fsPath });
    }
}

export async function cacheAndGetTarget(editor: TextEditor, document: vscode.TextDocument) {
    const target = await getTargetFromQuickPick(editor, document);
    if (target) {
        const storage = ApplicationServices.get().getStorageService();
        const filename = editor.document.fileName ?? '';
        storage.setValue(`httpruntarget://${filename}`, target);
        return target;
    }
}


async function getTargetFromQuickPick(editor: TextEditor, document: vscode.TextDocument) {
    // decide target from arguments,
    // this request is from code-lens

    // otherwise ask for user input
    const filename = document.fileName;
    if (ApplicationServices.get().getConfig().runRecent) {
        const storage = ApplicationServices.get().getStorageService();
        return storage.getValue(`httpruntarget://${filename}`, '1');
    }
    const names = await ApplicationServices.get().getClientHandler().getDocumentSymbols(filename);
    if (names.error) {
        return '1';
    }
    // const selectionDone = false;
    // @ts-ignore
    const items: vscode.QuickPickItem[] = zip(names.names, names.urls).map(comb => {
        const namer = comb[0]!;
        return {
            label: namer.name,
            detail: comb[1]?.url,
            target: namer,
            /* 
                picking multiple is not supported by dothttp, picking one is not supported by vscode
                so, for now commenting
            */
            // picked: !selectionDone && editor.visibleRanges[0].intersection(range) ? true : false,
        };
    });
    if (items.length === 0) {
        throw new Error("no target available");
    }
    if (items.length === 1) {
        return items[0].label;
    }
    const option = await vscode.window.showQuickPick(items,
        {
            canPickMany: false, ignoreFocusOut: true, onDidSelectItem: function (quickPickItem: { label: string, target: TargetSymbolInfo }) {
                const range = new vscode.Range(
                    document.positionAt(quickPickItem.target.start),
                    document.positionAt(quickPickItem.target.end));
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            }
        });
    if (option?.label) {
        return option.label;
    }
}

export async function runHttpFileWithOptions(options: { curl: boolean, target: string, fileName: string }) {
    const filename = options.fileName;
    const config = ApplicationServices.get().getConfig();
    const document = (await vscode.workspace.openTextDocument(vscode.Uri.file(filename)));
    if (document.isDirty) {
        // as file is not saved,
        // execute http def on last saved file, which gives us 
        // unwanted results
        await document.save();
    }

    if (!DotHttpEditorView.isHttpFile(filename) && document.uri.scheme === 'file') {
        vscode.window.showInformationMessage('either python path not set correctly!! or not an .dhttp/.http file or file doesn\'t exist ');
        return;
    }
    const date = new Date();
    var now = dateFormat(date, 'hh:MM:ss');
    if (config.reUseOld) {
        now = '';
    }
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `running ${filename} target: ${options.target} time: ${now}`,
        cancellable: true,
    }, (progress, token) => {
        return new Promise(async (resolve) => {
            var prom;
            if (document.uri.scheme === 'file') {
                prom = DotHttpEditorView.runFile({ filename, curl: options.curl, target: options.target });
            } else if (document.uri.scheme === DotHttpEditorView.scheme) {
                prom = DotHttpEditorView.runContent({ content: document.getText(), curl: options.curl, target: options.target });
            }
            progress.report({ increment: 50, message: 'api called' });
            const out = await prom;
            addHistory(out, filename, options);
            if (!token.isCancellationRequested) {
                const fileNameWithInfo = contructFileName(getBaseFileNameToSave(config, filename), options, out, now);
                showInUntitledView(fileNameWithInfo.filename, fileNameWithInfo.header, out);
                progress.report({ increment: 50, message: 'completed' });
            }
            resolve(true);
        });
    })
}

function getBaseFileNameToSave(config: Configuration, filename: string) {
    var sfilename;
    if (config.responseSaveDirectory) {
        if (path.isAbsolute(config.responseSaveDirectory)) {
            // save to absolute directory
            sfilename = path.join(config.responseSaveDirectory, path.basename(filename));
        } else {
            // relatvie to current file's directory
            const parentDirectory = path.dirname(filename);
            sfilename = path.join(parentDirectory, config.responseSaveDirectory, path.basename(filename));
        }
        const parDirectory = path.dirname(sfilename);
        if (existsSync(parDirectory) && lstatSync(parDirectory).isDirectory()) {
            return sfilename
        } else {
            vscode.window.showErrorMessage(`${Constants.responseDirectory} is set to incorrect value(non existant directory or is a file)`)
            return filename;
        }
    }
    return filename;
}

export function addHistory(out: any, filename: string, options: { target: string; }) {
    const history = {
        url: out.url as string,
        http: out.http as string,
        filename: filename as string,
        target: options.target as string,
        time: new Date(),
        status_code: out.status as number
    };
    ApplicationServices.get().getHistoryService().addNew(
        history);
    ApplicationServices.get().getHistoryTreeProvider().recentChanged(history);
}

export function showInUntitledView(scriptFileName: string, headerURI: string, out: DothttpExecuteResponse) {
    /**
     * with textdocumentcontentprovider, content is not editable and formattable.
     * currently i'm skepticall among both options, 
     * i will keep showinUntitedView default, and other one as configrable, 
     * after some feedback one of both will be removed
     */
    var outputBodyURI = vscode.Uri.parse("untitled:" + scriptFileName);
    const ifsavedFileName = vscode.Uri.parse("file:" + scriptFileName);
    if (existsSync(ifsavedFileName.fsPath)) {
        outputBodyURI = vscode.Uri.parse("untitled:" + getUnSaved(scriptFileName));
    }
    if (ApplicationServices.get().getConfig().reUseOld) {
        const editors = vscode.window.visibleTextEditors.filter(editor => editor.document.uri === outputBodyURI);
        if (editors.length !== 0) {
            const editor = editors[0];
            showEditor(editor.document, out.error ? out.error_message! : out.response.body!);
            return
        }
    }
    vscode.workspace.openTextDocument(outputBodyURI).then((textDoc) => {
        showEditor(textDoc, out.error ? out.error_message! : out.response.body!);
        if (ApplicationServices.get().getConfig().showHeaders && !out.error) {
            const outputHeaderURI = vscode.Uri.parse("untitled:" + headerURI);
            vscode.workspace.openTextDocument(outputHeaderURI).then(textDoc => {
                showEditor(textDoc, JSON.stringify(out.response.headers), -2);
            });
        }
    });
}

export function showEditor(textDoc: vscode.TextDocument, scriptContent: string, column = 2) {
    vscode.window.showTextDocument(textDoc, column /** new group */, false /**preserveFocus */).then(e => {
        e.edit(edit => {
            if (ApplicationServices.get().getConfig().reUseOld) {
                edit.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(textDoc.lineCount + 1, 0)))
            }
            edit.insert(new vscode.Position(0, 0), scriptContent);
        });
    });
}

export function contructFileName(filename: string, options: { curl: boolean; target: string; }, out: any, now: string) {
    var middlepart = 'error';
    options.target = (options.target ?? '').replace(/[^\w\s]/gi, '')
    if (!out.error_message) {
        middlepart = `${'(target:' + options.target + ')'}${options.curl ? '-curl' : ''}${out.status ? '-(status:' + out.status + ')' : ''}-${now}`
        if (platform() === 'win32') {
            middlepart = middlepart.replace(/:/g, ' ')
        }
    }
    return {
        filename: `${filename}-${middlepart}.${out.filenameExtension}`,
        header: `${filename}-${middlepart}-headers.json`,
    };
}
