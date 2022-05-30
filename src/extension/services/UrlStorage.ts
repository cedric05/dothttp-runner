import { LocalStorageService } from "./storage";
import { UrlsModel } from "./UrlsModel";

const MAX_STORE = 100;


export class UrlStorageService {
    private static readonly URLKEY = "urls";
    storage: LocalStorageService;
    urls: UrlsModel[];

    constructor(storage: LocalStorageService) {
        this.storage = storage;
        this.urls = this.loadRecentUrls();
    }

    addUrl(url: string) {
        const insertionNeeded = this.urls.filter(item => item.url === url).length === 0;
        if (insertionNeeded) {
            this.urls.push({ date: new Date(), url })
            if (this.urls.length > MAX_STORE) {
                this.urls.shift()
            }
            this.storage.setValue(UrlStorageService.URLKEY, this.urls);
        }
    }

    public loadRecentUrls(): UrlsModel[] {
        return this.storage.getValue(UrlStorageService.URLKEY, []);

    }
    public fetchUrls(): UrlsModel[] {
        return this.urls;
    }

}