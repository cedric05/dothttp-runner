import { Disposable, Event, FileChangeEvent, FileStat, FileSystemProvider, FileType, Uri } from "vscode";
import { ClientHandler } from "./client";
import * as vscode from 'vscode';

export class SimpleFsProvider implements FileSystemProvider {
    private clientHandler: ClientHandler;
    constructor(clientHandler: ClientHandler) {
        this.clientHandler = clientHandler;
    }

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

    onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;

    watch(uri: Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): Disposable {
        throw new Error("Method not watch.");
    }
    stat(uri: Uri): FileStat | Thenable<FileStat> {
        return this.clientHandler.statFile(uri);
    }
    readDirectory(uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> {
        return this.clientHandler.readDirectory(uri);
    }
    createDirectory(uri: Uri): void | Thenable<void> {
        throw new Error("Method not create directory.");
    }
    readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
        return this.clientHandler.readFile(uri);
    }
    writeFile(uri: Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): void | Thenable<void> {
        return this.clientHandler.writeFile(uri, content);
    }
    delete(uri: Uri, options: { readonly recursive: boolean; }): void | Thenable<void> {
        throw new Error("Method not delete.");
    }
    rename(oldUri: Uri, newUri: Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error("Method not rename.");
    }
    copy?(source: Uri, destination: Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
        throw new Error("Method not copy.");
    }
}