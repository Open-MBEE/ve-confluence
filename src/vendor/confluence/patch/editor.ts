import G_META, {
	$PATCHED,
} from '#/common/meta';

import type {Hash, JsonObject, JsonValue} from '#/common/types';

import {
	ode,
	oderac,
	oderaf,
} from '#/util/belt';

import {
	dd,
	decode_attr,
	encode_attr,
	parse_html,
	qs,
	qsa,
	uuid_v4,
} from '#/util/dom';

import {delete_json} from '#/util/fetch';

import {
	ConfluenceDocument,
	ConfluencePage,
	ConfluenceXhtmlDocument,
	confluence_delete_json,
	confluence_post_json,
	is_retro_fitted,
	retro_fit,
	SI_EDITOR_SYNC_KEY,
} from '../module/confluence';

import type MentionOverlay from '#/element/Mentions/component/MentionOverlay.svelte';

import {static_css} from '#/common/static';

import type {
	Context, Serializable,
} from '#/model/Serializable';

import {ObjectStore} from '#/model/ObjectStore';

import {K_HARDCODED} from '#/common/hardcoded';

import {attach_editor_bindings, create_ve_overlays} from '../module/editor-bindings';
import { Mention } from '#/element/Mentions/model/Mention';

interface MacroComponent {
	get displayNode(): HTMLElement;
	updateDisplay(): void;
	bindEventListeners(b_init: boolean): void;
	get macroDom(): HTMLElement;
}

const H_COMPONENTS = {
	Transclusion: Mention,
} as Record<string, {
	fromMacro(dm_node: HTMLTableElement, gc_element: Serializable, g_context: Context): MacroComponent;
}>;

let d_doc_editor!: Document;
let kv_autocomplete!: MentionOverlay;

function* child_list_mutations_added_nodes(a_mutations: MutationRecord[]): Generator<HTMLElement> {
	// each mutation
	for(const d_mutation of a_mutations) {
		// childList mutation
		if('childList' === d_mutation.type) {
			// convert added nodes to array
			const a_nodes = Array.from(d_mutation.addedNodes) as HTMLElement[];

			// ensure list is non-empty
			for(const dm_node of a_nodes) {
				yield dm_node;
			}
		}
	}
}

export const decode_macro_parameters = (sx_params: string) => sx_params.split(/\|/g)
	.map(s_pair => s_pair.split(/=/))
	.reduce((h_out, [si_key, s_value]) => ({
		...h_out,
		[si_key]: s_value,
	}), {}) as Hash;

function adjust_virgin_macro(dm_node: HTMLElement) {
	// get macro id attribute
	const si_macro = dm_node.getAttribute('data-macro-id');

	// macro element
	if('TABLE' === dm_node.tagName && 'html' === dm_node.getAttribute('data-macro-name') && si_macro?.startsWith('ve-')) {
		// remove background-image
		dm_node.style.backgroundImage = 'none';

		// query for output body
		const dm_pre = qs(dm_node, 'pre') as HTMLPreElement;

		// output body exists
		if(dm_pre) {
			// parse publish content
			const dm_publish = parse_html(`<body>${dm_pre.textContent || ''}</body>`).body;

			// query for serialized element tag
			const dm_script = qs(dm_publish, 'script[data-ve-type="element-metadata"]');

			// element exists
			if(dm_script) {
				// macro element has not yet been adjusted in editor
				if(!is_retro_fitted(dm_node)) {
					// decode serialized element
					const gc_element = JSON.parse(dm_script.textContent || '{}') as Serializable;

					// decode macro id
					const si_params = decode_macro_parameters(dm_node.getAttribute('data-macro-parameters')!).id;

					// // ve4 script tag
					// if('ve4-script-tag' === si_macro) {
					// 	return hide_editor_element(dm_node);
					// }

					// element initialization
					const f_init = () => {
						// select node
						const dm_node_live = qs(d_doc_editor, `table[data-macro-id="${si_macro}"]`) as HTMLTableElement;

						// macro is still not retrofitted
						if(dm_node_live && !is_retro_fitted(dm_node_live)) {
							// route macro viewer
							init_page_element(dm_node as HTMLTableElement, gc_element);
						}
					};

					// ve-overlays not yet exist; defer initialization
					if(!G_CONTEXT.store || !b_initialized) {
						h_deferred[si_params] = f_init;
					}
					// ve-overlays exists; initialize now
					else {
						f_init();
					}
				}
				// element is retrofitted
				else if(!dm_node.classList.contains('ve-draft')) {
					// ensure it cannot be edited
					dm_node.contentEditable = 'false';
				}
			}
		}
	}
	return false;
}

type Uobject = Record<string, unknown>;
type Rso = Record<string, string | Uobject>;

interface SerializableSetDescriptor{
	path: string[];
	set: JsonValue;
	init: JsonValue;
}

interface SetDescriptor extends SerializableSetDescriptor {
	src: {[k: string]: unknown};
	node: Uobject;
}

function reduce_set_descriptor(h_src: Uobject, h_set: Rso, a_path: string[]=[], h_node=h_src): SetDescriptor[] {
	return oderaf(h_set, (si_key: string, w_value: string | Record<string, unknown>) => {
		if('object' === typeof w_value) {
			return reduce_set_descriptor(h_src as Rso, w_value as Rso, [...a_path, si_key], h_node[si_key] as Uobject);
		}
		else {
			return [{
				src: h_src,
				path: [...a_path, si_key],
				node: h_node,
				init: h_node[si_key] as JsonValue,
				set: w_value as JsonValue,
			}];
		}
	});
}

function modify_editor_dom(dm_src: HTMLElement, h_set: Rso) {
	const a_acts = reduce_set_descriptor(dm_src as unknown as Uobject, h_set);
	const a_mods = [];

	const sx_adjusted = dm_src.getAttribute(SI_EDITOR_SYNC_KEY);
	if(sx_adjusted) {
		const g_adjusted = decode_attr(sx_adjusted) as Adjusted;

		// display element, do not proceed
		if('display' === g_adjusted.type) return;

		// copy existing mods
		if('modified' === g_adjusted.type) {
			a_mods.push(...g_adjusted.modifications);
		}
	}

	for(const g_act of a_acts) {
		const {
			src: g_src,
			path: a_path,
			node: h_node,
			init: w_init,
			set: w_set,
		} = g_act;

		// set value
		h_node[a_path[a_path.length-1]] = w_set;

		// push to mod list
		a_mods.push(JSON.stringify({
			path: a_path,
			init: w_init,
			set: w_set,
		}));
	}

	const a_mods_out = [...new Set(a_mods)];

	dm_src.setAttribute(SI_EDITOR_SYNC_KEY, encode_attr({
		type: 'modified',
		modifications: a_mods_out,
	} as Adjusted));

	return a_mods_out;
}


const H_MODIFICATIONS: Record<string, VoidFunction> = {};

function add_modification(f_mod: VoidFunction) {
	const si_mod = uuid_v4();
	H_MODIFICATIONS[si_mod] = f_mod;
	return si_mod;
}

function hide_editor_element(dm_node: HTMLElement) {
	modify_editor_dom(dm_node, {
		style: {
			display: 'none',
		},
	});
}

function init_page_element(dm_node: HTMLTableElement, gc_element: Serializable) {
	// set macro class
	dm_node.classList.add('ve-inline-macro');

	// scope table row var
	{
		// query for macro body tr
		const dm_tr = qs(dm_node, 'tr') as HTMLTableRowElement;

		// pre-loaded; do not re-add
		if(dm_tr.nextElementSibling) {
			return;
		}

		// hide actual table row
		dm_tr.style.display = 'none';
	}

	// create component
	const si_type = gc_element.type;
	if(!(si_type in H_COMPONENTS)) {
		console.error(`No such component type '${si_type}''`);
	}

	// instantiate
	const k_thing = H_COMPONENTS[si_type].fromMacro(dm_node, gc_element, G_CONTEXT);

	// update dom next tick
	queueMicrotask(() => {
		// query for same tr in case synchrony replaced dom
		const dm_tr = qs(k_thing.macroDom, 'tr') as HTMLTableRowElement;

		// add ui dom
		dm_tr.parentElement?.append(dd('tr', {}, [
			dd('td', {}, [
				k_thing.displayNode,
			]),
		]));

		// update display
		k_thing.updateDisplay();

		// // wait a tick
		// queueMicrotask(() => {
		// 	// bind event listener3s
		// 	k_thing.bindEventListeners(true);
		// });
	});
}

let b_initialized = false;
const h_deferred: Record<string, VoidFunction> = {};

function init_deferred() {
	if(b_initialized && G_CONTEXT.store) {
		ode(h_deferred).forEach(([si_macro, f_init]) => {
			f_init();
			delete h_deferred[si_macro];
		});
	}
}


function editor_content_updated(a_nodes=qsa(d_doc_editor, 'body>*') as HTMLElement[]) {
	for(const dm_node of a_nodes) {
		// synchrony container added
		if('DIV' === dm_node?.nodeName && dm_node.classList.contains('synchrony-container') && !b_initialized) {
			// now initialized
			b_initialized = true;

			// ref body
			const dm_body = d_doc_editor.body;

			// clear other overlays
			qsa(dm_body, '.ve-overlays').forEach(dm => dm.remove());

			// create overlays space
			create_ve_overlays(dm_body, d_doc_editor);

			// clear draft elements
			qsa(dm_body, '.ve-draft').forEach(dm => dm.remove());

			// remove stale observes-inline classes
			qsa(dm_body, '.observes-inline').forEach(dm_pre => {
				if(!dm_pre.nextElementSibling?.classList?.contains('ve-inline-macro')) {
					dm_pre.classList.remove('observes-inline');
				}
			});

			// add precedes inline classes where needed
			qsa(dm_body, '.ve-inline-macro').forEach(dm_table => {
				const dm_prev = dm_table.previousElementSibling;
				if(dm_prev && 'P' === dm_prev.tagName) {
					dm_prev.classList.add('observes-inline');
				}
			});

			// remove dead empty spans
			qsa(dm_body, 'p>span').forEach((dm_span) => {
				// no children; remove it
				if(!dm_span.childNodes.length) return dm_span.remove();

				// only child is a text node with "&nbsp;"; remove it
				const dm_child0 = dm_span.childNodes[0];
				if(dm_child0 && '#text' === dm_child0.nodeName && '\xa0' === dm_child0.textContent) {
					dm_span.remove();
				}
			});

			// remove empty ps
			qsa(dm_body, 'p').forEach((dm_p) => {
				if(!dm_p.childNodes.length) {
					dm_p.remove();
				}
			});

			// init deferred
			init_deferred();
		}
		// p
		else if('P' === dm_node.tagName) {
			// observes-inline
			if(dm_node.classList.contains('observes-inline')) {
				const dm_prev = dm_node.previousElementSibling;
				const dm_next = dm_node.nextElementSibling;

				// whether this p was likely copied from preceding element
				let b_copied = false;
				if(dm_prev && 'P' === dm_prev.nodeName && dm_prev.classList.contains('observes-inline')) {
					b_copied = true;
				}

				// whether the observes inline class would be useful
				let b_useful = false;
				if(!dm_next || !['P', 'DIV'].includes(dm_next.nodeName)) {
					b_useful = true;
				}

				// the observes-inline class was copied and is not useful; remove it
				if(b_copied && !b_useful) {
					dm_node.classList.remove('observes-inline');
				}
			}

			// caret after
			if('after' === dm_node.getAttribute('data-mce-caret')) {
				const dm_prev = dm_node.previousElementSibling;

				// caret after inline macro
				if('TABLE' === dm_prev?.tagName && dm_prev.classList.contains('ve-inline-macro')) {
					// p follows caret
					const dm_next = dm_node.nextElementSibling;
					if('P' === dm_next?.tagName && dm_next.textContent) {
						// delete caret
						dm_node.remove();

						// exit
						continue;
					}

					// get inline macro bounds
					const g_rect = dm_prev.getBoundingClientRect();

					// query for display caret(s)
					const a_carets = qsa(dm_prev.ownerDocument, '.mce-visual-caret') as HTMLElement[];
					if(a_carets.length) {
						// find the one with the inset style
						for(const dm_caret of a_carets.filter(dm => dm.style.inset)) {
							// parse inset
							const a_insets = dm_caret.style.inset.trim().split(/\s/g);

							// adjust left and top
							a_insets[0] = Math.floor(g_rect.y - 4)+'px';
							a_insets[1] = Math.ceil(g_rect.left + g_rect.width + 4)+'px';

							// update style
							dm_caret.style.inset = a_insets.join(' ');
						}
					}
				}
			}
		}
		// node is part of draft
		else if(dm_node?.classList && !dm_node.classList.contains('synchrony-exclude')) {
			// draft element
			if(!b_initialized && dm_node.classList.contains('ve-draft')) {
				// delete it
				dm_node.parentElement?.removeChild(dm_node);

				// continue onto next node
				continue;
			}

			// adjusted macros as necessary
			adjust_virgin_macro(dm_node);
		}
	}
}

let k_page: ConfluencePage;
let k_document: ConfluenceDocument | null;
const G_CONTEXT: Context = {} as Context;

let fk_resolve_store: (w: any) => void;
const dp_store_ready = new Promise((fk) => {
	fk_resolve_store = fk;
});
async function init_meta(): Promise<boolean> {
	// fro current page
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
	]);

	// not a document member; exit
	if(!k_document) return false;

	// initialize object store
	G_CONTEXT.store = new ObjectStore({
		page: k_page,
		document: k_document,
		hardcoded: K_HARDCODED,
	});

	fk_resolve_store(void 0);

	// set page
	G_CONTEXT.page = k_page;

	// set document
	G_CONTEXT.document = k_document;

	// fetch document metadata
	const gm_document = await k_document.fetchMetadataBundle();

	// no metadata; error
	if(!gm_document) {
		// throw new Error(`Document exists but no metadata`);
		return false;
	}
	attach_editor_bindings(tinymce.activeEditor, G_CONTEXT, d_doc_editor);

	return true;
}

// once DOM and scripts has completely loaded
if (document.readyState === "complete") {
    onReady();
} else {
    document.addEventListener("load", onReady);
}
function onReady() {
	d_doc_editor = (document.getElementById('wysiwygTextarea_ifr') as HTMLIFrameElement)?.contentDocument!;
	if (!d_doc_editor) {
		throw new Error('editor not found');
	}
	init_meta().then((b_okay) => {
		if(!b_okay) {
			throw new Error(`Metadata initialization failed`);
		}
	});

	const observe_editor = () => {
		const dmt_editor = new MutationObserver((a_mutations) => {
			const a_roots: HTMLElement[] = [];
			for(const dm_node of child_list_mutations_added_nodes(a_mutations)) {
				a_roots.push(dm_node);
			}

			// editor initialized
			void editor_content_updated(a_roots);
		});

		// observe childList mutations on editor body
		dmt_editor.observe(d_doc_editor.body, {
			subtree: true,
			childList: true,
			attributes: true,
		});

		void editor_content_updated();
	};
    observe_editor();

	// copy all styles onto editor iframe as they are added by svelte
	{
		new MutationObserver((a_mutations) => {
			for(const dm_node of child_list_mutations_added_nodes(a_mutations)) {
				if('STYLE' === dm_node.tagName) {
					d_doc_editor.head.appendChild(dm_node.cloneNode(true));
				}
			}
		}).observe(document.head, {
			childList: true,
		});
	}

	// add tinymce static css
	d_doc_editor.head.appendChild(dd('style', {}, [`
		${static_css}

		.ve-mention {
			color: var(--ve-color-accent-light);
			background-color: var(--ve-color-light-background);
			padding: 6px;
			border-radius: 4px;
			font-weight: 600;
		}

		.ve-mention-attribute {
			display: inline-flex;
			min-width: 120px;
			border: 1px solid var(--ve-color-medium-light-text);
			border-radius: 3px;
			margin-left: 4px;
			padding: 0 4px;
			background-color: var(--ve-color-button-light);
			vertical-align: baseline;
			line-height: 17px;
		}

		.ve-mention .content {
			min-width: 110px;
			margin-right: 3px;
		}

		.ve-mention .indicator {
			color: black;
			transform: scale(0.75);
		}

		.ve-mention-attribute.active {
			border-color: var(--ve-color-accent-light);
			background-color: transparent;
		}

		.ve-mention-attribute.active .content {
			color: var(--ve-color-medium-light-text);
		}

		body.wiki-content table.wysiwyg-macro.ve-inline-macro {
			display: inline;
			padding: 0;
			width: 0;
			border: none;
			margin-top: 0;
			border-spacing: 0;
			background: none;
			vertical-align: middle;
		}
	`], d_doc_editor));

	// check for mentions
	for(const dm_mention of qsa(d_doc_editor, '.ve-mention') as HTMLElement[]) {
		dm_mention.contentEditable = 'false';
	}	
}


type Adjusted = {
	type: 'visited';
} | {
	type: 'display';
} | {
	type: 'modified';
	modifications: string[];
};