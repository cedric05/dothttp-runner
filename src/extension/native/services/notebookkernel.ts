import { NotebookKernel } from "../../web/services/notebookkernel";
import * as vscode from 'vscode'
import { DothttpExecuteResponse, MessageType, NotebookExecutionMetadata } from "../../../common/response";
import { generateLang, generateLangFromOptions } from "../commands/export/generate";
import { addHistory, contructFileName, showInUntitledView } from "../commands/run";
import { ClientHandler } from "./client";


export class ProNotebookKernel extends NotebookKernel {
    client1!: ClientHandler;


    constructor() {
        super()
        const _renderer = vscode.notebooks.createRendererMessaging("dothttp-book");
        _renderer.onDidReceiveMessage(this.onMessage.bind(this))
    }


    async onMessage(e: any) {
        const { metadata, response } = e.message;
        const {
            target,
            date,
            uri: jsonEncodedString,
            // cellNo
        } = metadata as NotebookExecutionMetadata;
        const uri2 = vscode.Uri.file(jsonEncodedString.fsPath as unknown as string)
        switch (e.message.request) {
            case MessageType.generate: {
                return generateLang({ uri: uri2, target, content: response.http })
            }
            case MessageType.save: {
                const fileNameWithInfo = contructFileName(uri2, { curl: false, target: target }, response, date);
                return showInUntitledView(fileNameWithInfo.filename, fileNameWithInfo.header, response);
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
                if (langspec.language == 'node') {
                    langspec.language = 'javascript'
                }
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.text(langspec.code as string, `text/x-${langspec.language}`)])
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

    async getResponse(httpDef: string, cell: vscode.NotebookCell, filename: string, properties: {}, target: string, curl: boolean, contexts: string[]): Promise<DothttpExecuteResponse | undefined> {
        const out = await super.getResponse(httpDef, cell, filename, properties, target, curl, contexts);
        addHistory(out, filename + "-notebook-cell.http", { target });
        return out
    }
}