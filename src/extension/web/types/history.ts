
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
    fetchByFileName(filename: String): Promise<[{ url: string; }]>;
}
