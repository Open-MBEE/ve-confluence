import type {
	DotFragment,
	JsonObject,
	JsonValue,
	PrimitiveObject,
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

import XhtmlDocument, { XHTMLDocument } from './xhtml-document';

import type {MmsSparqlConnection} from '#/model/Connection';

import {G_META} from '#/common/meta';

import {
	JsonMetadataBundle,
	JsonMetadataShape,
	MetadataBundleVersionDescriptor,
	WritableAsynchronousSerializationLocation,
} from '#/model/Serializable';

import type {VeoPath} from '#/common/veo';

import type {QueryTable} from '#/element/QueryTable/model/QueryTable';
import { uuid_v4 } from '#/util/dom';

const P_API_DEFAULT = '/rest/api';

type Hash = Record<string, string>;

export type Cxhtml = `${string}`;

export type MacroId = `${string}`;

export type ElementMap = Record<MacroId, VeoPath.Full>;

export interface PageMetadata extends JsonMetadataShape<'Page'> {
	schema: '1.0';
	elements: ElementMap;
	paths: {
		elements?: {
			serialized?: {
				queryTable?: QueryTable.Serialized;
			};
		};
	};
}

const G_DEFAULT_PAGE_METADATA: PageMetadata = {
	type: 'Page',
	schema: '1.0',
	elements: {},
	paths: {},
};

export interface DocumentMetadata extends JsonMetadataShape<'Document'> {
	schema: '1.0';
	paths: {
		connection?: {
			sparql?: {
				mms?: {
					dng?: MmsSparqlConnection.Serialized;
				};
			};
		};
	};
}

const G_DEFAULT_DOCUMENT_METADATA: DocumentMetadata = {
	type: 'Document',
	schema: '1.0',
	paths: {},
};

type PageOrDocumentMetadata = PageMetadata | DocumentMetadata;

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
		MetadataType extends JsonMetadataShape=JsonMetadataShape,
		KeyString extends Ve4MetadataKey=Ve4MetadataKey,
	> = {
		id: PageId;
		key: KeyString;
		value: MetadataType;
		version: Version;
	};

	export type KeyedInfo<
		MetadataType extends JsonMetadataShape=JsonMetadataShape,
		KeyString extends Ve4MetadataKey=Ve4MetadataKey,
	> = {
		[si_key in Ve4MetadataKey]: Info<MetadataType, KeyString>;
	};

	export interface ContentResponse<
		PageType extends BasicPage=BasicPage,
		MetadataWrapper extends KeyedInfo=KeyedInfo,  // eslint-disable-line @typescript-eslint/ban-types
	> extends JsonObject {
		results: ContentResult<PageType, MetadataWrapper>[];
		start: number;
		limit: number;
		size: number;
		_links: Hash;
	}

	export type ContentResult<
		PageType extends BasicPage=BasicPage,
		MetadataWrapper extends KeyedInfo=KeyedInfo,  // eslint-disable-line @typescript-eslint/ban-types
	> = PageType & {
		metadata: {
			properties: MetadataWrapper & {
				_expandable: Hash;
			};
			_expandable: Hash;
		};
	};
}

type PageMetadataBundle = JsonMetadataBundle<PageMetadata>;
type DocumentMetadataBundle = JsonMetadataBundle<DocumentMetadata>;

// export type GenericConfluenceWrappedMetadataBundle<
// 	ObjectType extends PageOrDocumentMetadata=PageOrDocumentMetadata,
// 	KeyString extends Ve4MetadataKey=Ve4MetadataKey,
// > = {
// 	[T in KeyString]: JsonMetadataBundle<ObjectType>;
// } & JsonObject;

export type GenericConfluenceWrappedMetadataBundle<
	ObjectType extends PageOrDocumentMetadata=PageOrDocumentMetadata,
	KeyString extends Ve4MetadataKey=Ve4MetadataKey,
> = ConfluenceApi.KeyedInfo<ObjectType, KeyString>;

type ConfluenceWrappedPageMetadataBundle = GenericConfluenceWrappedMetadataBundle<PageMetadata, Ve4MetadataKeyPage>;
type ConfluenceWrappedDocumentMetadataBundle = GenericConfluenceWrappedMetadataBundle<DocumentMetadata, Ve4MetadataKeyDocument>;
type ConfluenceWrappedMetadataBundle = ConfluenceWrappedPageMetadataBundle | ConfluenceWrappedDocumentMetadataBundle;


type BasicPageWithAncestorsType = ConfluenceApi.BasicPage & {
	ancestors: ConfluenceApi.BasicPage[];
};

type PageInfo = ConfluenceApi.ContentResult<
	BasicPageWithAncestorsType,
	ConfluenceApi.KeyedInfo<PageMetadata, Ve4MetadataKeyPage>
>;

type PageContent = ConfluenceApi.ContentResult<ConfluenceApi.PageWithContent>;

type DocumentInfo = ConfluenceApi.ContentResult<
	BasicPageWithAncestorsType,
	ConfluenceApi.KeyedInfo<DocumentMetadata, Ve4MetadataKeyDocument>
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
	BundleType extends ConfluenceWrappedMetadataBundle,
>(s_page_title: string, si_metadata_key: Ve4MetadataKey=G_VE4_METADATA_KEYS.CONFLUENCE_PAGE): Promise<ConfluenceApi.ContentResult<BasicPageWithAncestorsType, BundleType> | null> {
	const g_res = await confluence_get_json<ConfluenceApi.ContentResponse<BasicPageWithAncestorsType, BundleType>>(`/content`, {
		search: {
			type: 'page',
			spaceKey: G_META.space_key,
			title: s_page_title,
			expand: `ancestors,metadata.properties.${si_metadata_key}`,
		},
	});

	if(g_res.error) {
		debugger;
		console.error(`Unhandled HTTP error response: ${g_res.error.errors.join('\n')}`);
		return null;
	}

	const a_results = g_res.data.results;

	// no ve4 metadata
	if(!a_results.length) return null;

	//
	return a_results[0];
}

function normalize_metadata<
	ObjectType extends PageOrDocumentMetadata,
>(g_info?: ConfluenceApi.Info<ObjectType>): JsonMetadataBundle<ObjectType> | null {
	// no ve4 metadata
	if(!g_info || !g_info.value) return null;

	// check schema version
	switch(g_info.value.schema) {
		// OK (latest)
		case '1.0': {
			break;
		}

		// unrecognized version; metadata is corrupt
		default: {
			throw new Error(`Unrecognized VE4 schema version: ${g_info.value.schema as string}`);
		}
	}

	// return property
	return {
		schema: '1.0',
		version: g_info.version,
		data: g_info.value,
		storage: g_info,
	};
}

const H_CACHE_PAGES: Record<string, ConfluencePage> = {};

export abstract class ConfluenceEntity<MetadataType extends PageOrDocumentMetadata> extends WritableAsynchronousSerializationLocation<MetadataType> {
	abstract postMetadata(gm_document: MetadataType, n_version: number, s_message: string): Promise<JsonObject>;

	writeMetadataObject(g_metadata: MetadataType, g_version: MetadataBundleVersionDescriptor): Promise<JsonObject> {
		return this.postMetadata(g_metadata, g_version.number, g_version.message);
	}

	async writeMetadataValue(w_value: JsonValue, a_frags: DotFragment[], s_message=''): Promise<JsonObject> {
		// start at metadata object root
		const g_bundle = await this.fetchMetadataBundle();

		// no existing metadata object
		if(!g_bundle) {
			throw new Error(`Cannot create page/document metadata ad-hoc as part of value write operation`);
		}

		// should be full path
		if(4 !== a_frags.length) {
			throw new Error(`Refusing to overwrite non-leaf node`);
		}

		const h_root = g_bundle.data;
		let h_node: JsonObject = h_root;

		for(let i_frag=0, nl_frags=a_frags.length; i_frag<nl_frags-1; i_frag++) {
			const si_frag = a_frags[i_frag];

			// branch does not yet exist, create it
			if(!(si_frag in h_node)) {
				h_node = h_node[si_frag] = {};
			}
			// use existing branch
			else {
				h_node = h_node[si_frag] as JsonObject;
			}
		}

		// assign value to proper place
		h_node[a_frags[a_frags.length-1]] = w_value;

		// write object
		return await this.writeMetadataObject(h_root, {
			number: g_bundle.version.number+1,
			message: `PUT ${a_frags.join('.')}`+(s_message? `: ${s_message}`: ''),
		});
	}
}

export interface MacroConfig {
	uuid?: string;
	params?: Hash;
	body: Node;
}

export function autoCursorMutate(yn_node: Node, k_contents: XhtmlDocument): void {
	const a_add = autoCursor(yn_node, k_contents);
	console.assert(a_add.length);

	// no siblings added
	if(a_add.length <= 1) return;

	// shift from beginning
	let yn_shift = a_add.shift();

	// sibling added before
	if(yn_shift && yn_node !== yn_shift) {
		yn_node.parentNode?.insertBefore(yn_shift, yn_node);

		// shift past self
		a_add.shift();
	}

	// shift from beginning again
	yn_shift = a_add.shift();

	// sibling added after
	if(yn_shift && yn_node !== yn_shift) {
		yn_node.parentNode?.appendChild(yn_shift);
	}
}

export function autoCursor(yn_node: Node, k_contents: XhtmlDocument): Node[] {
	const f_builder = k_contents.builder();

	const a_nodes = [];

	const yn_sibling_prev = yn_node.previousSibling;
	if(!yn_sibling_prev || 'p' !== yn_sibling_prev.nodeName) {
		a_nodes.push(f_builder('p', {
			class: 'auto-cursor-target',
		}, [f_builder('br')]));
	}

	a_nodes.push(yn_node);

	const yn_sibling_next = yn_node.nextSibling;
	if(!yn_sibling_next || 'p' !== yn_sibling_next?.nodeName) {
		a_nodes.push(f_builder('p', {
			class: 'auto-cursor-target',
		}, [f_builder('br')]));
	}

	return a_nodes;
}

export function wrapCellInHtmlMacro(s_html: string, k_contents: XhtmlDocument): Node {
	const f_builder = k_contents.builder();

	return f_builder('div', {
		class: 'content-wrapper',
	}, [
		...autoCursor(f_builder('ac:structured-macro', {
			'ac:name': 'html',
			'ac:schema-version': '1',
			'ac:macro-id': uuid_v4().replace(/_/g, '-'),
		}, [
			f_builder('ac:plain-text-body', {}, [
				k_contents.createCDATA(s_html),
			]),
		]), k_contents),
	]);
}


export class ConfluencePage extends ConfluenceEntity<PageMetadata> {
	static annotatedSpan(gc_macro: MacroConfig, k_contents: XhtmlDocument): Node {
		const f_builder = k_contents.builder();

		return f_builder('ac:structured-macro', {
			'ac:name': 'span',
			'ac:schema-version': '1',
			'ac:macro-id': `${gc_macro.uuid || uuid_v4().replace(/_/g, '-')}`,
		}, [
			...Object.entries(gc_macro.params || {}).reduce((a_out: Node[], [si_param, s_value]) => [
				...a_out,
				f_builder('ac:parameter', {
					'ac:name': si_param,
				}, [s_value]),
			], []),
			f_builder('ac:parameter', {
				'ac:name': 'atlassian-macro-output-type',
			}, ['INLINE']),
			f_builder('ac:rich-text-body', {}, [
				...autoCursor(gc_macro.body, k_contents),
			]),
		]);
	}

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
		super();

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

		return (this._g_content = d_res.data || null);
	}

	private async _info(b_force=false): Promise<PageInfo | null> {
		// info already cached and not a force fetch; return cached copy
		if(this._b_cached_info && !b_force) return this._g_info;

		// fetch properties
		const g_info = await fetch_page_properties<ConfluenceWrappedPageMetadataBundle>(this._s_page_title, G_VE4_METADATA_KEYS.CONFLUENCE_PAGE);

		// now there is cached copy
		this._b_cached_info = true;

		// save to field and return
		return (this._g_info = g_info);
	}

	async getAncestry(b_force=false): Promise<ConfluenceApi.BasicPage[]> {
		return (await this._info(b_force))?.ancestors || [];
	}

	async fetchMetadataBundle(b_force=false): Promise<PageMetadataBundle | null> {
		const g_info = await this._info(b_force);

		if(!g_info?.metadata.properties[G_VE4_METADATA_KEYS.CONFLUENCE_PAGE]) {
			await this.initMetadata();
		}

		return normalize_metadata<PageMetadata>(g_info?.metadata.properties[G_VE4_METADATA_KEYS.CONFLUENCE_PAGE]);
	}

	async getVersionNumber(b_force=false): Promise<ConfluenceApi.PageVersionNumber> {
		const g_page = await this._content(b_force);

		return g_page?.version.number || 1;
	}

	async getContentAsString(b_force=false): Promise<{versionNumber: ConfluenceApi.PageVersionNumber; value: Cxhtml}> {
		const g_page = await this._content(b_force);

		return {
			versionNumber: g_page?.version.number || 1,
			value: g_page?.body.storage.value || '',
		};
	}

	async getContentAsXhtmlDocument(): Promise<{versionNumber: ConfluenceApi.PageVersionNumber; document: XhtmlDocument}> {
		const {
			versionNumber: n_version,
			value: sx_value,
		} = await this.getContentAsString();

		return {
			versionNumber: n_version,
			document: new XhtmlDocument(sx_value),
		};
	}

	async postContent(k_contents: XhtmlDocument, s_message=''): Promise<Response<JsonObject>> {
		const {
			versionNumber: n_version,
		} = await this.getContentAsXhtmlDocument();

		// const f_builder = k_content.builder();

		// const yn_wrapped = f_builder('ac:structured-macro', {
		// 	'ac:name': 'html',
		// 	'ac:macro-id': 've-table',
		// }, [
		// 	f_builder('ac:plain-text-body', {}, [
		// 		k_content.createCDATA(s_content),
		// 	]),
		// ]);

		// const yn_macros = f_builder('p', {
		// 	class: 'auto-cursor-target',
		// }, [
		// 	f_builder('ac:link', {}, [
		// 		f_builder('ri:page', {
		// 			'ri:content-title': 'CAE CED Table Element',
		// 		}),
		// 	]),
		// ]);

		// const found_element = k_content.select<Element>('//ac:structured-macro');
		// const init_element = k_content.select<Node>('//ac:link');

		// if(init_element.length) {
		// 	k_content.replaceChild(yn_macros, init_element[0]);
		// 	k_content.appendChild(yn_wrapped);
		// }
		// else if(found_element.length) {
		// 	k_content.replaceChild(yn_wrapped, found_element[0]);
		// }

		// if(k_contents.root.childNodes)

		const s_contents = k_contents.toString();


		return await confluence_put_json(`/content/${this._si_page}`, {
			json: {
				id: this.pageId,
				type: 'page',
				title: this.pageTitle,
				space: {
					key: G_META.space_key,
				},
				body: {
					storage: {
						representation: 'storage',
						value: s_contents,
					},
				},
				version: {
					number: n_version + 1,
					message: s_message,
				},
			},
		});
	}

	async initMetadata(n_version: ConfluenceApi.PageVersionNumber=1): Promise<PageMetadataBundle | null> {
		const gm_page: PageMetadata = G_DEFAULT_PAGE_METADATA;

		if(await this.postMetadata(gm_page, n_version, 'Initialization')) {
			return this.fetchMetadataBundle(true);
		}
		else {
			return null;
		}
	}

	async postMetadata(gm_page: PageMetadata, n_version=1, s_message=''): Promise<JsonObject> {
		const g_payload = {
			json: {
				key: G_VE4_METADATA_KEYS.CONFLUENCE_PAGE,
				value: gm_page,
				version: {
					minorEdit: true,
					number: n_version,
					message: s_message,
				},
			},
		};

		await confluence_put_json(`/content/${this._si_page}/property/${G_VE4_METADATA_KEYS.CONFLUENCE_PAGE}`, g_payload);

		return g_payload;
	}

	async isDocumentCoverPage(): Promise<boolean> {
		return await new ConfluenceDocument(this._si_page, this._s_page_title).isDocumentCoverPage();
	}

	async getDocument(b_force=false): Promise<ConfluenceDocument | null> {
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
}

export class ConfluenceDocument extends ConfluenceEntity<DocumentMetadata> {
	static fromPage(k_page: ConfluencePage): ConfluenceDocument {
		return new ConfluenceDocument(k_page.pageId, k_page.pageTitle);
	}

	static async createNew(k_page: ConfluencePage, h_paths: JsonObject={}, b_bypass=false): Promise<ConfluenceDocument> {
		if(!b_bypass && await k_page.isDocumentMember()) {
			throw new Error(`Cannot create document from page which is already member of a document`);
		}

		const k_document = ConfluenceDocument.fromPage(k_page);
		const gm_document: DocumentMetadata = {
			...G_DEFAULT_DOCUMENT_METADATA,
			paths: h_paths,
		};

		const n_version = (await k_document.fetchMetadataBundle())?.version.number || 0;
		await k_document.postMetadata(gm_document, n_version + 1);

		return k_document;
	}

	private readonly _si_cover_page: ConfluenceApi.PageId;

	private readonly _s_cover_page_title: string;

	private _b_cached_info = false;

	private _g_info: DocumentInfo | null = null;

	constructor(si_cover_page: ConfluenceApi.PageId, s_cover_page_title: string) {
		super();

		this._si_cover_page = si_cover_page;
		this._s_cover_page_title = s_cover_page_title;
	}

	private async _info(b_force=false): Promise<DocumentInfo | null> {
		// info already cached and not a force fetch; return cached copy
		if(this._b_cached_info && !b_force) return this._g_info;

		// fetch properties
		const g_info = await fetch_page_properties<ConfluenceWrappedDocumentMetadataBundle>(this._s_cover_page_title, G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT);

		// now there is cached copy
		this._b_cached_info = true;

		// save to field and return
		return (this._g_info = g_info);
	}

	get coverPageId(): ConfluenceApi.PageId {
		return this._si_cover_page;
	}

	getCoverPage(): ConfluencePage {
		return new ConfluencePage(this._si_cover_page, this._s_cover_page_title);
	}

	async fetchMetadataBundle(b_force=false): Promise<DocumentMetadataBundle | null> {
		return normalize_metadata<DocumentMetadata>(
			(await this._info(b_force))?.metadata.properties[G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT]
		);
	}

	async postMetadata(gm_document: DocumentMetadata, n_version=1, s_message=''): Promise<JsonObject> {
		const g_payload = {
			json: {
				key: G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT,
				value: gm_document,
				version: {
					minorEdit: true,
					number: n_version,
					message: s_message,
				},
			},
		};

		await confluence_put_json(`/content/${this._si_cover_page}/property/${G_VE4_METADATA_KEYS.CONFLUENCE_DOCUMENT}`, g_payload);

		return g_payload;
	}

	async isDocumentCoverPage(b_force=false): Promise<boolean> {
		return !!(await this.fetchMetadataBundle(b_force))?.data;
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
