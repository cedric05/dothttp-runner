import { Disposable, Event, FileChangeEvent, FileStat, FileSystemProvider, FileType, Uri } from "vscode";
import { ClientHandler } from "./client";
import * as vscode from 'vscode';
import { FsErrorResult, SimpleOperationResult } from "./fstypes";



export class SimpleFsProvider implements FileSystemProvider {
    private clientHandler: ClientHandler;
    constructor(clientHandler: ClientHandler) {
        this.clientHandler = clientHandler;
    }
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

    onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;

    watch(_uri: Uri, __options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): Disposable {
        throw new Error("method not implemented.");
    }
    async stat(uri: Uri): Promise<FileStat> {
        const ret = await this.clientHandler.statFile(uri);
        if ("error" in ret) {
            throw this.handleError(ret);
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
        if ("error" in ret) {
            throw this.handleError(ret);
        } else {
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
    }
    async createDirectory(uri: Uri) {
        var ret = await this.clientHandler.createDirectory(uri);
        if ("error" in ret) {
            throw this.handleError(ret
            );
        }
    }
    async readFile(uri: Uri): Promise<Uint8Array> {
        var ret = await this.clientHandler.readFile(uri);
        if ("error" in ret) {
            throw this.handleError(ret);
        } else {
            var content = Buffer.from(ret.result.content, 'base64');
            return new Uint8Array(content);
        }
    }
    async writeFile(uri: Uri, content: Uint8Array,
        __options: { readonly create: boolean; readonly overwrite: boolean; }): Promise<void> {
        var ret: SimpleOperationResult = await this.clientHandler.writeFile(uri, content);
        if ("error" in ret) {
            throw this.handleError(ret);
        }
    }
    async delete(uri: Uri, __options: { readonly recursive: boolean; }) {
        var ret = await this.clientHandler.deleteFile(uri);
        if ("error" in ret) {
            throw this.handleError(ret);
        }
    }
    async rename(oldUri: Uri, newUri: Uri, __options: { readonly overwrite: boolean; }) {
        var ret = await this.clientHandler.renameFile(oldUri, newUri);
        if ("error" in ret) {
            throw this.handleError(ret);
        }
    }
    async copy(source: Uri, destination: Uri, __options: { readonly overwrite: boolean; }) {
        var ret = await this.clientHandler.copyFile(source, destination);
        if ("error" in ret) {
            throw this.handleError(ret);
        }
    }


    handleError(result: FsErrorResult): vscode.FileSystemError | Error {
        switch (result.error_message) {
            case "FileNotFound":
                return vscode.FileSystemError.FileNotFound();
            case "PermissionDenied":
                return vscode.FileSystemError.NoPermissions();
            case "FileIsADirectory":
                return vscode.FileSystemError.FileIsADirectory();
            case "UnknownError":
                return vscode.FileSystemError.Unavailable();
            default:
                return Error(result.error_message);
        }
    }
}