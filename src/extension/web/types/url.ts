export interface UrlsModel {
    date: Date;
    url: string;
}

export interface UrlStore {
    addUrl(url: string): void;
    fetchUrls(): Array<UrlsModel>;
}
