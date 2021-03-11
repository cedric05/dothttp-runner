const Db = require('tingodb')().Db;
import fs = require('fs');

export interface history {
    http: string,
    url: string,
    status_code: number,
    time: Date,
    filename: string,
    target: string
    id?: number
}


export interface IHistoryService {
    addNew(history: history): Promise<void>
    fetchMore(): Promise<history[]>
    fetchMore(skip: number): Promise<history[]>
    fetchMore(skip: number, limit: number): Promise<history[]>
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
    async addNew(history: history): Promise<void> {
        return new Promise((resolve, reject) => {
            this._collection.insert(history, (error) => {
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
            const cursor = this._collection.find({}).skip(skip).limit(limit);
            cursor.toArray((error, results) => {
                resolve(results)
            })
        })
    }
}