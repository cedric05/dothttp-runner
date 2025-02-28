import { Disposable, Event, FileChangeEvent, FileStat, FileSystemProvider, FileType, Uri } from "vscode";
import { ClientHandler } from "./client";
import * as vscode from 'vscode';
import { WriteFileOperationResult } from "./fstypes";



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
    async stat(uri: Uri): Promise<FileStat> {
        const ret = await this.clientHandler.statFile(uri);
        if ("error" in ret) {
            switch (ret.error_message) {
                case "FileNotFound":
                    throw vscode.FileSystemError.FileNotFound(uri);
                case "PermissionDenied":
                    throw vscode.FileSystemError.NoPermissions(uri);
                case "FileIsADirectory":
                    throw vscode.FileSystemError.FileIsADirectory(uri);
                case "UnknownError":
                    throw vscode.FileSystemError.Unavailable;
            }
            throw new Error(ret.error_message);
        } else {
            const [st_mode, st_ino, st_dev, st_nlink, st_uid, st_gid, st_size, st_atime, st_mtime, st_ctime] = ret.result.stat;
            return {
                type: (st_mode & 61440) === 16384 ? vscode.FileType.Directory : vscode.FileType.File,
                ctime: st_ctime * 1000,
                mtime: st_mtime * 1000,
                size: st_size,
            };
        }
    }
    async readDirectory(uri: Uri): Promise<[string, vscode.FileType][]> {
        var ret = await this.clientHandler.readDirectory(uri);
        return ret.result.files.map(([name, type]) => {
            switch (type) {
                case "file":
                    return [name, vscode.FileType.File];
                case "directory":
                    return [name, vscode.FileType.Directory];
                case "symlink":
                    return [name, vscode.FileType.SymbolicLink];
                default:
                    return [name, vscode.FileType.Unknown];
            }
        });
    }
    createDirectory(uri: Uri): void | Thenable<void> {
        throw new Error("Method not create directory.");
    }
    async readFile(uri: Uri): Promise<Uint8Array> {
        var ret = await this.clientHandler.readFile(uri);
        if ("error" in ret) {
            switch (ret.error_message) {
                case "FileNotFound":
                    throw vscode.FileSystemError.FileNotFound(uri);
                case "PermissionDenied":
                    throw vscode.FileSystemError.NoPermissions(uri);
                case "FileIsADirectory":
                    throw vscode.FileSystemError.FileIsADirectory(uri);
                case "UnknownError":
                    throw vscode.FileSystemError.Unavailable;
            }
            throw new Error(ret.error_message);
        } else {
            // convert base64 to buffer
            var content = Buffer.from(ret.result.content, 'base64');
            return new Uint8Array(content);
        }
    }
    async writeFile(uri: Uri, content: Uint8Array,
        options: { readonly create: boolean; readonly overwrite: boolean; }): Promise<void> {
        var ret: WriteFileOperationResult = await this.clientHandler.writeFile(uri, content);
        if ("error" in ret) {
            switch (ret.error_message) {
                case "FileNotFound":
                    throw vscode.FileSystemError.FileNotFound(uri);
                case "PermissionDenied":
                    throw vscode.FileSystemError.NoPermissions(uri);
                case "FileIsADirectory":
                    throw vscode.FileSystemError.FileIsADirectory(uri);
                case "UnknownError":
                    throw vscode.FileSystemError.Unavailable;
            }
            throw new Error(ret.error_message);
        }
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