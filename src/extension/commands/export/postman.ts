import * as vscode from 'vscode';
import { ApplicationServices } from '../../services/global';
import { getUnSaved } from '../../utils/fileUtils';
import { pickDirectoryToImport } from "../import";
import { showEditor } from '../run';
import path = require('path');
import { getPostmanClient } from './postmanUtils';
import { Workspace } from './postmanUtils';
import { Constants } from '../../models/constants';


enum PostmanUploadType {
    COLLECTION_FILE = "Export Postman Collection Local file",
    UPLOAD_TO_POSTMAN = "Upload to Postman Account"
}

export async function exportToPostman(uri: vscode.Uri) {
    const doc = await vscode.workspace.openTextDocument(uri);
    const result = await ApplicationServices.get().getClientHandler().exportToPostman(doc.fileName);
    if (result.error) {
        return vscode.window.showErrorMessage(`export postman failed with error, ${result}`);
    }
    const { collection } = result;
    const isUploadToPostman = await vscode.window.showQuickPick([
        { label: PostmanUploadType.COLLECTION_FILE, description: "Postman Collection(V2.1) Will Be Generated, Which Can Be Imported By Postman (default)" },
        { label: PostmanUploadType.UPLOAD_TO_POSTMAN, description: "Creates A Collection In Postman Workspace (needs postman api key visit https://web.postman.co/settings/me/api-keys)" }]
    );
    if (isUploadToPostman && isUploadToPostman.label === PostmanUploadType.UPLOAD_TO_POSTMAN) {
        try {
            // try uploading to postman
            await publishToPostman(collection, uri);
        } catch (error) {
            await vscode.window.showWarningMessage("Publish To Postman Ran Into Error, Will Export To A File. Which Can Be Imported By Postman");
            // in case of error resort to local collection
            await showInLocalFolder(doc, collection);
        }
    } else {
        // if user don't want to upload to postman
        await showInLocalFolder(doc, collection);
    }
    return;
}




async function showInLocalFolder(doc: vscode.TextDocument, collection: any) {
    const directory = await pickDirectoryToImport();
    if (!directory) {
        return;
    }
    const uri = vscode.Uri.parse("untitled:" + getUnSaved(path.join(directory, path.parse(doc.fileName).base) + ".postman_collection.json"));
    const collectionDoc = await vscode.workspace.openTextDocument(uri);
    showEditor(collectionDoc, JSON.stringify(collection));
}

async function publishToPostman(collection: Object, uri: vscode.Uri) {
    try {
        const postmanClient = await getPostmanClient();
        const workspaces = (await postmanClient.listWorkSpaces()).data.workspaces;
        // there will always be workspace
        // in some scenarios, if user deletes , workspace will not be there
        // upload to postman collection in such scenario
        if (workspaces && workspaces.length >= 1) {
            // pickedWorkspace will be updated in case of new workspace is asked by user
            let pickedWorkspace = await vscode.window.showQuickPick(
                [
                    // in this case workspace will be created in default postman workspace
                    {
                        "label": "any workspace",
                        "description": "collection will be created in default workspace",
                        "id": null,
                        "workspaceType": "ignore",
                    },
                    // dothttp-runner will create a new workspace, and create collection in that workspace
                    {
                        "label": "create new workspace",
                        "id": null,
                        "description": "new workspace will be created and collection will be created in that workspace",
                        "type": "new",
                        "workspaceType": "create",
                    },
                    // use existing workspace
                    ...workspaces.map(workspace => {
                        return {
                            "label": `workspace: ${workspace.name}, id: ${workspace.id}`,
                            "workspaceType": "existing",
                            "description": "use existing workspace",
                            ...workspace
                        }
                    }),
                ] as Array<vscode.QuickPickItem & Workspace & { workspaceType: "create" | "ignore" | "existing" }>);
            if (pickedWorkspace?.workspaceType === 'create') {
                const workspaceName = await vscode.window.showInputBox({
                    "title": 'enter workspace name',
                    "placeHolder": "workspace imported from dothttp",
                    "value": "workspace"
                });
                const createWorkspaceResponse = await postmanClient.createWorkspace(workspaceName ?? "workspace imported from dothttp");
                pickedWorkspace = Object.assign(pickedWorkspace, createWorkspaceResponse.data.workspace);
            }
            const response = pickedWorkspace ? await postmanClient.createCollections(collection, pickedWorkspace.id) : await postmanClient.createCollections(collection);
            // await postmanClient.openInBrowser(response.data.collection.uid);
            return await vscode.window.showInformationMessage(`Postman collection has been created with id: ${response.data.collection.uid}`);
        } else {
            await postmanClient.createCollections(collection);
        }

    } catch (error) {
        if ((error as Error & { isAxiosError: boolean }).isAxiosError) {
            const error = await vscode.window.showWarningMessage("Postman API Key is revoked and is removed, please try again now", "Enter Postman key again?");
            if (error === "Enter Postman key again?") {
                return await vscode.commands.executeCommand(Constants.EXPORT_RESOURCE_COMMAND, uri);
            }
        } else
            return await vscode.window.showErrorMessage("Unknown error happened, please create bug");
    }
}