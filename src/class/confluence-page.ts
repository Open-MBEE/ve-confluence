import G_META from '../common/meta';
import XHTMLDocument from './xhtml-document';
import {
	qsa,
	dm_main,
} from '../util/dom';

const SI_VE4_METADATA_PROPERTY_KEY = 've4';

type Hash = Record<string, string>;

interface FetchConfig {
	headers?: Hash;
}

async function get_json(pr_uri: string, gc_fetch: FetchConfig|null=null): Promise<JSON> {
	// attempt fetch request
	let d_res;
	try {
		d_res = await fetch(pr_uri, {
			method: 'GET',
			mode: 'cors',
			headers: {
				'Accept': 'application/json',
				...(gc_fetch || {}).headers || {},
			},
		});
	}
	// network error
	catch(e_fetch) {
		// TODO: handle network error
		throw e_fetch;
	}

	// non-200
	if(!d_res.ok) {
		// TODO: handle HTTP error
		throw new Error(`non-200 response: ${d_res.status} """\n${await d_res.text()}\n"""`);
	}

	// return parsed JSON object
	return await d_res.json();
}

async function confluence_get(pr_path: string, gc_get?: {search?: Hash}): Promise<Record<string, any>> {
	// complete path with API
	pr_path = `${P_API_DEFAULT}${pr_path}`;

	// append search params
	if(gc_get?.search) pr_path += '?'+(new URLSearchParams(gc_get.search));

	return await get_json(pr_path);
}

const P_API_DEFAULT = '/rest/api';

interface PageDescriptor {
	version: {
		number: number;
	},
	body: {
		storage: {
			value: string;
		},
	},
}

interface SourceDescriptor {
	mopid: string;
	ref: string;
	commit: string;
	graph: string;
}


export interface Ve4Metadata {
	schema: '1.0';
	type: 'cover' | 'folder' | 'page';
	sources: {
		doors?: SourceDescriptor;
	},
}

interface ConfluenceProperty {
	id: `${number}`,
	key: string,
	value: Ve4Metadata,
	version: {
		when: string,
		message: string,
		number: number,
		minorEdit: false,
		hidden: boolean,
	},
}

async function fetch_ve4_metadata(s_page_title: string): Promise<ConfluenceProperty | null> {
	const g_res = await confluence_get(`/content`, {
		search: {
			type:'page',
			spaceKey: G_META.space_key,
			title: s_page_title.replace(/ /g, '+'),
			expand: `metadata.properties.${SI_VE4_METADATA_PROPERTY_KEY}`,
		},
	});

	const a_results = g_res.results;

	// no ve4 metadata
	if(!a_results.length) return null;

	// ref metadata
	const g_ve4 = a_results[0].metadata.properties[SI_VE4_METADATA_PROPERTY_KEY] as ConfluenceProperty | undefined;

	// no ve4 metadata
	if(!g_ve4) return null;

	// check schema version
	switch(g_ve4.value.schema) {
		// OK (latest)
		case '1.0': {
			break;
		}

		// unrecognized version; metadata is corrupt
		default: {
			throw new Error(`Unrecognized VE4 schema version: ${g_ve4.value.schema}`);
		}
	}

	// return property
	return g_ve4;
}

export class ConfluencePage {
	static async this() {
		const k_page = new ConfluencePage(G_META.page_id);
		const dm_modified = document.querySelector('a.last-modified') as HTMLAnchorElement;
		const s_search = (new URL(dm_modified.href)).search;
		const a_versions = (new URLSearchParams(s_search)).getAll('selectedPageVersions');

		// deduce page version
		const n_local = a_versions?.length? +a_versions[a_versions.length-1]: 1;

		// compare versions
		const n_remote = await k_page.version();

		// versions are out-of-sync
		if(n_local !== n_remote) {
			throw new Error(`Page is out of sync. Please reload`);
		}

		return k_page;
	}

	_si_page: string;
	_g_page: PageDescriptor | null = null;

	constructor(si_page: string) {
		this._si_page = si_page;
	}

	async cache(): Promise<PageDescriptor> {
		return this._g_page = await confluence_get(`/content/${this._si_page}`, {
			search: {
				expand: [
					'body.storage',
					'version',
				].join(','),
			},
		}) as unknown as PageDescriptor;
	}

	async _page(): Promise<PageDescriptor> {
		return await (this._g_page || this.cache());
	}


	async version(): Promise<number> {
		const g_page = await this._page();

		return g_page.version.number;
	}

	async content(): Promise<string> {
		const g_page = await this._page();

		return g_page.body.storage.value;
	}

	async document(): Promise<XHTMLDocument> {
		return new XHTMLDocument(await this.content());
	}



	/**
	 * Fetches metadata about the current document
	 * @returns the metadata object
	 */
	async metadata(): Promise<Ve4Metadata | undefined> {
		// select page ancestry to deduce which is the document cover page
		const a_ancestry = qsa(dm_main, 'ol#breadcrumbs>li span a').map(dm => dm?.textContent || '');

		// narrow down to possible cover pages
		const a_investigate = a_ancestry.slice(2);
		const nl_investigate = a_investigate.length;

		// examine each in ascending order
		for(let i_check=nl_investigate-1; i_check>=0; i_check--) {
			const s_page_title = a_investigate[i_check];

			// attempt to fetch ve4 metadata for page
			const g_ve4 = await fetch_ve4_metadata(s_page_title);

			// metadata exists; return it
			if(g_ve4) return g_ve4.value;
		}
	}
}

export default ConfluencePage;
