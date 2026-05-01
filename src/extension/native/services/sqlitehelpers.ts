import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import { IHistoryService, HistoryItem } from '../../web/types/history';
import { UrlStore } from "../../web/types/url";

export class SqliteHistoryService implements IHistoryService {
    private db: DatabaseSync;
    private _urlStore: UrlStore;

    private get urlStore(): UrlStore {
        return this._urlStore;
    }

    constructor(location: string, urlStore: UrlStore) {
        // Ensure directory exists
        if (!fs.existsSync(location)) {
            fs.mkdirSync(location, { recursive: true });
        }

        // Create database file path
        const dbPath = path.join(location, 'history.db');
        console.log(`SQLite: Initializing database at ${dbPath}`);

        // Open/create database
        this.db = new DatabaseSync(dbPath);

        // Initialize schema
        this.initializeSchema();

        this._urlStore = urlStore;
        console.log('SQLite: History service initialized successfully');
    }

    private initializeSchema(): void {
        // Create history table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                http TEXT NOT NULL,
                url TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                time TEXT NOT NULL,
                filename TEXT NOT NULL,
                target TEXT NOT NULL,
                workspace TEXT,
                response_body TEXT,
                response_headers TEXT
            )
        `);

        // Create indexes for better query performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_history_filename ON history(filename);
            CREATE INDEX IF NOT EXISTS idx_history_time ON history(time DESC);
            CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
        `);

        // Log current count
        const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM history');
        const result = countStmt.get() as { count: number };
        console.log(`SQLite: Database has ${result.count} history items`);
    }

    async fetchByFileName(filename: String): Promise<[{ url: string }]> {
        if (!filename) {
            return [] as unknown as [{ url: string }];
        }

        const stmt = this.db.prepare(`
            SELECT url FROM history
            WHERE filename = ?
            ORDER BY id DESC
            LIMIT 10
        `);

        const results = stmt.all(String(filename)) as { url: string }[];
        return results as unknown as [{ url: string }];
    }

    async getById(id: number): Promise<HistoryItem> {
        const stmt = this.db.prepare('SELECT * FROM history WHERE id = ?');
        const result = stmt.get(id) as any;

        if (!result) {
            throw new Error(`History item with id ${id} not found`);
        }

        return this.rowToHistoryItem(result);
    }

    async addNew(history: HistoryItem): Promise<void> {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO history (http, url, status_code, time, filename, target, workspace, response_body, response_headers)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                history.http,
                history.url,
                history.status_code,
                history.time.toISOString(),
                history.filename,
                history.target,
                history.workspace || null,
                history.response_body || null,
                history.response_headers || null
            );

            // Set the _id from the database result
            history._id = result.lastInsertRowid as number;

            console.log(`SQLite: Added history item - ${history.url} (${history.status_code}) with id=${history._id}`);
            this.urlStore.addUrl(history.url);
        } catch (error) {
            console.error('SQLite addNew error:', error);
            throw error;
        }
    }

    async fetchMore(skip: number = 0, limit: number = 10): Promise<HistoryItem[]> {
        try {
            const stmt = this.db.prepare(`
                SELECT id as _id, http, url, time, status_code, filename, target, workspace, response_body, response_headers
                FROM history
                ORDER BY time DESC
                LIMIT ? OFFSET ?
            `);

            const results = stmt.all(limit, skip) as any[];
            console.log(`SQLite: Fetched ${results.length} history items (skip: ${skip}, limit: ${limit})`);
            return results.map(row => this.rowToHistoryItem(row));
        } catch (error) {
            console.error('SQLite fetchMore error:', error);
            return [];
        }
    }

    async fetchAll(): Promise<HistoryItem[]> {
        const stmt = this.db.prepare(`
            SELECT id as _id, url, time, status_code, filename, target, http, workspace, response_body, response_headers
            FROM history
            ORDER BY time DESC
        `);

        const results = stmt.all() as any[];
        return results.map(row => this.rowToHistoryItem(row));
    }

    private rowToHistoryItem(row: any): HistoryItem {
        return {
            _id: row.id || row._id,
            http: row.http,
            url: row.url,
            status_code: row.status_code,
            time: new Date(row.time),
            filename: row.filename,
            target: row.target,
            workspace: row.workspace,
            response_body: row.response_body,
            response_headers: row.response_headers
        };
    }

    /**
     * Close the database connection
     * Should be called when the extension is deactivated
     */
    close(): void {
        this.db.close();
    }
}
