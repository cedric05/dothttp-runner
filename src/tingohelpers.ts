const Db = require('tingodb')().Db;
import fs = require('fs');

export interface history {
    http: string,
    url: string,
    status_code: number,
    time: Date,
    filename: string,
    target: string
    _id?: number
}


export interface IHistoryService {
    getById(id: number): Promise<history>;
    addNew(history: history): Promise<void>
    fetchMore(): Promise<history[]>
    fetchMore(skip: number): Promise<history[]>
    fetchMore(skip: number, limit: number): Promise<history[]>
    fetchByFileName(filename: String): Promise<history[]>
}

export class TingoHistoryService implements IHistoryService {
    static readonly collectionName = 'history';
    private _collection: any;
    constructor(location: string) {
        if (!fs.existsSync(location)) {
            fs.mkdirSync(location);
        }
        const db = new Db(location, {});
        this._collection = db.collection(TingoHistoryService.collectionName);
    }

    async fetchByFileName(filename: String): Promise<history[]> {
        return new Promise((resolve, reject) => {
            this._collection.find({ filename }, (error: Error, results: history[]) => {
                resolve(results);
            })
        })
        
    }

    getById(_id: number): Promise<history> {
        return new Promise((resolve, reject) => {
            this._collection.findOne({ _id }, (error: Error, results: history) => {
                resolve(results);
            })
        })
    }
    async addNew(history: history): Promise<void> {
        return new Promise((resolve, reject) => {
            this._collection.insert(history, (error: Error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        })
    }
    async fetchMore(skip: number = 0, limit: number = 10): Promise<history[]> {
        return new Promise((resolve, reject) => {
            const cursor = this._collection.find({}, { time: 1, status_code: 1, filename: 1, target: 1, _id: 1 })
                .sort({ time: -1 })
                .skip(skip)
                .limit(limit);
            cursor.toArray((_error: Error, results: history[]) => {
                resolve(results)
            })
        })
    }
}