import * as vscode from 'vscode';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';



export interface RawNotebookCell {
    language: string;
    value: string;
    kind: vscode.NotebookCellKind;
    editable?: boolean;
    outputs: RawCellOutput[];
}

export interface RawCellOutput {
    mime: string;
    value: any;
}



export class NotebookSerializer implements vscode.NotebookSerializer {

    async deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
        var contents = new TextDecoder().decode(content); // convert to String to make JSON object


        // Read file contents
        let raw: RawNotebookCell[];
        try {
            try{
                raw = <RawNotebookCell[]>loadYaml(contents)
            } catch(error){
                raw = <RawNotebookCell[]>JSON.parse(contents);
            }
        } catch {
            raw = [];
        }

        // Create array of Notebook cells for the VS Code API from file contents
        const cells = raw.map(item => {
            const cell = new vscode.NotebookCellData(
                item.kind,
                // in case of value not there
                // use empty
                item.value ?? "",
                item.language
            );
            cell.outputs = item.outputs ? [new vscode.NotebookCellOutput(
                item.outputs.map(output => vscode.NotebookCellOutputItem.text(output.value, output.mime))
            )] : [];

            return cell;
        });
        // Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
        return new vscode.NotebookData(
            cells
        );
    }

    async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
        // function to take output renderer data to a format to save to the file
        const decoder = new TextDecoder();
        function asRawOutput(cell: vscode.NotebookCellData): RawCellOutput[] {
            let result: RawCellOutput[] = [];
            for (let output of cell.outputs ?? []) {
                if (output.items)
                    for (let item of output.items) {
                        result.push({ mime: item.mime, value: decoder.decode(item.data) });
                    }
            }
            return result;
        }

        // Map the Notebook data into the format we want to save the Notebook data as
        let contents: RawNotebookCell[] = [];

        for (const cell of data.cells) {
            contents.push({
                kind: cell.kind,
                // TODO removeme once code-insiders picksup latest
                // @ts-ignore
                language: cell.language || cell.languageId,
                // @ts-ignore
                value: cell.value || cell.source,
                outputs: asRawOutput(cell)
            });
        }

        // Give a string of all the data to save and VS Code will handle the rest 
        return new TextEncoder().encode(dumpYaml(contents, {}));
    }
}


declare class TextDecoder {
    decode(data: Uint8Array): string;
}

declare class TextEncoder {
    encode(data: string): Uint8Array;
}