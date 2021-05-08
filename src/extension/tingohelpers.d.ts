export interface history {
    http: string;
    url: string;
    status_code: number;
    time: Date;
    filename: string;
    target: string;
    _id?: number;
}
export interface IHistoryService {
    getById(id: number): Promise<history>;
    addNew(history: history): Promise<void>;
    fetchMore(): Promise<history[]>;
    fetchMore(skip: number): Promise<history[]>;
    fetchMore(skip: number, limit: number): Promise<history[]>;
    fetchByFileName(filename: String): Promise<[{
        url: string;
    }]>;
}
export declare class TingoHistoryService implements IHistoryService {
    static readonly collectionName = "history";
    private _collection;
    constructor(location: string);
    fetchByFileName(filename: String): Promise<[{
        url: string;
    }]>;
    getById(_id: number): Promise<history>;
    addNew(history: history): Promise<void>;
    fetchMore(skip?: number, limit?: number): Promise<history[]>;
}
