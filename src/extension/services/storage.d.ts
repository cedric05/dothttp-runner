import { Memento } from "vscode";
export declare class LocalStorageService {
    private storage;
    static service: LocalStorageService;
    static getStorage(): LocalStorageService;
    constructor(storage: Memento);
    getValue<T>(key: string, value?: T | null): T;
    setValue<T>(key: string, value: T): void;
}
