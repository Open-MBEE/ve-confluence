export type PageId = `${number}`;

class Document {
    constructor(si_page: PageId) {

    }

    async init() {
        
    }
}

export default {
    async fromPageId(si_page: PageId): Promise<Document> {
        const k_doc = new Document(si_page);
        await k_doc.init();
        return k_doc;
    },
};
