import G_META from '../common/meta';

import {
	Ve4MetadataKeyConfluencePage as Ve4MetadataKeyPage,
	G_VE4_METADATA_KEYS,
	Ve4MetadataKeyConfluenceDocument as Ve4MetadataKeyDocument,
	Ve4MetadataKey,
} from '../common/static';

import {
	get_json,
	post_json,
	JSONObject,
	JSONValue,
	Response,
} from '../util/fetch';

import XHTMLDocument from './xhtml-document';


const P_API_DEFAULT = '/rest/api';

type Hash = Record<string, string>;

export type CXHTML = `${string}`;

export interface PageMetadata extends JSONObject {
	schema: '1.0';
	type: 'page';
}

export interface DocumentMetadata extends JSONObject {
	schema: '1.0';
	type: 'document';
	sources: {
		[key in SourceKey]?: Source;
	};
}

type Metadata = PageMetadata | DocumentMetadata;

export type PageMetadataBundle = {
	[T in Ve4MetadataKeyPage]: ConfluenceApi.Info;
}

export type DocumentMetadataBundle = {
	[T in Ve4MetadataKeyDocument]: ConfluenceApi.Info<Ve4MetadataKeyDocument, DocumentMetadata>;
}

type MetadataBundle = PageMetadataBundle | DocumentMetadataBundle;


type SourceKeyDoorsNg = 'dng';
const SI_SOURCE_DOOORS_NG: SourceKeyDoorsNg = 'dng';

type SourceKeyHelix = 'helix';
const SI_SOURCE_HELIX: SourceKeyHelix = 'helix';

type SourceKey = SourceKeyDoorsNg | SourceKeyHelix;

interface CommonSource extends JSONObject {
	readonly key: SourceKey;
	readonly qualifier: string;
}

type NeptuneSource = CommonSource & {
	readonly endpoint: string;
	readonly graph: string;
	readonly modified: string;
}

export type DngMdkSource = NeptuneSource & {
	readonly key: 'dng';
	readonly ref: string;
	readonly mopid: string;
	readonly commit: string;
}

export type HelixSource = CommonSource & {
	readonly key: 'helix';
}

export type Source = DngMdkSource | HelixSource;

export namespace ConfluenceApi {
	export type PageId = `${string}`;
	
	export type PageVersionNumber = number;

	export interface Version extends JSONObject {
		when: string,
		message: string,
		number: PageVersionNumber,
		minorEdit: false,
		hidden: boolean,
	}

	export interface BasicPage extends JSONObject {
		id: PageId;
		type: 'page' | string;
		status: string;
		title: string;
		_expandable: Hash;
	}

	export interface PageWithContent extends BasicPage {
		version: Version,
		body: {
			storage: {
				value: CXHTML;
			},
		},
	}

	export type Info<Key extends Ve4MetadataKey=Ve4MetadataKeyPage, MetadataType extends JSONValue=PageMetadata> = {
		id: PageId;
		key: Key;
		value: MetadataType;
		version: ConfluenceApi.Version;
	}

	export interface ContentResponse<PageType extends BasicPage=BasicPage, MetadataWrapper extends JSONObject={}> extends JSONObject {
		results: ContentResult<PageType, MetadataWrapper>[];
		start: number;
		limit: number;
		size: number;
		_links: Hash;
	}

	export type ContentResult<PageType extends BasicPage=BasicPage, MetadataWrapper extends JSONObject={}> = PageType & {
		metadata: {
			properties: MetadataWrapper & {
				_expandable: Hash;
			},
			_expandable: Hash;
		},
	}
}

type BasicPageWithAncestorsType = ConfluenceApi.BasicPage & {ancestors: ConfluenceApi.BasicPage[];}
type PageInfo = ConfluenceApi.ContentResult<BasicPageWithAncestorsType, PageMetadataBundle>;
type PageContent = ConfluenceApi.ContentResult<ConfluenceApi.PageWithContent>;

type DocumentInfo = ConfluenceApi.ContentResult<BasicPageWithAncestorsType, DocumentMetadataBundle>;


async function confluence_get_json<Data extends JSONObject>(pr_path: string, gc_get?: {search?: Hash}): Promise<Response<Data>> {
	// complete path with API
	pr_path = `${P_API_DEFAULT}${pr_path}`;

	// forward to fetch method
	return await get_json<Data>(pr_path, gc_get);
}

async function confluence_post_json<Data extends JSONObject>(pr_path: string, gc_post?: {body?: string, json?: JSONValue}): Promise<Response<Data>> {
	// complete path with API
	pr_path = `${P_API_DEFAULT}${pr_path}`;

	// forward to fetch method
	return await post_json<Data>(pr_path, gc_post);
}


async function fetch_page_properties<BundleType extends MetadataBundle=PageMetadataBundle>(
	s_page_title: string, si_metadata_key: Ve4MetadataKey=G_VE4_METADATA_KEYS.CONFLUENCE_PAGE
): Promise<ConfluenceApi.ContentResult<BasicPageWithAncestorsType, BundleType> | null> {
	const g_res = await confluence_get_json<ConfluenceApi.ContentResponse<BasicPageWithAncestorsType, BundleType>>(`/content`, {
		search: {
			type:'page',
			spaceKey: G_META.space_key,
			title: s_page_title,
			expand: `ancestors,metadata.properties.${si_metadata_key}`,
		},
	});

	if(g_res.error) {
		debugger;
		console.error(`Unhandled HTTP error response: ${g_res.error}`);
		return null;
	}

	const a_results = g_res.data.results;

	// no ve4 metadata
	if(!a_results.length) return null;

	// 
	return a_results[0];
}

function normalize_metadata<Key extends Ve4MetadataKey, MetadataType extends Metadata>(g_metadata?: ConfluenceApi.Info<Key, MetadataType>) {
	// no ve4 metadata
	if(!g_metadata) return null;

	// check schema version
	switch(g_metadata.value.schema) {
		// OK (latest)
		case '1.0': {
			break;
		}

		// unrecognized version; metadata is corrupt
		default: {
			throw new Error(`Unrecognized VE4 schema version: ${g_metadata.value.schema}`);
		}
	}

	// return property
	return g_metadata;
}

const H_CACHE_PAGES: Record<string, ConfluencePage> = {};

export class ConfluencePage {
	static async fromCurrentPage() {
		const k_page = new ConfluencePage(G_META.page_id, G_META.page_title);
		const dm_modified = document.querySelector('a.last-modified') as HTMLAnchorElement;
		const s_search = (new URL(dm_modified.href)).search;
		const a_versions = (new URLSearchParams(s_search)).getAll('selectedPageVersions');

		// deduce page version
		const n_local = a_versions?.length? +a_versions[a_versions.length-1]: 1;

		// compare versions
		const n_remote = await k_page.getVersionNumber();

		// versions are out-of-sync
		if(n_local !== n_remote) {
			throw new Error(`Page is out of sync. Please reload`);
		}

		return k_page;
	}

	static fromBasicPageInfo(g_info: ConfluenceApi.BasicPage) {
		return new ConfluencePage(g_info.id, g_info.title);
	}

	private _si_page!: ConfluenceApi.PageId;
	private _s_page_title!: string;

	private _b_cached_content = false;
	private _g_content: PageContent | null = null;

	private _b_cached_info = false;
	private _g_info: PageInfo | null = null;

	private _b_cached_document = false;
	private _k_document: ConfluenceDocument | null = null;


	constructor(si_page: ConfluenceApi.PageId, s_page_title: string) {
		// args signature
		const si_args = `${si_page}:${s_page_title}`;

		// use cached page rather than waiting for async fetch call
		if(si_args in H_CACHE_PAGES) return H_CACHE_PAGES[si_args];

		// construct new page
		this._si_page = si_page;
		this._s_page_title = s_page_title;

		// cache instance
		H_CACHE_PAGES[si_args] = this;
	}

	get pageId(): ConfluenceApi.PageId {
		return this._si_page;
	}

	get pageTitle(): ConfluenceApi.PageId {
		return this._s_page_title;
	}

	private async _content(b_force=false): Promise<PageContent | null> {
		if(this._b_cached_content && !b_force) return this._g_content;

		const d_res = await confluence_get_json<PageContent>(`/content/${this._si_page}`, {
			search: {
				expand: [
					'version',
					'body.storage',
				].join(','),
			},
		});

		if(d_res.error) {
			throw d_res.error;
		}
		else {
			this._b_cached_content = true;
		}

		return this._g_content = d_res.data || null;
	}

	private async _info(b_force=false): Promise<PageInfo | null> {
		if(this._b_cached_info && !b_force) return this._g_info;

		const g_info = await fetch_page_properties(this._s_page_title);

		this._b_cached_info = true;

		return this._g_info = g_info;
	}

	async getAncestry(b_force=false): Promise<ConfluenceApi.BasicPage[]> {
		return (await this._info(b_force))?.ancestors || [];
	}

	async getMetadata(b_force=false): Promise<ConfluenceApi.Info | null> {
		return normalize_metadata<Ve4MetadataKeyPage, PageMetadata>((await this._info(b_force))?.metadata.properties[G_VE4_METADATA_KEYS.CONFLUENCE_PAGE]);
	}

	async getVersionNumber(b_force=false): Promise<ConfluenceApi.PageVersionNumber> {
		const g_page = await this._content(b_force);

		return g_page?.version.number || 1;
	}

	async getContentAsString(b_force=false): Promise<{versionNumber:ConfluenceApi.PageVersionNumber, value:CXHTML}> {
		const g_page = await this._content(b_force);

		return {
			versionNumber: g_page?.version.number || 1,
			value: g_page?.body.storage.value || '',
		};
	}

	async getContentAsXhtmlDocument(): Promise<{versionNumber:ConfluenceApi.PageVersionNumber, value:XHTMLDocument}> {
		const {
			versionNumber: n_version,
			value: sx_value,			
		} = await this.getContentAsString();

		return {
			versionNumber: n_version,
			value: new XHTMLDocument(sx_value),
		};
	}

	async postContent(n_version: ConfluenceApi.PageVersionNumber, s_content: CXHTML): Promise<ConfluenceApi.PageVersionNumber> {
		return 0;
	}

	async isDocumentCoverPage(): Promise<boolean> {
		return await (new ConfluenceDocument(this._si_page, this._s_page_title)).isDocumentCoverPage();
	}

	async getDocument(b_force=false): Promise<ConfluenceDocument | null> {
		// already cached and not forced; return answer
		if(this._b_cached_document && !b_force) return this._k_document;

		// fetch ancestry
		const a_ancestry = await this.getAncestry();

		// this is cover page; cache and return it
		if(await this.isDocumentCoverPage()) {
			this._b_cached_document = true;
			return this._k_document = ConfluenceDocument.fromPage(this);
		}

		// traverse ancestry
		let k_node: ConfluencePage = this;
		for(const g_ancestor of a_ancestry) {
			// make page from ancestor basic page info
			k_node = ConfluencePage.fromBasicPageInfo(g_ancestor);

			// test for cover page; cache and return document
			if(await k_node.isDocumentCoverPage()) {
				this._b_cached_document = true;
				return this._k_document = ConfluenceDocument.fromPage(k_node);
			}
		}
		
		// no ancestor is document cover page
		return null;
	}

	async isDocumentMember(): Promise<boolean> {
		return null !== await this.getDocument();
	}
}

export class ConfluenceDocument {
	private _si_cover_page: ConfluenceApi.PageId;
	private _s_cover_page_title: string;

	private _b_cached_info = false;
	private _g_info: DocumentInfo | null = null;

	static fromPage(k_page: ConfluencePage) {
		return new ConfluenceDocument(k_page.pageId, k_page.pageTitle);
	}

	static async createNew(k_page: ConfluencePage) {
		if(await k_page.isDocumentMember()) {
			throw new Error(`Cannot create document from page which is already member of a document`);
		}

		const k_document = ConfluenceDocument.fromPage(k_page);
		const gm_document: DocumentMetadata = {
			type: 'document',
			schema: '1.0',
			sources: {},
		};

		await k_document.postMetadata(gm_document);

		return k_document;
	}

	constructor(si_cover_page: ConfluenceApi.PageId, s_cover_page_title: string) {
		this._si_cover_page = si_cover_page;
		this._s_cover_page_title = s_cover_page_title;
	}

	get coverPageId(): ConfluenceApi.PageId {
		return this._si_cover_page;
	}

	getCoverPage(): ConfluencePage {
		return new ConfluencePage(this._si_cover_page, this._s_cover_page_title);
	}

	private async _info(b_force=false): Promise<DocumentInfo | null> {
		if(this._b_cached_info && !b_force) return this._g_info;
		this._b_cached_info = true;
		return this._g_info = await fetch_page_properties<DocumentMetadataBundle>(this._s_cover_page_title, G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT);
	}

	async getMetadata(b_force=false): Promise<ConfluenceApi.Info<Ve4MetadataKeyDocument, DocumentMetadata> | null> {
		return normalize_metadata<Ve4MetadataKeyDocument, DocumentMetadata>((await this._info(b_force))?.metadata.properties[G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT]);
	}

	async postMetadata(gm_document: DocumentMetadata, n_version=1, s_message=''): Promise<boolean> {
		await confluence_post_json(`/content/${this._si_cover_page}/property/${G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT}`, {
			json: {
				value: gm_document,
				version: {
					minorEdit: true,
					number: n_version,
					message: s_message,
				},
			},
		});

		return true;
	}

	async isDocumentCoverPage(b_force=false): Promise<boolean> {
		return !!(await this.getMetadata(b_force))?.value;
	}

	async getDataSource<SourceType extends Source>(si_key: SourceKey, b_force=false): Promise<SourceType | null> {
		const h_sources = (await this.getMetadata(b_force))?.value.sources;
		if(!h_sources) return null;
		return (h_sources[si_key] as SourceType) || null;
	}

	async setDataSource<SourceType extends Source>(si_key: SourceKey, g_source: SourceType): Promise<boolean> {
		const g_info = await this.getMetadata();
		if(!g_info) return false;
		const gm_document = g_info.value;
		const h_sources = gm_document.sources;
		h_sources[si_key] = g_source;
		return await this.postMetadata(gm_document, ++g_info.version.number);
	}
}
