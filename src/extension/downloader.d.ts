/// <reference types="node" />
import { IncomingMessage } from 'http';
import { ExtensionContext } from 'vscode';
interface version {
    downloadUrls: {
        linux?: string;
        windows?: string;
        darwin?: string;
    };
    version: string;
    versionNotes?: string;
    stable: boolean;
    latest: boolean;
}
export declare function getStream(api: string): Promise<IncomingMessage>;
export declare function getJSON<T>(api: string): Promise<T>;
export declare function getVersion(): Promise<version>;
export declare function setUp(context: ExtensionContext): Promise<string | undefined>;
export declare function updateDothttpIfAvailable(globalStorageDir: string): Promise<void>;
export {};
