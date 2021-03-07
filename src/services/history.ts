import { LocalStorageService } from "./storage";
import * as vscode from 'vscode'

interface HistoryItem {
    http: string,
    status_code: number,
    time: Date,
    meta: {
        filename: string,
        target: string,
    }
    id: number
}



interface Ihistory {
    getCurrentId(): number
    getMore(): Promise<HistoryItem[]>
}


class HistoryService implements Ihistory {
    history = "history"
    storage: LocalStorageService;

    constructor(storage: LocalStorageService) {
        this.storage = storage;
    }


    getCurrentId(): number {
        throw new Error("Method not implemented.");
    }
    getMore(): Promise<HistoryItem[]> {
        throw new Error("Method not implemented.");
    }
}