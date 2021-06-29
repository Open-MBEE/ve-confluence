import {
	PageMetadata,
	ConfluencePage,
	ConfluenceDocument,
	Source,
	DngMdkSource,
} from './class/confluence';

import G_META from './common/meta';
import { process, lang, static_css, static_js } from './common/static';
import { format } from './util/intl';
import { qs, qsa, dd, dm_main, dm_content } from './util/dom';

import type { SvelteComponent } from 'svelte';

import ControlBar from './components/ControlBar.svelte';
import DngArtifact from './components/DngArtifact.svelte';
import QueryTable from './components/QueryTable.svelte';
import InsertBlockView from './components/InsertBlockView.svelte';
import SparqlEndpoint from './util/sparql-endpoint';
import H_PREFIXES from './common/prefixes';
import type XHTMLDocument from './class/xhtml-document';

import type { Ve4ComponentContext } from './common/ve4';
import type { SourceKey } from './class/source';
import { MmsSparqlQueryTable } from './model/QueryTable';
import { ObjectStore } from './class/object-store';
import { H_HARDCODED_OBJECTS } from './common/hardcoded';

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

// write remote resuorces
{
	// document.body.appendChild(dd('link', {
	// 	rel: 'stylesheet',
	// 	// href: 'https://ced-cdn-test.s3-us-gov-west-1.amazonaws.com/confluence-ui/fontawesome-free/css/all.min.css',
	// 	href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css',
	// 	integrity: 'sha512-iBBXm8fW90+nuLcSKlbmrPcLa0OT92xO1BIsZ+ywDWZCvqsWgccV3gFoRBv0z+8dLJgyAHIhR35VZc2oM/gI1w==',
	// 	crossorigin: 'anonymous',
	// 	referrerpolicy: 'no-referrer',
	// }));
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
const SI_DNG_LOOKUP = 'Doors-NG Artifact or Requirement'.replace(/ /g, '+');

// for excluding elements that are within active directives
const SX_PARAMETER_ID = `ac:parameter[@ac:name="id"][starts-with(text(),"{SI_VIEW_PREFIX}-")]`;
const SX_EXCLUDE_ACTIVE_DIRECTIVES = /* syntax: xpath */ `[not(ancestor::ac:structured-macro[@ac:name="span"][child::${SX_PARAMETER_ID}])]`;

const A_DIRECTIVE_CORRELATIONS: CorrelationDescriptor[] = [
	// dng web link
	{
		storage: /* syntax: xpath */ `.//a[starts-with(@href,"${P_DNG_WEB_PREFIX}")]${SX_EXCLUDE_ACTIVE_DIRECTIVES}`,
		live: `a[href^="${P_DNG_WEB_PREFIX}"]`,
		directive: ([ym_anchor, g_link]) => ({
			component: DngArtifact,
			props: {
				p_href: ym_anchor.getAttribute('href'),
				s_label: ym_anchor.textContent?.trim() || '',
			},
		}),
	},
];

let K_OBJECT_STORE: ObjectStore;

const H_PAGE_DIRECTIVES: Record<string, DirectiveDescriptor> = {
	'Insert Block View': () => ({
		component: InsertBlockView,
	}),
	// 'Insert DNG Artifact or Attribute': ([ym_anchor]) => ({
	// 	component: InsertInlineView,
	// 	props: {
	// 		p_url: ym_anchor.getAttribute('href'),
	// 	},
	// }),
	'CAE CED Table Element': () => ({
		component: QueryTable,
		props: {
			k_query_table: new MmsSparqlQueryTable(
				{
					type: 'MmsSparqlQueryTable',
					group: 'dng',
					queryTypePath: 'hardcoded#queryType.sparql.dng.afsr',
					connectionPath: 'document#connection.sparql.mms.dng',
					fieldGroupPath:
						'hardcoded#queryFieldGroup.sparql.dng.basic',
					parameterValues: {},
					parameterPaths: [
						'hardcoded#queryParameter.sparql.dng.sysvac',
						'hardcoded#queryParameter.sparql.dng.maturity',
					],
				},
				{
					store: K_OBJECT_STORE,
				},
			),
		},
	}),
};

const G_CONTEXT: Ve4ComponentContext = {
	k_page: null as unknown as ConfluencePage,
	k_sparql: null as unknown as SparqlEndpoint,
};

/**
 * content mixin
 */
const GM_CONTEXT = {
	G_CONTEXT,
};

const xpath_attrs = (a_attrs: string[]) =>
	a_attrs.map((sx) => `[${sx}]`).join('');

let k_page: ConfluencePage;
let k_document: ConfluenceDocument | null;
let k_source: XHTMLDocument;
let gm_page: PageMetadata | null;

function control_bar(gc_bar: ControlBarConfig) {
	let g_props = {
		...gc_bar.props,
	};

	// error is present
	if ('number' === typeof gc_bar.error) {
		let s_message = '';
		let xc_level = Ve4ErrorLevel.INFO;

		switch (gc_bar.error) {
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

function* correlate(
	gc_correlator: CorrelationDescriptor,
): Generator<ViewBundle> {
	// find all matching page nodes
	const a_nodes = k_source.select<Node>(gc_correlator.storage);
	const nl_nodes = a_nodes.length;

	// find all corresponding dom elements
	const a_elmts = qsa(dm_content, gc_correlator.live) as HTMLElement[];

	// mismatch
	if (a_elmts.length !== nl_nodes) {
		// `XPath selection found ${nl_nodes} matches but DOM query selection found ${a_elmts.length} matches`);
		throw new Error(
			format(lang.error.xpath_dom_mismatch, {
				node_count: nl_nodes,
				element_count: a_elmts.length,
			}),
		);
	}

	// apply struct mapper
	const f_struct = gc_correlator.struct;
	const a_structs = f_struct
		? a_nodes.map((ym_node, i_node) => {
				return f_struct(ym_node, a_elmts[i_node]);
		  })
		: [];

	// each match
	for (let i_match = 0; i_match < nl_nodes; i_match++) {
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
	if (b_hide_anchor) dm_anchor.style.display = 'none';

	// render component
	new g_bundle.component({
		target: dm_anchor.parentNode as HTMLElement,
		anchor: dm_anchor,
		props: {
			...(g_bundle.props || {}),
			g_node: g_bundle.node,
			...GM_CONTEXT,
		},
	});
}

const H_SOURCE_HANDLERS: Record<SourceKey, (source: Source) => void> = {
	dng: ((g_source: DngMdkSource) => {
		// init SPARQL endpoint
		G_CONTEXT.k_sparql = new SparqlEndpoint({
			endpoint: g_source.endpoint || 'void://',
			prefixes: H_PREFIXES,
			concurrency: 16,
			variables: {
				DATA_GRAPH: `<${g_source.graph || 'void://'}>`,
				LIMIT: '21',
			},
		});
	}) as (source: Source) => void,

	helix: () => {},
};

export async function main() {
	if ('object' !== typeof lang?.basic) {
		throw new Error(
			`ERROR: No lang file defined! Did you forget to set the environment variables when building?`,
		);
	}

	new ControlBar({
		target: dm_main.parentElement as HTMLElement,
		anchor: dm_main,
		props: GM_CONTEXT,
	});

	G_CONTEXT.k_page = k_page = await ConfluencePage.fromCurrentPage();

	await Promise.allSettled([
		(async () => {
			// fetch page metadata
			const g_meta = await k_page.getMetadata();
			gm_page = g_meta?.value || null;
		})(),

		(async () => {
			// page is part of document
			k_document = await k_page.getDocument();
		})(),

		(async () => {
			// load page's XHTML source
			k_source =
				(await k_page.getContentAsXhtmlDocument())?.value || null;
		})(),
	]);

	// not a document member
	if (!k_document) {
		// exit
		return;
	}

	// initialize object store
	K_OBJECT_STORE = new ObjectStore(k_page, k_document, H_HARDCODED_OBJECTS);

	// fetch document metadata
	const gm_document = await k_document.getMetadata();

	// no metadata; error
	if (!gm_document) {
		throw new Error(`Document exists but no metadata`);
	}

	// each page directive
	for (const si_page_directive in H_PAGE_DIRECTIVES) {
		const f_directive = H_PAGE_DIRECTIVES[si_page_directive];

		// page refs
		const dg_refs = correlate({
			storage: `.//ri:page${xpath_attrs([
				`@ri:space-key="${G_META.space_key}" or not(@ri:space-key)`,
				`@ri:content-title="${si_page_directive}"`,
			])}`,
			live: `a[href="/display/${
				G_META.space_key
			}/${si_page_directive.replace(/ /g, '+')}"]`,
			struct: (ym_node) => {
				const ym_parent = ym_node.parentNode as Node;
				return {
					label:
						('ac:link' === ym_parent.nodeName
							? ym_parent.textContent
							: '') || si_page_directive,
				};
			},
			directive: f_directive,
		});

		// page link as absolute url
		const p_href = `${G_META.base_url}/display/${
			G_META.space_key
		}/${si_page_directive.replace(/ /g, '+')}`;
		const dg_links = correlate({
			storage: `.//a[@href="${p_href}"]`,
			live: `a[href="${p_href}"]`,
			struct: (ym_node) => ({
				label: ym_node.textContent,
			}),
			directive: f_directive,
		});

		// each instance
		for (const g_bundle of [...dg_refs, ...dg_links]) {
			render_component(g_bundle, true);
		}
	}

	// each simple directive
	for (const gc_correlator of A_DIRECTIVE_CORRELATIONS) {
		// select all instances of this directive
		const dg_directives = correlate(gc_correlator);

		//
		for (const g_bundle of dg_directives) {
			render_component(g_bundle, true);
		}
	}

	// const _xhtmle = k_doc.builder();
	// _xhtmle('ac:structured-macro', {
	// 	'ac:name': 'span',
	// 	'ac:schema-version': '1',
	// 	'ac:macro-id': si_macro,
	// }, [
	// 	...a_children,
	// 	_macro_param('atlassian-macro-output-type', 'INLINE'),
	// 	_xhtmle('ac:rich-text-body', {}, a_body),
	// ])
}

async function dom_ready() {}

// entry point
{
	// kickoff main
	main();

	// document is already loaded
	if (['complete', 'interactive', 'loaded'].includes(document.readyState)) {
		dom_ready();
	}
	// dom content not yet loaded; add event listener
	else {
		document.addEventListener('DOMContentLoaded', dom_ready, false);
	}
}
