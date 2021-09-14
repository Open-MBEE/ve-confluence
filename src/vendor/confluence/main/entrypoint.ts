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
	dd,
} from '#/util/dom';

import type {SvelteComponent} from 'svelte';

import ControlBar from '#/element/ControlBar/component/ControlBar.svelte';

import DngArtifact from '#/element/DngArtifact/component/DngArtifact.svelte';

import QueryTable from '#/element/QueryTable/component/QueryTable.svelte';

import type XhtmlDocument from '#/vendor/confluence/module/xhtml-document';

import {MmsSparqlQueryTable} from '#/element/QueryTable/model/QueryTable';


import {
	H_HARDCODED_OBJECTS,
	K_HARDCODED,
} from '#/common/hardcoded';

import {
	Context,
	Serializable,
	VeOdm,
	VeOdmConstructor,
} from '#/model/Serializable';

import {ObjectStore} from '#/model/ObjectStore';

import {
	xpathEvaluate,
	xpathSelect,
	xpathSelect1,
} from '#/vendor/confluence/module/xhtml-document';

import type {VeoPath} from '#/common/veo';

import type {
	TypedKeyedUuidedObject,
	TypedObject,
	TypedPrimitive,
} from '#/common/types';

import {
	inject_frame,
	P_SRC_WYSIWYG_EDITOR,
	SR_HASH_VE_PAGE_EDIT_MODE,
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
type Handle = [HTMLElement, Record<string, any>];

interface Correlation {
	/**
	 * svelte component to render in place of directive
	 */
	component: typeof SvelteComponent;

	/**
	 * svelte props to pass to the component's constructor
	 */
	props?: Record<string, any>;
}

interface ViewBundle extends Correlation {
	/**
	 * directive's HTML element in the current DOM
	 */
	render: HTMLElement;

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

interface CorrelationDescriptor {
	storage: string;
	live: string;
	struct?: (ym_node: Node, dm_elmt: HTMLElement) => Record<string, any>;
	directive: DirectiveDescriptor;
}

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

const P_DNG_WEB_PREFIX = process.env.DOORS_NG_PREFIX;

// for excluding elements that are within active directives
const SX_PARAMETER_ID_PAGE_ELEMENT = `ac:parameter[@ac:name="id"][starts-with(text(),"page#elements.")]`;
const SX_EXCLUDE_ACTIVE_ELEMENTS = /* syntax: xpath */ `[not(ancestor::ac:structured-macro[@ac:name="span"][child::${SX_PARAMETER_ID_PAGE_ELEMENT}])]`;

const A_DIRECTIVE_CORRELATIONS: CorrelationDescriptor[] = [
	// dng web link
	{
		storage: /* syntax: xpath */ `.//a[starts-with(@href,"${P_DNG_WEB_PREFIX}")]${SX_EXCLUDE_ACTIVE_ELEMENTS}`,
		live: `a[href^="${P_DNG_WEB_PREFIX}"]:not([data-ve4])`,
		directive: ([ym_anchor, g_link]) => ({
			component: DngArtifact,
			props: {
				ym_anchor,
				g_link,
				p_href: ym_anchor.getAttribute('href'),
				s_label: ym_anchor.textContent?.trim() || '',
				g_context: G_CONTEXT,
			},
		}),
	},
];

let K_OBJECT_STORE: ObjectStore;
let k_page: ConfluencePage;
let kv_control_bar: ControlBar;
const G_CONTEXT: Context = {} as Context;

const H_PAGE_DIRECTIVES: Record<string, DirectiveDescriptor> = {
	// 'Insert Block View': () => ({component:InsertBlockView}),
	// 'Insert DNG Artifact or Attribute': ([ym_anchor]) => ({
	// 	component: InsertInlineView,
	// 	props: {
	// 		p_url: ym_anchor.getAttribute('href'),
	// 	},
	// }),

	'CAE CED Table Element': ([, g_struct]: [HTMLElement, Record<string, any>]) => {
		const si_uuid = (g_struct.uuid as string) || uuid_v4().replace(/_/g, '-');
		const si_key: VeoPath.Full = `page#elements.serialized.queryTable.${si_uuid}`;

		return {
			component: QueryTable,
			props: {
				k_query_table: new MmsSparqlQueryTable(si_key,
					{
						type: 'MmsSparqlQueryTable',
						key: si_key,
						uuid: si_uuid,
						group: 'dng',
						queryTypePath: 'hardcoded#queryType.sparql.dng.afsr',
						connectionPath: 'document#connection.sparql.mms.dng',
						parameterValues: {},
					},
					G_CONTEXT
				),
			},
		};
	},
};

const xpath_attrs = (a_attrs: string[]) => a_attrs.map(sx => `[${sx}]`).join('');

let k_document: ConfluenceDocument | null;
let k_source: ConfluenceXhtmlDocument;

function control_bar(gc_bar: ControlBarConfig) {
	const g_props = {...gc_bar.props};

	// error is present
	if('number' === typeof gc_bar.error) {
		let s_message = '';
		let xc_level = Ve4ErrorLevel.INFO;

		switch(gc_bar.error) {
			case Ve4Error.PERMISSIONS: {
				s_message = lang.error.page_permissions;
				xc_level = Ve4ErrorLevel.WARN;
				break;
			}

			case Ve4Error.METADATA: {
				s_message = lang.error.page_metadata;
				xc_level = Ve4ErrorLevel.FATAL;
				break;
			}

			case Ve4Error.UNKNOWN:
			default: {
				s_message = lang.error.unknown;
				xc_level = Ve4ErrorLevel.FATAL;
				break;
			}
		}
	}
}

function* correlate(gc_correlator: CorrelationDescriptor): Generator<ViewBundle> {
	// find all matching page nodes
	const a_nodes = k_source.select<Node>(gc_correlator.storage);
	const nl_nodes = a_nodes.length;

	// find all corresponding dom elements
	const a_elmts = qsa(dm_content, gc_correlator.live) as HTMLElement[];

	// mismatch
	if(a_elmts.length !== nl_nodes) {
		// `XPath selection found ${nl_nodes} matches but DOM query selection found ${a_elmts.length} matches`);
		throw new Error(format(lang.error.xpath_dom_mismatch, {
			node_count: nl_nodes,
			element_count: a_elmts.length,
		}));
	}

	// apply struct mapper
	const f_struct = gc_correlator.struct;
	const a_structs = f_struct? a_nodes.map((ym_node, i_node) => f_struct(ym_node, a_elmts[i_node])): [];

	// each match
	for(let i_match = 0; i_match < nl_nodes; i_match++) {
		yield {
			...gc_correlator.directive([a_elmts[i_match], a_structs[i_match]]),
			anchor: a_elmts[i_match],
			node: a_nodes[i_match],
		};
	}
}

function render_component(g_bundle: ViewBundle, b_hide_anchor = false) {
	const dm_anchor = g_bundle.anchor;

	// hide anchor
	if(b_hide_anchor) {
		(g_bundle.render || dm_anchor).style.display = 'none';
	}

	// render component
	new g_bundle.component({
		target: dm_anchor.parentNode as HTMLElement,
		anchor: dm_anchor,
		props: {
			...g_bundle.props || {},
			yn_directive: g_bundle.node,
			// ...GM_CONTEXT,
		},
	});
}

export async function main(): Promise<void> {
	if('object' !== typeof lang?.basic) {
		throw new Error(`ERROR: No lang file defined! Did you forget to set the environment variables when building?`);
	}

	const dm_header = qs(document.body, '#header');
	kv_control_bar = new ControlBar({
		target: dm_main_header as HTMLElement,
		anchor: qs(dm_main_header, 'div#navigation'),
		// target: dm_header.parentElement as HTMLElement,
		// anchor: dm_header.nextSibling as HTMLElement,
		props: {
			g_context: G_CONTEXT,
		},
	});

	// G_CONTEXT.k_page =
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

	// each page directive
	for(const si_page_directive in H_PAGE_DIRECTIVES) {
		const f_directive = H_PAGE_DIRECTIVES[si_page_directive];
		// page refs
		const dg_refs = correlate({
			storage: `.//ri:page${xpath_attrs([
				`@ri:space-key="${G_META.space_key}" or not(@ri:space-key)`,
				`@ri:content-title="${si_page_directive}"`,
			])}`,
			live: `a[href="/display/${G_META.space_key}/${si_page_directive.replace(/ /g, '+')}"]`,
			struct: (ym_node) => {
				const ym_parent = ym_node.parentNode as Element;
				// ym_parent.getAttribute('');
				// debugger;
				return {
					label: ('ac:link' === ym_parent.nodeName? ym_parent.textContent: '') || si_page_directive,
					// macro_id: (ym_parent 'ac:macro-id')
				};
			},
			directive: f_directive,
		});

		// page link as absolute url
		const p_href = `${G_META.base_url}/display/${G_META.space_key}/${si_page_directive.replace(/ /g, '+')}`;
		const dg_links = correlate({
			storage: `.//a[@href="${p_href}"]`,
			live: `a[href="${p_href}"]`,
			struct: ym_node => ({label:ym_node.textContent}),
			directive: f_directive,
		});

		// each instance
		for(const g_bundle of [...dg_refs, ...dg_links]) {
			render_component(g_bundle, true);
		}
	}

	// each simple directive
	for(const gc_correlator of A_DIRECTIVE_CORRELATIONS) {
		// select all instances of this directive
		const dg_directives = correlate(gc_correlator);

		//
		for(const g_bundle of dg_directives) {
			render_component(g_bundle, true);
		}
	}

	// interpret rendered elements
	{
		// xpath query for rendered elements
		const a_macros = k_source.select<Node>(`//ac:structured-macro[@ac:name="span"][child::${SX_PARAMETER_ID_PAGE_ELEMENT}]`);

		// translate into ve paths
		const a_paths = a_macros.map(yn => [xpathSelect1<Text>(`./ac:parameter[@ac:name="id"]/text()`, yn).data, yn] as [VeoPath.Full, Node]);

		// resolve serialized element
		for(const [sp_element, yn_directive] of a_paths) {
			const gc_element = await K_OBJECT_STORE.resolve<TypedKeyedUuidedObject>(sp_element);

			// correlate to live DOM element
			const a_spans = qsa(dm_main, `span[id="${sp_element}"]`);

			// incorrect match
			if(1 !== a_spans.length) {
				throw new Error(`Expected exactly 1 annotated span element on page with id="${sp_element}" but found ${a_spans.length}`);
			}

			const dm_render = a_spans[0] as HTMLElement;

			// select adjacent element
			const dm_anchor = dm_render.parentElement!.nextSibling as HTMLElement;

			// model and component class
			let dc_model!: VeOdmConstructor<Serializable, VeOdm<Serializable>>;
			// let dc_component: {new(o: Record<string, unknown>): SvelteComponent};
			let dc_component!: typeof SvelteComponentDev;

			// deserialize
			switch(gc_element.type) {
				// query table
				case 'MmsSparqlQueryTable': {
					// @ts-expect-error safu
					dc_model = MmsSparqlQueryTable;
					dc_component = QueryTable;
					break;
				}

				// transclusion
				case 'Transclusion': {
					// debugger;
					// @ts-expect-error safu
					dc_model = Transclusion;
					dc_component = TransclusionComponent;
					break;
				}

				default: {
					debugger;
					break;
				}
			}

			if(dc_model) {
				// construct model instance
				const k_model = await VeOdm.createFromSerialized(dc_model, sp_element, gc_element as Serializable, G_CONTEXT);

				// inject component
				render_component({
					component: dc_component,
					render: dm_render,
					anchor: dm_anchor,
					node: yn_directive,
					props: {
						k_model,
						b_published: true,
					},
				}, true);
			}
		}
	}
}

const H_HASH_TRIGGERS: Record<string, (de_hash_change?: HashChangeEvent) => Promise<void>> = {
	async 'load-editor'(de_hash_change?: HashChangeEvent) {
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

	async 'beta'(de_hash_change?: HashChangeEvent) {
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
	},
};


let p_original_edit_link = '';

function replace_edit_button() {
	// already replaced
	if(p_original_edit_link) return;

	const dm_edit = qs(dm_main, 'a#editPageLink')! as HTMLAnchorElement;
	p_original_edit_link = dm_edit.href;
	dm_edit.href = '#load-editor';

	// remove all event listeners
	const dm_clone = dm_edit.cloneNode(true);
	dm_edit.parentNode?.replaceChild(dm_clone, dm_edit);

	// prefetch wysiwyg editor script
	const dm_prefetch = dd('link', {
		rel: 'prefetch',
		href: P_SRC_WYSIWYG_EDITOR,
		as: 'script',
	});
	document.head.appendChild(dm_prefetch);
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
	window.addEventListener('hashchange', hash_updated);

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
	main();

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
