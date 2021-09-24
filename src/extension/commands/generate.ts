import * as fs from 'fs';
import * as vscode from 'vscode';
import { HttpTargetDef } from '../lib/lang-parse';
import { ApplicationServices } from '../services/global';
import DotHttpEditorView from '../views/editor';
import { cacheAndGetTarget, showEditor } from './run';
import HTTPSnippet = require("httpsnippet");

const LANG_GEN_TARGETS = [
    { label: "python", options: ["requests", "python3",], filext: ".py" },
    { label: "node", options: ["fetch", "axios", "native", "request", "unirest"], filext: ".js" },
    { label: "javascript", options: ["fetch", "axios", "jquery", "xhr"], filext: ".js" },
    { label: "java", options: ["asynchttp", "nethttp", "okhttp", "unirest"], filext: ".java" },
    { label: "csharp", options: ["httpclient", "restsharp"], filext: ".cs" },
    { label: "shell", options: ["curl", "wget", "httpie"], filext: ".sh" },
    { label: "ruby", filext: ".rb" },
    { label: "kotlin", filext: ".kt" },
    { label: "go", filext: ".go" },
    { label: "c", filext: ".c" },
    { label: "clojure", options: [], filext: ".js" },
    { label: "http", filext: ".txt" },
    { label: "objc", filext: ".mm" },
    { label: "ocaml", filext: ".ml" },
    { label: "php", options: ["curl",], filext: ".php" },
    { label: "powershell", filext: ".ps1" },
    { label: "r", filext: ".r" },
    { label: "swift", filext: ".swift" }
];


export async function generateLang(uri: vscode.Uri) {
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    const target = await cacheAndGetTarget(editor, document);
    const filename = document.fileName!;
    if (!fs.existsSync(filename)) {
        return;
    }

    const app = ApplicationServices.get();
    const out = await app.clientHanler.generateLangHttp({
        file: filename,
        curl: false,
        content: "",
        target: target,
        properties: DotHttpEditorView.getEnabledProperties(filename),
        env: app.getFileStateService().getEnv(filename)! ?? [],
    });
    try {
        const targetHttpDef = out.target[target ?? '1']! as HttpTargetDef;
        const snippet = new HTTPSnippet({
            method: targetHttpDef.method, url: targetHttpDef.url,
            queryString: targetHttpDef.query, headers: targetHttpDef.headers,
            // @ts-ignore
            postData: targetHttpDef.payload
        });
        const pickLanguage = await vscode.window.showQuickPick(LANG_GEN_TARGETS, { canPickMany: false, ignoreFocusOut: true, matchOnDescription: true, matchOnDetail: true, placeHolder: "select language" });
        if (!pickLanguage) {
            return;
        }
        var pickImpl: string | undefined;
        if (pickLanguage.options) {
            pickImpl = await vscode.window.showQuickPick(pickLanguage.options, { canPickMany: false, ignoreFocusOut: true, matchOnDescription: true, matchOnDetail: true, placeHolder: "variations" });
            if (!pickImpl) pickImpl = pickLanguage.options[0];
        }
        // TODO Each language has sub options
        const langSpec = snippet.convert(pickLanguage.label!, pickImpl, {
            indent: '\t'
        });
        // TODO only gives out python file name now.
        const outputBodyURI = vscode.Uri.parse("untitled:" + filename + ".gen" + pickLanguage.filext);
        vscode.workspace.openTextDocument(outputBodyURI).then((textDoc) => {
            showEditor(textDoc, langSpec as string);
        });
    } catch (error) {
        console.log(error);
    }

    return;
}
