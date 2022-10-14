import {
	ConfluencePage,
	ConfluenceDocument,
} from '#/vendor/confluence/module/confluence';

import type {
	ConfluenceXhtmlDocument,
} from '#/vendor/confluence/module/confluence';

import G_META from '#/common/meta';

import {
	process,
	lang,
	static_css,
	static_js,
} from '#/common/static';

import {format} from '#/util/intl';

import {
	qs,
	qsa,
	dm_content,
	dm_main_header,
	uuid_v4,
	dm_main,
	remove_all_children,
} from '#/util/dom';

import type {SvelteComponent} from 'svelte';

import ControlBar from '#/element/ControlBar/component/ControlBar.svelte';

import QueryTable from '#/element/QueryTable/component/QueryTable.svelte';


import {MmsSparqlQueryTable} from '#/element/QueryTable/model/QueryTable';


import {
	K_HARDCODED,
} from '#/common/hardcoded';

import type {
	Context,
} from '#/model/Serializable';

import {ObjectStore} from '#/model/ObjectStore';

import {
	xpathSelect1,
} from '#/vendor/confluence/module/xhtml-document';

import {
	inject_frame,
} from './inject-frame';

import {Transclusion} from '#/element/Transclusion/model/Transclusion';

import TransclusionComponent from '#/element/Transclusion/component/TransclusionComponent.svelte';

import type {SvelteComponentDev} from 'svelte/internal';


// write static css
{
	const dm_style = document.createElement('style');
	dm_style.innerHTML = static_css;
	document.body.appendChild(dm_style);
}

// write global js
{
	const dm_script = document.createElement('script');
	dm_script.type = 'text/javascript';
	dm_script.innerHTML = static_js;
	document.body.appendChild(dm_script);
}

/**
 * tuple of a node's corresponding HTML element and a struct with properties to be used later
 */
type Handle = [HTMLElement, Record<string, unknown>];

interface Correlation {
	/**
	 * svelte component to render in place of directive
	 */
	component: typeof SvelteComponent;

	/**
	 * svelte props to pass to the component's constructor
	 */
	props?: Record<string, unknown>;
}

interface ViewBundle extends Correlation {
	/**
	 * anchor point to insert component before
	 */
	anchor: HTMLElement;
	/**
	 * directive's corresponding XML node in the Wiki page's storage XHTML document
	 */
	node: Node;
}

type DirectiveDescriptor = (a_handle: Handle) => Correlation;

enum Ve4Error {
	UNKNOWN,
	PERMISSIONS,
	METADATA,
}

enum Ve4ErrorLevel {
	INFO,
	WARN,
	ERROR,
	FATAL,
}

type ControlBarConfig = {
	error?: Ve4Error;
	message?: string;
	props?: Record<string, any>;
};

let K_OBJECT_STORE: ObjectStore;
let k_page: ConfluencePage;
let kv_control_bar: ControlBar;
const G_CONTEXT: Context = {} as Context;

const xpath_attrs = (a_attrs: string[]) => a_attrs.map(sx => `[${sx}]`).join('');

let k_document: ConfluenceDocument | null;
let k_source: ConfluenceXhtmlDocument;

function render_component(g_bundle: ViewBundle, b_hide_anchor = false) {
	const dm_anchor = g_bundle.anchor;

	// hide anchor
	if(b_hide_anchor && dm_anchor) {
		dm_anchor.style.display = 'none';
	}
	// https://svelte.dev/docs#run-time-client-side-component-api-creating-a-component
	// render component
	new g_bundle.component({
		target: dm_anchor.parentNode as HTMLElement,
		anchor: dm_anchor,
		props: {
			...g_bundle.props || {},
			yn_directive: g_bundle.node,
			dm_anchor: dm_anchor
		},
	});
}
function getJsonFromScript(text: string) {
	return text.replace('//<![CDATA[', '').replace('//]]>', '');
}
export async function main(): Promise<void> {
	if('object' !== typeof lang?.basic) {
		throw new Error(`ERROR: No lang file defined! Did you forget to set the environment variables when building?`);
	}
	kv_control_bar = new ControlBar({
		target: dm_main_header as HTMLElement,
		anchor: qs(dm_main_header, 'div#navigation'),
		props: {
			g_context: G_CONTEXT,
		},
	});

	k_page = await ConfluencePage.fromCurrentPage();

	await Promise.allSettled([
		(async() => {
			// fetch page metadata
			const g_meta = await k_page.fetchMetadataBundle(true);

			// get or initialize page metadata
		})(),

		(async() => {
			// page is part of document
			k_document = await k_page.fetchDocument();
		})(),

		(async() => {
			// load page's XHTML source
			k_source = (await k_page.fetchContentAsXhtmlDocument()).document || null;
		})(),
	]);

	// not a document member
	if(!k_document) {
		// exit
		return;
	}

	// initialize object store
	G_CONTEXT.store = K_OBJECT_STORE = new ObjectStore({
		page: k_page,
		document: k_document,
		hardcoded: K_HARDCODED,
	});

	// set page source
	G_CONTEXT.source = k_source;

	// set page original source
	G_CONTEXT.source_original = k_source.clone();

	// set page
	G_CONTEXT.page = k_page;

	// set document
	G_CONTEXT.document = k_document;

	// fetch document metadata
	const gm_document = await k_document.fetchMetadataBundle();

	// no metadata; error
	if(!gm_document) {
		throw new Error(`Document exists but no metadata`);
	}

	//find initial nexus tables
	{
		// xpath query for rendered elements
		const a_macros = k_source.select<Node>(`//ac:structured-macro[@ac:name="cae-nexus-table"]`);
		const a_divs = qsa(dm_main, '.nexus-table-init');
		if (a_macros.length != a_divs.length) {
			console.log('table counts don\'t match');
		}
		for (let i = 0; i < a_macros.length; i++) {
			const dm_anchor = a_divs[i];
			const si_uuid = uuid_v4().replace(/_/g, '-');
			const si_key = `embedded#elements.serialized.queryTable.${si_uuid}`;
			const k_model = new MmsSparqlQueryTable(si_key,
				{
					type: 'MmsSparqlQueryTable',
					key: si_key,
					uuid: si_uuid,
					group: 'dng',
					queryTypePath: 'hardcoded#queryType.sparql.dng.bid',
					connectionPath: 'document#connection.sparql.mms.dng',
					parameterValues: {},
				},
				G_CONTEXT
			);
			// inject component
			render_component({
				component: QueryTable,
				anchor: dm_anchor as HTMLElement,
				node: a_macros[i],
				props: {
					k_model,
					b_published: false,
				},
			}, false);
		}
	}
	// interpret transclusions
	{
		// xpath query for rendered elements
		const a_macros = k_source.select<Node>(`//ac:structured-macro[@ac:name="html"][child::ac:parameter[@ac:name="id"][starts-with(text(),"embedded#elements.serialized.transclusion")]]`);

		// translate into ve paths
		const a_paths = a_macros.map(yn => [xpathSelect1<Text>(`./ac:parameter[@ac:name="id"]/text()`, yn).data, yn] as [string, Node]);

		// resolve serialized element
		for(const [sp_element, yn_directive] of a_paths) {
			// correlate to live DOM element
			const a_candidates = qsa(dm_main, `.ve-output-publish-anchor[id="${sp_element}"]`);

			// incorrect match
			if(1 !== a_candidates.length) {
				throw new Error(`Expected exactly 1 element on page with id="${sp_element}" but found ${a_candidates.length}`);
			}

			const dm_anchor = a_candidates[0] as HTMLElement;

			// select previous element
			// const dm_script = qs(dm_anchor.parentElement, `script#ve-metadata-${}[type="application/json"]`);
			const dm_script = dm_anchor.previousElementSibling;
			if(!dm_script || 'SCRIPT' !== dm_script.tagName) {
				throw new Error(`Embedded element is missing script metadata`);
			}

			// parse element metadata
			const gc_element = JSON.parse(dm_script.textContent || '{}') as Transclusion.Serialized;
			const k_model = await new Transclusion(sp_element, gc_element, G_CONTEXT).ready(); //VeOdm.createFromSerialized(Transclusion, sp_element, gc_element, G_CONTEXT)
			dm_anchor.innerHTML = "";
				// inject component
			render_component({
				component: TransclusionComponent,
				anchor: dm_script as HTMLElement,
				node: yn_directive,
				props: {
					k_model,
					b_published: true,
				},
			}, true);
		}
	}

	// interpret published tables
	{
		// xpath query for rendered elements
		const a_macros = k_source.select<Node>(`//ac:structured-macro[@ac:name="div"][child::ac:parameter[@ac:name="id"][starts-with(text(),"embedded#elements.serialized.queryTable")]]`);

		// translate into ve paths
		const a_paths = a_macros.map(yn => [xpathSelect1<Text>(`./ac:parameter[@ac:name="id"]/text()`, yn).data, yn] as [string, Node]);

		// resolve serialized element
		for(const [sp_element, yn_directive] of a_paths) {
			//const gc_element = await K_OBJECT_STORE.resolve(sp_element);

			// correlate to live DOM element
			const a_divs = qsa(dm_main, `div[id="${sp_element}"]`);

			// incorrect match
			if(1 !== a_divs.length) {
				throw new Error(`Expected exactly 1 annotated div element on page with id="${sp_element}" but found ${a_divs.length}`);
			}

			const dm_render = a_divs[0] as HTMLElement;
			const id = sp_element.split('.')[3];
			const a_scripts = qsa(dm_main, `script[data-ve-eid="${id}"]`);
			if (1 !== a_scripts.length) {
				throw new Error(`Expected 1 script for id=${id} but found ${a_scripts.length}`);
			}
			const dm_script = a_scripts[0];
			const gc_element = JSON.parse(getJsonFromScript(dm_script.textContent!) || '{}') as MmsSparqlQueryTable.Serialized;

			// get gc_element
			// select adjacent element
			let dm_anchor = dm_render.querySelector('div.table-wrap') as HTMLElement;
			const k_model = await new MmsSparqlQueryTable(sp_element, gc_element, G_CONTEXT).ready();
			// inject component
			render_component({
				component: QueryTable,
				anchor: dm_anchor,
				node: yn_directive,
				props: {
					k_model,
					b_published: true,
				},
			}, false);
		}
	}
}

const H_HASH_TRIGGERS: Record<string, (de_hash_change?: HashChangeEvent) => Promise<void>> = {
	async 'load-editor'() {
		// apply beta changes
		replace_edit_button();

		if(!p_original_edit_link) {
			throw new Error(`Original page edit button link was never captured`);
		}
		return await inject_frame(p_original_edit_link);
	},

	async 'admin'(de_hash_change?: HashChangeEvent) {
		if(de_hash_change && de_hash_change.oldURL !== de_hash_change.newURL) {
			location.reload();
		}

		await Promise.resolve();
	},

	async 'beta'() {
		const m_path = /^(.*[^+])\+*$/.exec(location.pathname);
		if(m_path) {
			const s_expect = m_path[1]+'+';
			if(location.pathname !== s_expect) {
				location.href = s_expect+'#beta';
				return;
			}
		}
		else {
			console.error(`Unmatchable pathname: ${location.pathname}`);
		}

		// update version info
		kv_control_bar.$set({s_app_version:`${process.env.VERSION}-beta`});

		// // apply beta changes
		// replace_edit_button();

		await Promise.resolve();
	},

	async 'noop'() {
		const dm_edit = qs(dm_main, 'a#editPageLink')! as HTMLAnchorElement;
		dm_edit.href = '#noop';

		await Promise.resolve();
	},
};


let p_original_edit_link = '';
const S_VE_PATCHED = 'vePatched';
type MutableHistory = History & {
	[S_VE_PATCHED]: boolean;
}

function replace_edit_button() {
	// history not yet patched
	if(!(history as MutableHistory)[S_VE_PATCHED]) {
		(history as MutableHistory)[S_VE_PATCHED] = true;
		const f_push = history.pushState;
		history.pushState = (w_state: unknown, s_title: string, p_url: string) => {
			// edit mode
			if(/^\/pages\/editpage\.action/.test(p_url)) {
				const p_load_editor = location.pathname+'+++#editor';
				queueMicrotask(() => {
					location.href = p_load_editor;
				});

				setTimeout(() => {
					location.href = p_load_editor;
				}, 200);
				return;
			}

			// default
			f_push.call(history, w_state, s_title, p_url);
		};

		// window.addEventListener('beforeunload', () => {
		// 	debugger;
		// });
	}

	// already replaced
	if(p_original_edit_link) return;

	const dm_edit = qs(dm_main, 'a#editPageLink')! as HTMLAnchorElement;
	p_original_edit_link = dm_edit.href;
	dm_edit.href = '#load-editor';

	// remove all event listeners
	const dm_clone = dm_edit.cloneNode(true);
	dm_edit.parentNode?.replaceChild(dm_clone, dm_edit);
	
}

function hash_updated(de_hash_change?: HashChangeEvent): void {
	const a_hashes = location.hash.slice(1).split(/:/g);

	for(const si_hash of a_hashes) {
		if(si_hash in H_HASH_TRIGGERS) {
			void H_HASH_TRIGGERS[si_hash](de_hash_change);
		}
	}
}

const H_PATH_SUFFIX_TO_HASH: Record<string, string> = {
	'+': 'beta',
	'++': 'admin',
	'+++': 'load-editor',
};

function dom_ready() {
	// apply beta changes
	replace_edit_button();

	// listen for hash change
	window.addEventListener('hashchange', hash_updated as (de: Event) => void);

	INTERPRET_LOCATION: {
		let si_page_title = location.pathname;

		// viewpage.action
		if(location.pathname.endsWith('viewpage.action')) {
			const y_params = new URLSearchParams(location.search);

			// normalize viewpage URL
			si_page_title = encodeURIComponent(y_params.get('title')!).replace(/%20/g, '+');

			// replace URL with page title version
			history.replaceState(null, '', `/display/${y_params.get('spaceKey')!}/${si_page_title}`);
		}
		// doeditpage.action
		else if(location.pathname.endsWith('doeditpage.action')) {
			// normalize viewpage URL
			si_page_title = encodeURIComponent(G_META.page_title).replace(/%20/g, '+');

			// redirect to view page
			location.href = `/display/${G_META.space_key}/${si_page_title}`;
		}

		// special url indication
		const m_special = /(\++)$/.exec(si_page_title);
		if(m_special) {
			const s_suffix = m_special[1];

			// suffix is mapped
			if(s_suffix in H_PATH_SUFFIX_TO_HASH) {
				// lookup corresponding hash
				const s_set_hash = H_PATH_SUFFIX_TO_HASH[s_suffix];

				// resolve hash parts
				const as_parts = new Set(location.hash.slice(1).split(/:/g).filter(s => s));

				// hash already set
				if(as_parts.has(s_set_hash)) {
					// manually trigger hash update
					hash_updated();
				}
				// hash not set
				else {
					// prepend new hash part and update hash, allowing listener to trigger handler
					location.hash = '#'+[s_set_hash, ...as_parts].join(':');
				}

				// exit location interpretter block
				break INTERPRET_LOCATION;
			}
		}

		// trigger update
		hash_updated();
	}
}

// entry point
{
	// kickoff main
	void main();

	// document is already loaded
	if(['complete', 'interactive', 'loaded'].includes(document.readyState)) {
		dom_ready();
	}
	// dom content not yet loaded; add event listener
	else {
		document.addEventListener('DOMContentLoaded', () => {
			dom_ready();
		}, false);
	}
}
