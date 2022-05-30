import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as vscode from 'vscode';
import { Constants } from '../../models/constants';
import { ApplicationServices } from '../../services/global';
import { cleanEmpty } from '../../utils/fileUtils';


export interface WorkspaceListResponse {
    workspaces: Workspace[];
}

export interface Workspace {
    id: string;
    name: string;
    type: string;
    description?: string;
    collections?: Collection[];
}

export interface CollectionsListResponse {
    collections: Collection[];
}


export interface WorkspaceResponse {
    workspace: Workspace;
}

export interface Collection {
    id: string;
    name: string;
    uid: string;
    owner?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isPublic?: boolean;
}

export interface CreateCollectionResponse {
    collection: Collection;
}

export interface CollectionList {
    collection: CollectionItem;
}

export interface CollectionItem {
    info: Info;
    item: Array<any>;
}


export interface Info {
    _postman_id: string;
    name: string;
    description: string;
    schema: string;
}




export interface CurrentUserResponse {
    user: User;
    operations: Operation[];
}

export interface Operation {
    name: string;
    limit: number;
    usage: number;
    overage: number;
}

export interface User {
    id: number;
    username: string;
    email: string;
    fullName: string;
    avatar: null;
    isPublic: boolean;
}
const POSTMAN_URI = "https://api.getpostman.com";

export class PostmanClient {
    instance: AxiosInstance;

    constructor(key: string) {
        this.instance = axios.create({
            headers: {
                "X-API-key": key
            },
            validateStatus: function (status) {
                const validStatus = status >= 200 && status < 400;
                if (!validStatus) {
                    ApplicationServices.get().getContext()?.secrets.delete(Constants.SECRET_POSTMAN_API_KEY);
                }
                return validStatus; // default
            }
        },
        );
    }

    getWorkspace(id: string): Promise<AxiosResponse<WorkspaceResponse>> {
        return this.instance.get(`${POSTMAN_URI}/workspaces/${id}`);
    }
    createWorkspace(workspaceName: string): Promise<AxiosResponse<{ workspace: Workspace; }>> {
        return this.instance.post(`${POSTMAN_URI}/workspaces`, {
            "workspace": {
                "name": `${workspaceName} (imported from dothttp)`,
                "type": "personal",
                "description": "imported via dothttp"
            }
        }, { headers: { "content-type": "application/json" } });
    }

    getCurrentUserInfo(): Promise<AxiosResponse<CurrentUserResponse>> {
        const currentUrlInfo = `${POSTMAN_URI}/me`;
        return this.instance.get(currentUrlInfo);
    }

    listCollections(): Promise<AxiosResponse<CollectionsListResponse>> {
        return this.instance.get(`${POSTMAN_URI}/collections`);
    }

    createCollections(collection: Object, workspace?: string | null): Promise<AxiosResponse<CreateCollectionResponse>> {
        let params: { [key: string]: string; } = {};
        if (workspace) {
            params['workspace'] = workspace;
        }
        return this.instance.post(`${POSTMAN_URI}/collections`, {
            collection: cleanEmpty(collection)
        },
            {
                "params": params,
                "headers": {
                    "content-type": "application/json"
                }
            }
        );
    }

    listWorkSpaces(): Promise<AxiosResponse<WorkspaceListResponse>> {
        return this.instance.get(`${POSTMAN_URI}/workspaces`);
    }

    getCollection(collectionId: string): Promise<AxiosResponse<CollectionList>> {
        return this.instance.get(`${POSTMAN_URI}/collections/${collectionId}`);
    }
}


export async function getPostmanClient(): Promise<PostmanClient> {
    // retrive from vscode secret service
    // before saving postmankey into vscode secret data store
    // key will be validated, it will work, unless postman api key is revoked
    // incase of 401, we need to delete secret
    const postmanApiKey = await ApplicationServices.get().getContext()?.secrets.get(Constants.SECRET_POSTMAN_API_KEY);
    if (postmanApiKey) {
        return new PostmanClient(postmanApiKey);
    }
    const key = await vscode.window.showInputBox({
        "title": "visit https://web.postman.co/settings/me/api-keys , Generate API Key, paste here",
        "prompt": "visit https://web.postman.co/settings/me/api-keys , Generate API Key, paste here",
        "placeHolder": "PMAK-",
        "ignoreFocusOut": true,
        "validateInput": async function (inp) {
            if (inp.startsWith("PMAK-") && inp.length == 64) {
                try {
                    await new PostmanClient(inp).getCurrentUserInfo();
                    return;
                } catch (error) {
                    console.log(error);
                }
            }
            return "Postman API Key starts with `PMAK-`";
        }
    });
    if (key) {
        const postmanClient = new PostmanClient(key);
        await postmanClient.getCurrentUserInfo();
        // store in to secret data store
        await ApplicationServices.get().getContext()?.secrets.store(Constants.SECRET_POSTMAN_API_KEY, key);
        return postmanClient;
    }
    throw Error("Key not available");
}
