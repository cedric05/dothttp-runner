import axios from 'axios';
import { existsSync, lstatSync, readFile as fsreadFile } from 'fs';
import { load as loadYaml } from "js-yaml";
import { zip } from 'lodash';
import { platform } from 'os';
// @ts-expect-error
import { swagger2har } from 'swagger2har';
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
var curlToHar = require('curl-to-har');


enum importoptions {
    postman = 'postman',
    // swagger2 = 'swagger2.0',
    // swagger3 = 'swagger3.0',
    swagger = "swagger",
    curl = 'curl'
}

const readFile = promisify(fsreadFile);


async function importCurl() {
    const curlStatement = await vscode.window.showInputBox({
        title: "paste curl here",
        ignoreFocusOut: true,
        placeHolder: "curl -X <link>",
    });
    const harType = curlToHar(curlStatement);
    const directory = await pickDirectoryToImport();
    if (directory) {
        const result = await ApplicationServices.get().getClientHandler().importHarToFromHar([harType], directory)
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
        title: "select folder to import resource",
        canSelectMany: false,
        openLabel: "select folder to import"

    });
    if (importUri?.length === 0) { return; }
    const folder = importUri![0];
    if (!folder?.fsPath) { return }
    const directory = folder.fsPath!;
    await vscode.workspace.fs.createDirectory(folder);
    return directory;
}

export async function exportToPostman() {
    const doc = vscode.window.activeTextEditor?.document!;
    const directory = await pickDirectoryToImport();
    if (directory) {
        const result = await ApplicationServices.get().getClientHandler().exportToPostman(doc.fileName);
        if (result.error) {
            vscode.window.showErrorMessage(`export postman failed with error, ${result}`)
            return;
        }
        const collection = result.collection;
        const uri = vscode.Uri.parse("untitled:" + doc.fileName + ".json");
        const collectionDoc = await vscode.workspace.openTextDocument(uri);
        showEditor(collectionDoc, JSON.stringify(collection));
    }
    return;
}


export async function importRequests() {
    const pickType = await vscode.window.showQuickPick([importoptions.postman, importoptions.swagger, importoptions.curl]) as importoptions;
    try {
        // const pickType = importoptions.postman;
        if (!pickType) { return }
        if (pickType === importoptions.curl) {
            importCurl();
            return
        }
        const linkOrFile = await vscode.window.showQuickPick([{
            label: "link",
            description: "postman collection link",
            picked: true,
            alwaysShow: true,
        }, {
            label: "file",
            description: "file exists in local system",
            picked: false,
            alwaysShow: true,
        }]);
        var filenameToimport: string | undefined;
        if (linkOrFile) {
            if (linkOrFile['label'] === 'link') {
                filenameToimport = await vscode.window.showInputBox({
                    prompt: "postman link",
                    ignoreFocusOut: true,
                    // validateInput: (value) => {
                    // if (value.startsWith("https://www.getpostman.com/collections") ||
                    //     value.startsWith("https://www.postman.com/collections")) {
                    //     return null;
                    // } else return "link should start with https://www.getpostman.com/collections/ or https://postman.com/collections";
                    // },
                    placeHolder: "https://getpostman.com/collections"
                });
            } else if (linkOrFile['label'] === 'file') {
                const filters: { [ram: string]: any } = {}
                if (pickType !== importoptions.postman) {
                    filters.Swagger = ["json", "yaml"]
                } else {
                    filters["Postman Collection"] = ["json", "postman_collection.json"];
                }
                const importUri = await vscode.window.showOpenDialog({
                    canSelectFolders: false,
                    canSelectFiles: true,
                    title: "select file to import resource",
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
            if (pickType === importoptions.postman) {
                const result = await ApplicationServices.get().clientHanler.importPostman({ directory, link: filenameToimport!, save: true });
                if (result.error == true) {
                    vscode.window.showErrorMessage(`import ${pickType} failed with error ${result.error_message}. 
this usually happens for postman schema 1.0.0,
follow https://learning.postman.com/docs/getting-started/importing-and-exporting-data/#converting-postman-collections-from-v1-to-v2
or raise bug`);
                }
                await vscode.window.showInformationMessage(`checkout ${directory} !! import from postman completed successfully`);
            } else if (pickType === importoptions.swagger) {
                try {
                    const swaggerInStr = await getFileOrLink(linkOrFile, filenameToimport);
                    const result = await importSwagger(swaggerInStr, filenameToimport, directory);
                    if (result.error === true) {
                        throw new Error(result.error_message)
                    }
                    // show after import 
                    vscode.window.showInformationMessage("import swagger successfull");
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


async function getFileOrLink(linkOrFile: { label: string; description: string; picked: true; alwaysShow: true; } | { label: string; description: string; picked: false; alwaysShow: true; }, filenameToimport: string) {
    if (linkOrFile['label'] === 'link') {
        const out = await axios.get(filenameToimport);
        return out.data;
    } else {
        return (await readFile(filenameToimport)).toString('utf-8');
    }
}

async function importSwagger(data: any, filename: string, directory: string): Promise<ImportHarResult> {
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
    }
    const libFormat: Array<{ har: any; }> = swagger2har(hardata);
    var saveFilename;
    if (hardata && hardata.info && hardata.info.title) {
        saveFilename = hardata.info.title;
    } else {
        saveFilename = path.basename(filename);
    }
    saveFilename = saveFilename + ".http";
    if (!(libFormat && libFormat.length > 0)) {
        throw new Error("swagger file had problem or not able to import");
    }
    const harFormat = [];
    for (var har of libFormat) {
        harFormat.push(har.har);
    }
    return await ApplicationServices.get().clientHanler.importHarToFromHar(harFormat, directory, saveFilename);
}


export async function runFileCommand(...arr: any[]) {
    const target = await cacheAndGetTarget(arr);
    if (target) {
        return runHttpFileWithOptions({ curl: false, target: target });
    }
}

export async function genCurlCommand(...arr: any[]) {
    const target = await cacheAndGetTarget(arr);
    if (target) {
        return runHttpFileWithOptions({ curl: true, target: target });
    }
}

export async function cacheAndGetTarget(arr: any[]) {
    const target = await getTargetFromQuickPick(arr);
    if (target) {
        const storage = ApplicationServices.get().getStorageService();
        const filename = vscode.window.activeTextEditor?.document.fileName ?? '';
        storage.setValue(`httpruntarget://${filename}`, target);
        return target;
    }
}


async function getTargetFromQuickPick(arr: any[]) {
    // decide target from arguments,
    // this request is from code-lens
    if (arr && arr.length >= 3) {
        var target = arr[2].target;
        if (target) {
            return target;
        }
    }
    // otherwise ask for user input
    const editor = vscode.window.activeTextEditor!;
    const document = editor.document!;
    const filename = document.fileName!;
    if (ApplicationServices.get().getCconfig().runRecent) {
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
                vscode.window.activeTextEditor?.revealRange(range, vscode.TextEditorRevealType.InCenter);
            }
        });
    if (option?.label) {
        return option.label;
    }
}

export async function runHttpFileWithOptions(options: { curl: boolean, target: string }) {
    const config = ApplicationServices.get().getCconfig();

    const document = vscode.window.activeTextEditor?.document!;
    const filename = document.fileName!;
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

function showInUntitledView(scriptFileName: string, headerURI: string, out: { error?: boolean, error_message?: string, body?: string, headers: {} }) {
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
    if (ApplicationServices.get().getCconfig().reUseOld) {
        const editors = vscode.window.visibleTextEditors.filter(editor => editor.document.uri === outputBodyURI);
        if (editors.length !== 0) {
            const editor = editors[0];
            showEditor(editor.document, out.error ? out.error_message! : out.body!);
            return
        }
    }
    vscode.workspace.openTextDocument(outputBodyURI).then((textDoc) => {
        showEditor(textDoc, out.error ? out.error_message! : out.body!);
        if (ApplicationServices.get().getCconfig().showHeaders && !out.error) {
            const outputHeaderURI = vscode.Uri.parse("untitled:" + headerURI);
            vscode.workspace.openTextDocument(outputHeaderURI).then(textDoc => {
                showEditor(textDoc, JSON.stringify(out.headers), -2);
            });
        }
    });
}

export function showEditor(textDoc: vscode.TextDocument, scriptContent: string, column = 2) {
    vscode.window.showTextDocument(textDoc, column /** new group */, false /**preserveFocus */).then(e => {
        e.edit(edit => {
            if (ApplicationServices.get().getCconfig().reUseOld) {
                edit.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(textDoc.lineCount + 1, 0)))
            }
            edit.insert(new vscode.Position(0, 0), scriptContent);
        });
    });
}

function contructFileName(filename: string, options: { curl: boolean; target: string; }, out: any, now: string) {
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
