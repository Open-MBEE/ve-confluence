import type {
	JsonObject,
	JsonValue,
} from '#/common/types';

import {
	Ve4MetadataKeyConfluencePage as Ve4MetadataKeyPage,
	G_VE4_METADATA_KEYS,
	Ve4MetadataKeyConfluenceDocument as Ve4MetadataKeyDocument,
	Ve4MetadataKey,
} from '#/common/static';

import {
	get_json,
	put_json,
	Response,
} from '#/util/fetch';

import XhtmlDocument from './xhtml-document';

import type {MmsSparqlConnection} from '#/model/Connection';
import type {MmsSparqlQueryTable} from "#/element/QueryTable/model/QueryTable";

import {G_META} from '#/common/meta';

const P_API_DEFAULT = '/rest/api';

type Hash = Record<string, string>;

export type Cxhtml = `${string}`;

export interface PageMetadata extends JsonObject {
	type: 'Page';
	schema: '1.0';
	published?: MmsSparqlQueryTable.Serialized | null;
	last?: MmsSparqlQueryTable.Serialized | null;
}

export interface DocumentMetadata extends JsonObject {
	type: 'Document';
	schema: '1.0';
	connection?: {
		sparql?: {
			mms?: {
				dng?: MmsSparqlConnection.Serialized;
			};
		};
	};
}

type Metadata = PageMetadata | DocumentMetadata;

export type PageMetadataBundle = {
	[T in Ve4MetadataKeyPage]: ConfluenceApi.Info;
};

export type DocumentMetadataBundle = {
	[T in Ve4MetadataKeyDocument]: ConfluenceApi.Info<
		Ve4MetadataKeyDocument,
		DocumentMetadata
	>;
};

type MetadataBundle = PageMetadataBundle | DocumentMetadataBundle;


export namespace ConfluenceApi {
	export type PageId = `${string}`;

	export type PageVersionNumber = number;

	export interface Version extends JsonObject {
		when: string;
		message: string;
		number: PageVersionNumber;
		minorEdit: false;
		hidden: boolean;
	}

	export interface BasicPage extends JsonObject {
		id: PageId;
		type: 'page' | string;
		status: string;
		title: string;
		_expandable: Hash;
	}

	export interface PageWithContent extends BasicPage {
		version: Version;
		body: {
			storage: {
				value: Cxhtml;
			};
		};
	}

	export type Info<
		Key extends Ve4MetadataKey = Ve4MetadataKeyPage,
		MetadataType extends JsonValue = PageMetadata,
	> = {
		id: PageId;
		key: Key;
		value: MetadataType;
		version: Version;
	};

	export interface ContentResponse<
		PageType extends BasicPage = BasicPage,
		MetadataWrapper extends JsonObject = {},  // eslint-disable-line @typescript-eslint/ban-types
	> extends JsonObject {
		results: ContentResult<PageType, MetadataWrapper>[];
		start: number;
		limit: number;
		size: number;
		_links: Hash;
	}

	export type ContentResult<
		PageType extends BasicPage = BasicPage,
		MetadataWrapper extends JsonObject = {},  // eslint-disable-line @typescript-eslint/ban-types
	> = PageType & {
		metadata: {
			properties: MetadataWrapper & {
				_expandable: Hash;
			};
			_expandable: Hash;
		};
	};
}

type BasicPageWithAncestorsType = ConfluenceApi.BasicPage & {
	ancestors: ConfluenceApi.BasicPage[];
};

type PageInfo = ConfluenceApi.ContentResult<
	BasicPageWithAncestorsType,
	PageMetadataBundle
>;

type PageContent = ConfluenceApi.ContentResult<ConfluenceApi.PageWithContent>;

type DocumentInfo = ConfluenceApi.ContentResult<
	BasicPageWithAncestorsType,
	DocumentMetadataBundle
>;

async function confluence_get_json<Data extends JsonObject>(pr_path: string, gc_get?: {search?: Hash}): Promise<Response<Data>> {
	// complete path with API
	pr_path = `${P_API_DEFAULT}${pr_path}`;

	// forward to fetch method
	return await get_json<Data>(pr_path, gc_get);
}

async function confluence_put_json<Data extends JsonObject>(pr_path: string, gc_post?: {body?: string; json?: JsonValue}): Promise<Response<Data>> {
	// complete path with API
	pr_path = `${P_API_DEFAULT}${pr_path}`;

	// forward to fetch method
	return await put_json<Data>(pr_path, gc_post);
}

async function fetch_page_properties<
	BundleType extends MetadataBundle = PageMetadataBundle,
>(s_page_title: string, si_metadata_key: Ve4MetadataKey=G_VE4_METADATA_KEYS.CONFLUENCE_PAGE): Promise<ConfluenceApi.ContentResult<
	BasicPageWithAncestorsType,
	BundleType
	> | null> {
	const g_res = await confluence_get_json<
	ConfluenceApi.ContentResponse<BasicPageWithAncestorsType, BundleType>
	>(`/content`, {
		search: {
			type: 'page',
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

function normalize_metadata<
	Key extends Ve4MetadataKey,
	MetadataType extends Metadata,
>(g_metadata?: ConfluenceApi.Info<Key, MetadataType>) {
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
			throw new Error(`Unrecognized VE4 schema version: ${g_metadata.value.schema as string}`);
		}
	}

	// return property
	return g_metadata;
}

const H_CACHE_PAGES: Record<string, ConfluencePage> = {};

export class ConfluencePage {
	static async fromCurrentPage(): Promise<ConfluencePage> {
		const k_page = new ConfluencePage(G_META.page_id, G_META.page_title);
		const dm_modified = document.querySelector('a.last-modified') as HTMLAnchorElement;
		const s_search = new URL(dm_modified.href).search;
		const a_versions = new URLSearchParams(s_search).getAll('selectedPageVersions');

		// deduce page version
		const n_local = a_versions?.length? +a_versions[a_versions.length - 1]: 1;

		// compare versions
		const n_remote = await k_page.getVersionNumber();

		// versions are out-of-sync
		if(n_local !== n_remote) {
			throw new Error(`Page is out of sync. Please reload`);
		}

		return k_page;
	}

	static fromBasicPageInfo(g_info: ConfluenceApi.BasicPage): ConfluencePage {
		return new ConfluencePage(g_info.id, g_info.title);
	}

	private readonly _si_page!: ConfluenceApi.PageId;

	private readonly _s_page_title!: string;

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

	private async _content(b_force = false): Promise<PageContent | null> {
		if(this._b_cached_content && !b_force) return this._g_content;

		const d_res = await confluence_get_json<PageContent>(`/content/${this._si_page}`, {
			search: {expand:['version', 'body.storage'].join(',')},
		});

		if(d_res.error) {
			throw d_res.error;
		}
		else {
			this._b_cached_content = true;
		}

		return (this._g_content = d_res.data || null);
	}

	private async _info(b_force = false): Promise<PageInfo | null> {
		if(this._b_cached_info && !b_force) return this._g_info;

		let g_info = await fetch_page_properties(this._s_page_title);

		this._b_cached_info = true;

		return (this._g_info = g_info);
	}

	async getAncestry(b_force = false): Promise<ConfluenceApi.BasicPage[]> {
		return (await this._info(b_force))?.ancestors || [];
	}

	async getMetadata(b_force = false): Promise<ConfluenceApi.Info | null> {
		let g_info = await this._info(b_force);
		if (!g_info?.metadata.properties[G_VE4_METADATA_KEYS.CONFLUENCE_PAGE]) {
			await this.initMetadata();
		}
		return normalize_metadata<Ve4MetadataKeyPage, PageMetadata>(g_info?.metadata.properties[G_VE4_METADATA_KEYS.CONFLUENCE_PAGE]);
	}

	async getVersionNumber(b_force=false): Promise<ConfluenceApi.PageVersionNumber> {
		const g_page = await this._content(b_force);

		return g_page?.version.number || 1;
	}

	async getContentAsString(b_force=false): Promise<{
		versionNumber: ConfluenceApi.PageVersionNumber;
		value: Cxhtml;
	}> {
		const g_page = await this._content(b_force);

		return {
			versionNumber: g_page?.version.number || 1,
			value: g_page?.body.storage.value || '',
		};
	}

	async getContentAsXhtmlDocument(): Promise<{versionNumber: ConfluenceApi.PageVersionNumber; value: XhtmlDocument;}> {
		const {
			versionNumber: n_version,
			value: sx_value,
		} = await this.getContentAsString();

		return {
			versionNumber: n_version,
			value: new XhtmlDocument(sx_value),
		};
	}

	async postContent(s_content: string, s_message: string = ''): Promise<boolean> {
		let content = await this.getContentAsXhtmlDocument();
		let n_version = content?.versionNumber;
		let page_content = content?.value;
		let wrapped = page_content.builder()('ac:structured-macro', {
			'ac:name': 'html',
			'ac:macro-id': 've-table',
		}, [
			page_content.builder()('ac:plain-text-body', {}, [
				page_content.createCDATA(s_content)
			])
		]);
		let macros = page_content.builder()('p', {
			'class': 'auto-cursor-target'
		}, [
			page_content.builder()('ac:link', {}, [
				page_content.builder()('ri:page', {
					'ri:content-title': 'CAE CED Table Element'
				}, [])
			])
		]);

		let found_element = page_content.select<Node>('//ac:structured-macro');
		let init_element = page_content.select<Node>('//ac:link');

		if (init_element.length) {
			page_content.replaceChild(macros, init_element[0]);
			page_content.appendChild(wrapped);
		} else if (found_element.length) {
			page_content.replaceChild(wrapped, found_element[0]);
		}

		const response = await confluence_put_json(`/content/${this._si_page}`, {
			json: {
				id: this._si_page,
				type: 'page',
				title: this.pageTitle,
				body: {
					storage: {
						//value: "<p class=\"auto-cursor-target\"><ac:link><ri:page ri:content-title=\"CAE CED Table Element\" /></ac:link></p><p class=\"auto-cursor-target\"><br /></p><ac:structured-macro ac:name=\"span\" ac:schema-version=\"1\" ac:macro-id=\"b064d0ae-be2a-4ad8-ac8e-24e710f0ed86\"><ac:parameter ac:name=\"style\">display:none</ac:parameter><ac:parameter ac:name=\"atlassian-macro-output-type\">INLINE</ac:parameter><ac:rich-text-body><p class=\"auto-cursor-target\"><strong><span style=\"color: rgb(0,0,255);\">Connected Engineering Document. Do not edit nor delete this macro.</span></strong></p><ac:structured-macro ac:name=\"html\" ac:schema-version=\"1\" ac:macro-id=\"06617957-bc59-4490-9c84-f01440966a31\"><ac:plain-text-body><![CDATA[<script type=\"application/json\" id=\"ve4-init\">{\"schema\":\"1.0\",\"type\":\"document\",\"sources\":[]}</script>\n<script type=\"text/javascript\" src=\"https://ced-uat.jpl.nasa.gov/cdn/uat/bundle.js\"></script>]]></ac:plain-text-body></ac:structured-macro><p class=\"auto-cursor-target\"><br /></p></ac:rich-text-body></ac:structured-macro><p class=\"auto-cursor-target\"><br /></p>",
						value: page_content.toString(),
						representation: "storage",
					},
				},
				version: {
					number: n_version + 1,
					message: s_message,
				},
			},
		});

		return true;
	}

	async initMetadata(n_version: ConfluenceApi.PageVersionNumber = 1): Promise<ConfluenceApi.Info | null> {
		const gm_page: PageMetadata = {
			type: 'Page',
			schema: '1.0',
			published: null,
		};
		if (await this.postMetadata(gm_page, n_version, 'Initialization')) {
			return this.getMetadata(true);
		} else {
			return null;
		}
	}

	async postMetadata(gm_page: PageMetadata, n_version=1, s_message=''): Promise<boolean> {
		await confluence_put_json(`/content/${this._si_page}/property/${G_VE4_METADATA_KEYS.CONFLUENCE_PAGE}`, {
			json: {
				key: G_VE4_METADATA_KEYS.CONFLUENCE_PAGE,
				value: gm_page,
				version: {
					minorEdit: true,
					number: n_version,
					message: s_message,
				},
			},
		});

		return true;
	}

	async isDocumentCoverPage(): Promise<boolean> {
		return await new ConfluenceDocument(this._si_page, this._s_page_title).isDocumentCoverPage();
	}

	async getDocument(b_force = false): Promise<ConfluenceDocument | null> {
		// already cached and not forced; return answer
		if(this._b_cached_document && !b_force) return this._k_document;

		// fetch ancestry
		const a_ancestry = await this.getAncestry();

		// this is cover page; cache and return it
		if(await this.isDocumentCoverPage()) {
			this._b_cached_document = true;
			return (this._k_document = ConfluenceDocument.fromPage(this));
		}

		// traverse ancestry
		let k_node: ConfluencePage = this;
		for(const g_ancestor of a_ancestry) {
			// make page from ancestor basic page info
			k_node = ConfluencePage.fromBasicPageInfo(g_ancestor);

			// test for cover page; cache and return document
			if(await k_node.isDocumentCoverPage()) {
				this._b_cached_document = true;
				return (this._k_document = ConfluenceDocument.fromPage(k_node));
			}
		}

		// no ancestor is document cover page
		return null;
	}

	async isDocumentMember(): Promise<boolean> {
		return null !== await this.getDocument();
	}

    escapeSpecialChars(html: string): string {
		return html.replace(/\\n/g, "\\n")
			.replace(/\\'/g, "\\'")
			.replace(/\\"/g, '\\"')
			.replace(/\\&/g, "\\&")
			.replace(/\\r/g, "\\r")
			.replace(/\\t/g, "\\t")
			.replace(/\\b/g, "\\b")
			.replace(/\\f/g, "\\f");
    };
}

export class ConfluenceDocument {
	static fromPage(k_page: ConfluencePage): ConfluenceDocument {
		return new ConfluenceDocument(k_page.pageId, k_page.pageTitle);
	}

	static async createNew(k_page: ConfluencePage, b_bypass = false): Promise<ConfluenceDocument> {
		if(!b_bypass && await k_page.isDocumentMember()) {
			throw new Error(`Cannot create document from page which is already member of a document`);
		}

		const k_document = ConfluenceDocument.fromPage(k_page);
		const gm_document: DocumentMetadata = {
			type: 'Document',
			schema: '1.0',
			connection: {
				sparql: {
					mms: {
						dng: {
							type: 'MmsSparqlConnection',
							endpoint: 'https://ced.jpl.nasa.gov/sparql',
							modelGraph: 'https://opencae.jpl.nasa.gov/mms/rdf/graph/data.europa-clipper',
							metadataGraph: 'https://opencae.jpl.nasa.gov/mms/rdf/graph/metadata.clipper',
							contextPath: 'hardcoded#queryContext.sparql.dng.common',
						},
					},
				},
			},
		};

		const n_version = (await k_document.getMetadata())?.version.number || 0;
		await k_document.postMetadata(gm_document, n_version + 1);

		return k_document;
	}

	private readonly _si_cover_page: ConfluenceApi.PageId;

	private readonly _s_cover_page_title: string;

	private _b_cached_info = false;

	private _g_info: DocumentInfo | null = null;

	constructor(si_cover_page: ConfluenceApi.PageId, s_cover_page_title: string) {
		this._si_cover_page = si_cover_page;
		this._s_cover_page_title = s_cover_page_title;
	}

	private async _info(b_force = false): Promise<DocumentInfo | null> {
		if(this._b_cached_info && !b_force) return this._g_info;
		this._b_cached_info = true;
		return (this._g_info
			= await fetch_page_properties<DocumentMetadataBundle>(this._s_cover_page_title, G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT));
	}

	get coverPageId(): ConfluenceApi.PageId {
		return this._si_cover_page;
	}

	getCoverPage(): ConfluencePage {
		return new ConfluencePage(this._si_cover_page, this._s_cover_page_title);
	}

	async getMetadata(b_force = false): Promise<ConfluenceApi.Info<
		Ve4MetadataKeyDocument,
		DocumentMetadata
	> | null> {
		return normalize_metadata<Ve4MetadataKeyDocument, DocumentMetadata>(
			(await this._info(b_force))?.metadata.properties[G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT]
		);
	}

	async postMetadata(gm_document: DocumentMetadata, n_version=1, s_message=''): Promise<boolean> {
		await confluence_put_json(`/content/${this._si_cover_page}/property/${G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT}`, {
			json: {
				key: G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT,
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

	async isDocumentCoverPage(b_force = false): Promise<boolean> {
		return !!(await this.getMetadata(b_force))?.value;
	}

	// async getDataSource<SourceType extends Source>(si_key: SourceKey, b_force=false): Promise<SourceType | null> {
	// 	const h_sources = (await this.getMetadata(b_force))?.value.sources;
	// 	if(!h_sources) return null;
	// 	return (h_sources[si_key] as SourceType) || null;
	// }

	// async setDataSource<SourceType extends Source>(si_key: SourceKey, g_source: SourceType): Promise<boolean> {
	// 	const g_info = await this.getMetadata();
	// 	if(!g_info) return false;
	// 	const gm_document = g_info.value;
	// 	const h_sources = gm_document.sources = {};
	// 	h_sources[si_key] = g_source;
	// 	return await this.postMetadata(gm_document, ++g_info.version.number);
	// }
}
