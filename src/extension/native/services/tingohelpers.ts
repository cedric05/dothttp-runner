const Db = require('tingodb')().Db;
import fs = require('fs');
// import { EventEmitter } from 'vscode';
import { IHistoryService, HistoryItem } from '../../web/types/history';
import { UrlStore } from "../../web/types/url";

export class TingoHistoryService implements IHistoryService {
    static readonly collectionName = 'history';
    private _collection: any;
    _urlStore: UrlStore;
    // adding here is bad.
    // TODO FIXME

    private get urlStore(): UrlStore {
        return this._urlStore;
    }
    constructor(location: string, urlStore: UrlStore, 
        //emitter: EventEmitter<HistoryItem>
        ) {
        if (!fs.existsSync(location)) {
            fs.mkdirSync(location);
        }
        const db = new Db(location, {});
        this._collection = db.collection(TingoHistoryService.collectionName);
        this._urlStore = urlStore;
        // let self = this;
        // emitter.event((history) => {
        //     self.addNew(history)
        // })
    }

    async fetchByFileName(filename: String): Promise<[{ url: string }]> {
        return new Promise(async (resolve, _reject) => {
            try {
                const cursor = await this._collection
                    .find({ filename: filename }, { url: 1 })
                    .sort({ _id: -1 })
                    .limit(10)
                cursor.toArray((_error: Error, results: Partial<HistoryItem>[]) => {
                    resolve(results as unknown as [{ url: string }])
                })
            } catch (error) {
                console.error('error happened');
                return [];
            }
        })

    }

    getById(_id: number): Promise<HistoryItem> {
        return new Promise((resolve, _reject) => {
            this._collection.findOne({ _id }, (_error: Error, results: HistoryItem) => {
                resolve(results);
            })
        })
    }
    async addNew(history: HistoryItem): Promise<void> {
        return new Promise((resolve, reject) => {
            this._collection.insert(history, (error: Error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
            this.urlStore.addUrl(history.url);
        })
    }
    async fetchMore(skip: number = 0, limit: number = 10): Promise<HistoryItem[]> {
        return new Promise((resolve, _reject) => {
            const cursor = this._collection.find({}, { url: 1, time: 1, status_code: 1, filename: 1, target: 1, _id: 1 })
                .sort({ time: -1 })
                .skip(skip)
                .limit(limit);
            cursor.toArray((_error: Error, results: HistoryItem[]) => {
                resolve(results)
            })
        })
    }

    async fetchAll(): Promise<HistoryItem[]> {
        return new Promise((resolve, _reject) => {
            const cursor = this._collection.find({}, { url: 1, time: 1, status_code: 1, filename: 1, target: 1, _id: 1, http: 1 })
                .sort({ time: -1 })
            cursor.toArray((_error: Error, results: HistoryItem[]) => {
                resolve(results)
            })
        })
    }
}