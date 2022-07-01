import * as vscode from 'vscode';
import { HttpTargetDef } from '../../../web/types/lang-parse';
import { ApplicationServices } from '../../../web/services/global';
import DotHttpEditorView from '../../../views/editor';
import { cacheAndGetTarget, showEditor } from '../run';
import HTTPSnippet = require("httpsnippet");
import { QuickPickItem } from 'vscode';

export const LANG_GEN_TARGETS: Array<QuickPickItem & { options?: Array<string>, filext?: string, description?: string }> = [
    { label: "python", options: ["requests", "python3",], filext: ".py", description: "python :(requests, python3)", },
    { label: "node", options: ["fetch", "axios", "native", "request", "unirest"], filext: ".js", description: "node: (fetch, axios, native, request, unirest)" },
    { label: "javascript", options: ["fetch", "axios", "jquery", "xhr"], filext: ".js", description: "javascript: (fetch, axios, jquery, xhr)" },
    { label: "java", options: ["asynchttp", "nethttp", "okhttp", "unirest"], filext: ".java", description: `java: (asynchttp, nethttp, okhttp, unirest)` },
    { label: "csharp", options: ["httpclient", "restsharp"], filext: ".cs", description: `csharp: (httpclient, restsharp)` },
    { label: "shell", options: ["curl", "wget", "httpie"], filext: ".sh", description: `shell: (curl, wget, httpie)` },
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


export async function generateLangForHttpFile(uri: vscode.Uri) {
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    const target = await cacheAndGetTarget(editor, document);
    return generateLang({ uri: document.uri, target: target! })

}

export async function generateLangFromOptions(
    options: { uri: vscode.Uri, target: string, content?: string, contexts?: Array<string> })
    : Promise<{ code: string, language: string, error: false, extension: string} | void> {
    const { uri, target, content, contexts } = options;
    const clientHanler = ApplicationServices.get().getClientHandler2();
    const fileStateService = ApplicationServices.get().getFileStateService();
    const out = await clientHanler?.generateLangHttp({
        uri: uri,
        content: content,
        curl: false,
        target: target,
        properties: DotHttpEditorView.getEnabledProperties(uri.fsPath),
        env: fileStateService?.getEnv(uri.fsPath)! ?? [],
        contexts
    });
    try {
        if (out?.error) {
            return
        }
        const targetHttpDef = out?.target[target ?? '1']! as HttpTargetDef;
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
        if (langSpec) {
            return { "code": langSpec as string, "language": pickLanguage.label, "extension": pickLanguage.filext!, error: false }
        } return;

    } catch (error) {
        console.log(error);
    }

    return;
}



export async function generateLang(options: { uri: vscode.Uri, target: string, content?: string }): Promise<void> {
    try {
        const langSpec = await generateLangFromOptions(options)
        if (langSpec && !langSpec.error) {
            const outputBodyURI = vscode.Uri.parse("untitled:" + options.uri.fsPath + ".gen" + langSpec.extension);
            vscode.workspace.openTextDocument(outputBodyURI).then((textDoc) => {
                showEditor(textDoc, langSpec.code as string);
            });
        }
    } catch (error) {
        console.log(error);
    }
    return;
}
