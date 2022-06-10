
export interface HistoryItem {
    http: string;
    url: string;
    status_code: number;
    time: Date;
    filename: string;
    target: string;
    _id?: number;
}


export interface IHistoryService {
    getById(id: number): Promise<HistoryItem>;
    addNew(history: HistoryItem): Promise<void>;
    fetchMore(): Promise<HistoryItem[]>;
    fetchMore(skip: number): Promise<HistoryItem[]>;
    fetchMore(skip: number, limit: number): Promise<HistoryItem[]>;
    fetchByFileName(filename: String): Promise<[{ url: string; }]>;
}
