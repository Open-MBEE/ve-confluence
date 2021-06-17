import {
    ConfluencePage,
    ConfluenceDocument,
    PageMetadata,
    DocumentMetadata,
} from '../class/confluence';

export interface GlobalObjects {
    k_page: ConfluencePage;
    gm_page: PageMetadata | null;
    k_document: ConfluenceDocument | null;
    gm_document: DocumentMetadata | null;
}

let g_global_objects: GlobalObjects | null = null;

export async function global_objects(b_force=false): Promise<GlobalObjects> {
    if(!b_force && g_global_objects) {
        return g_global_objects;
    }

	const k_page = await ConfluencePage.fromCurrentPage();

    const [
        gm_page,
        k_document,
    ] = await Promise.all([
        // fetch page metadata
        (async() => (await k_page.getMetadata(b_force))?.value || null)(),

        // fetch document from page
        k_page.getDocument(b_force),
    ]);

	// not a document member; exit
	if(!k_document) {
		throw new Error(`Page is not part of a VE document`);
	}

	// fetch document metadata
	const g_document_meta = await k_document.getMetadata(b_force);

	// no metadata; error
	if(!g_document_meta) {
		throw new Error(`Document exists but no metadata`);
	}

    // document metadata
    const gm_document = g_document_meta?.value || null;

    return g_global_objects = {
        k_page,
        gm_page,
        k_document,
        gm_document,
    };
};
