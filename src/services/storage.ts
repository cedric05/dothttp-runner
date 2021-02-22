import { Memento } from "vscode";

export class LocalStorageService {
    static service: LocalStorageService;

    static getStorage() {
        if (this.service)
            return LocalStorageService.service
        else {
            throw new Error("storage service not initialized properly")
        }
    }

    constructor(private storage: Memento) {
        this.storage = storage;
    }

    public getValue<T>(key: string, value: T | null = null): T {
        return this.storage.get<T>(key, value as unknown as T);
    }

    public setValue<T>(key: string, value: T) {
        this.storage.update(key, value);
    }
}