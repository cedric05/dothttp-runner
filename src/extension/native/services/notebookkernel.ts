import { NotebookKernel } from "../../web/services/notebookkernel";
import * as vscode from 'vscode'
import { DothttpExecuteResponse, MessageType, NotebookExecutionMetadata } from "../../../common/response";
import { generateLang, generateLangFromOptions } from "../commands/export/generate";
import { addHistory, contructFileName, showEditor, showInUntitledView } from "../commands/run";
import { ClientHandler } from "./client";
import DotHttpEditorView from "../../views/editor";

interface CompareBodyItem {
    body: string,
    index: number,
}

export class ProNotebookKernel extends NotebookKernel {
    client1!: ClientHandler;


    constructor() {
        super()
        const _renderer = vscode.notebooks.createRendererMessaging("dotbook");
        _renderer.postMessage({ messageType: "capabilities", params: { hostType: vscode.env.appHost } });
        _renderer.onDidReceiveMessage(this.onMessage.bind(this))
    }


    async onMessage(e: any) {
        switch (e.message.request) {
            case MessageType.generate: {
                const { metadata, response } = e.message;
                const {
                    target,
                    date,
                    uri: jsonEncodedString,
                    // cellNo
                } = metadata as NotebookExecutionMetadata;
                const uri2 = vscode.Uri.file(jsonEncodedString.fsPath as unknown as string)

                return generateLang({ uri: uri2, target, content: response.http })
            }
            case MessageType.save: {
                const { metadata, response } = e.message;
                const {
                    target,
                    date,
                    uri: jsonEncodedString,
                    // cellNo
                } = metadata as NotebookExecutionMetadata;
                const uri2 = vscode.Uri.file(jsonEncodedString.fsPath as unknown as string)

                const fileNameWithInfo = contructFileName(uri2, { curl: false, target: target }, response, date);
                return showInUntitledView(fileNameWithInfo.filename, fileNameWithInfo.header, response);
            }
            case MessageType.compare: {
                const responses = e.message.responses as Array<CompareBodyItem>;

                // open comparision view with response1 and response2 in vscode
                const leftUri = await createEditor(responses[0]);
                const rightUri = await createEditor(responses[1]);

                await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, `Comparison ${responses[0].index}-${responses[1].index}`);

            }
            default:
                break;
        }

    }

    async generateProgrammingLang(cell: vscode.NotebookCell) {
        const execution = this._controller.createNotebookCellExecution(cell);
        try {
            execution.start(Date.now());
            const cellUri = cell.document.uri;
            const contexts = cell.notebook
                .getCells()
                .filter(cell => cell.kind == vscode.NotebookCellKind.Code)
                .map(cell => cell.document.getText());
            const cellNo = parseInt(cellUri.fragment.substring(2));
            const content = cell.document.getText();
            const target: string = await this._getTarget(cellUri, cellNo, content);
            const langspec = await generateLangFromOptions({ content, uri: cell.document.uri, target, contexts });
            if (langspec && langspec.code) {
                let lang;
                switch (langspec.language) {
                    case "node":
                        lang = "text/x-javascript";
                        break;
                    case "http":
                        lang = "text/plain";
                        break;
                    case "c":
                        lang = "text/x-cpp";
                        break;
                    case "objc":
                        lang = "text/x-objective-c/objective";
                        break;
                    case "ocaml":
                        lang = "text/plain";
                        break;
                    default:
                        lang = `text/x-${langspec.language}`
                        break;
                };
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.text(langspec.code as string, lang)])
                ]);
            } else {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr("Failed to generate code, Probably syntax error")])
                ]);
            }
        } catch (error) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(`Failed to generate code. error: ${error}`)])
            ]);
        }
        execution.end(true, Date.now());
    }

    async getResponse(httpDef: string, cell: vscode.NotebookCell, options: { filename: vscode.Uri, target: string, properties?: {}, curl: boolean, contexts: string[] }): Promise<DothttpExecuteResponse | undefined> {
        var properties = {}
        try {
            properties = DotHttpEditorView.getEnabledProperties(cell.document.uri) ?? {};
        } catch (error) {
            console.log(`error is ${error}`);
        }
        const out = await super.getResponse(httpDef, cell, { ...options, properties: properties });
        addHistory(out, options.filename + "-notebook-cell.http", { target: options.target });
        return out
    }
}

async function createEditor(compareItem: CompareBodyItem) {
    const leftUri = vscode.Uri.parse(`untitled:body-${compareItem.index}.txt`);
    // Create and show the diff editor
    await vscode.workspace.openTextDocument(leftUri).then(textDoc => {
        showEditor(textDoc, compareItem.body, -2);
    });
    return leftUri;
}
