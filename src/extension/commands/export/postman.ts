import * as vscode from 'vscode';
import { ApplicationServices } from '../../services/global';
import { showEditor } from '../run';
import { pickDirectoryToImport } from "../import";
import { getUnSaved } from '../../utils/fileUtils';


export async function exportToPostman(uri: vscode.Uri) {
    const doc = await vscode.workspace.openTextDocument(uri);
    const directory = await pickDirectoryToImport();
    if (directory) {
        const result = await ApplicationServices.get().getClientHandler().exportToPostman(doc.fileName);
        if (result.error) {
            vscode.window.showErrorMessage(`export postman failed with error, ${result}`);
            return;
        }
        const collection = result.collection;
        const uri = vscode.Uri.parse("untitled:" + getUnSaved(doc.fileName + ".postman_collection.json"));
        const collectionDoc = await vscode.workspace.openTextDocument(uri);
        showEditor(collectionDoc, JSON.stringify(collection));
    }
    return;
}
