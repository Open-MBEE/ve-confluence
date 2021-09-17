import G_META, {
	$PATCHED,
} from '#/common/meta';

import type {JsonValue} from '#/common/types';

import {
	ode,
	oderac,
	oderaf,
} from '#/util/belt';

import {
	dd,
	decode_attr,
	encode_attr,
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
} from '../module/confluence';

import Autocomplete from '#/element/Mentions/component/Autocomplete.svelte';

import type {SvelteComponent} from 'svelte/internal';

import {static_css} from '#/common/static';

import {Context, VeOdm} from '#/model/Serializable';

import {ObjectStore} from '#/model/ObjectStore';

import {K_HARDCODED} from '#/common/hardcoded';
import { Transclusion } from '#/element/Transclusion/model/Transclusion';

const timeout = (xt_wait: number) => new Promise((fk_resolve) => {
	setTimeout(() => {
		fk_resolve(void 0);
	}, xt_wait);
});

let d_doc_editor!: HTMLDocument;
let kv_autocomplete!: SvelteComponent;

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

function is_unadjusted_macro(dm_node: HTMLElement): dm_node is HTMLTableElement {
	if('TABLE' === dm_node.tagName && 'span' === dm_node.getAttribute('data-macro-name')) {
		if(null === dm_node.getAttribute('data-adjusted')) {
			dm_node.setAttribute('data-adjusted', encode_attr({type:'visited'} as Adjusted));
			return true;
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

	const sx_adjusted = dm_src.getAttribute('data-adjusted');
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

	dm_src.setAttribute('data-adjusted', encode_attr({
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

function adjust_page_element(dm_node: HTMLTableElement) {
	const dm_tr = qs(dm_node, 'tr') as HTMLTableRowElement;

	// pre-loaded; do not re-add
	if('none' === dm_tr.style.display) {
		return;
	}

	// parse macro params
	const h_params = dm_node.getAttribute('data-macro-parameters')!.split(/\|/g)
		.map(s_pair => s_pair.split(/=/))
		.reduce((h_out, [si_key, s_value]) => ({
			...h_out,
			[si_key]: s_value,
		}), {});


	// hide actual table row
	hide_editor_element(dm_tr);

	// macro class
	if('ve-mention' === h_params.class) {
		// TODO: render Autocomplete component
		const dm_ins = dd('tr', {
			'data-adjusted': encode_attr({type:'display'} as Adjusted),
		}, [
			dd('td', {}, [
				dd('h4', {}, ['Transclusion']),
				dd('p', {}, [`TODO: replace this entire element with the Autocomplete component`]),
			]),
		]);

		dm_ins.contentEditable = 'false';

		dm_tr.parentNode!.appendChild(dm_ins);
	}
	else {
		// append display-only row
		const dm_ins = dd('tr', {
			'data-adjusted': encode_attr({type:'display'} as Adjusted),
		}, [
			dd('td', {}, [
				dd('h4', {}, ['CED Query Table?']),
				dd('p', {}, [`You can remove this query table here, but editing its parameters must be done from the viewing page`]),
			]),
		]);

		dm_ins.contentEditable = 'false';

		dm_tr.parentNode!.appendChild(dm_ins);
	}
}

function editor_initialized(a_nodes=qsa(d_doc_editor, 'body>*') as HTMLElement[]) {
	for(const dm_node of a_nodes) {
		if(is_unadjusted_macro(dm_node)) {
			const h_params: Record<string, string> = (dm_node.getAttribute('data-macro-parameters') || '').split('|')
				.reduce((h_out, s_param) => ({
					...h_out,
					[s_param.split('=')[0]]: s_param.split('=')[1],
				}), {});

			// macro has id param
			const si_macro = h_params.id;
			if(si_macro) {
				if('ve4-script-tag' === si_macro) {
					return hide_editor_element(dm_node);
				}
				else if(si_macro.startsWith('page#elements.serialized.')) {
					return adjust_page_element(dm_node);
				}
			}
		}
	}
}

let k_page: ConfluencePage;
let k_document: ConfluenceDocument | null;
const G_CONTEXT: Context = {} as Context;

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

	if(b_editor_ready) {
		init_autocomplete();
	}

	b_store_ready = true;

	return true;
}

// once DOM has loaded
window.addEventListener('DOMContentLoaded', () => {
	init_meta().then((b_okay) => {
		if(!b_okay) {
			throw new Error(`Metadata initialization failed`);
		}
	});

	const dmt_update = new MutationObserver((a_mutations) => {
		replace_listeners();
	});

	dmt_update.observe(qs(document.body, '.save-button-container'), {
		subtree: true,
		childList: true,
	});

	replace_listeners();

	const dm_rte = document.getElementById('rte');
	if(!dm_rte) {
		throw new Error(`Failed to locate wysiwyg editor element`);
	}

	const observe_editor = () => {
		const dmt_editor = new MutationObserver((a_mutations) => {
			const a_roots: HTMLElement[] = [];
			for(const dm_node of child_list_mutations_added_nodes(a_mutations)) {
				a_roots.push(dm_node);
			}

			// editor initialized
			editor_initialized();
		});

		// observe childList mutations on editor body
		dmt_editor.observe(d_doc_editor.body, {
			subtree: true,
			childList: true,
			attributes: true,
		});

		editor_initialized();
	};

	const dmt_rte = new MutationObserver((a_mutations) => {
		for(const dm_node of child_list_mutations_added_nodes(a_mutations)) {
			// an iframe element
			if('IFRAME' === dm_node.tagName) {
				// disconnect mutation observer
				dmt_rte.disconnect();

				// grab ref to iframe's content document
				d_doc_editor = (dm_node as HTMLIFrameElement).contentDocument!;

				const dm_staging = dd('div', {
					id: 'svelte-staging',
					style: `display:none;`,
				}, [], d_doc_editor);

				d_doc_editor.body.appendChild(dm_staging);

				// observe mutations to editor
				observe_editor();
			}
		}
	});

	// observe childList mutations future on iframe parent
	dmt_rte.observe(dm_rte, {
		childList: true,
	});

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

	// observe childList mutations future on iframe parent
	dmt_rte.observe(dm_rte, {
		childList: true,
	});

	const i_editor = setInterval(() => {
		if(tinymce.activeEditor) {
			tinymce_ready();
			clearInterval(i_editor);
		}
	}, 500);
});

let b_editor_ready = false;
let b_store_ready = false;

function init_overlays() {
	if(b_store_ready) {
		init_autocomplete();
	}

	b_editor_ready = true;
}

function init_autocomplete() {
	// check for mentions
	const a_mentions = qsa(d_doc_editor, '[data-mention]') as HTMLDivElement[];
	for(const dm_mention of a_mentions) {
		dm_mention.contentEditable = 'false';
	}

	kv_autocomplete = new Autocomplete({
		target: document.body,
		props: {
			y_editor: tinymce.activeEditor,
			g_context: G_CONTEXT,
		},
	});
}

function tinymce_ready() {
	// add static css
	d_doc_editor.head.appendChild(dd('style', {}, [`
		${static_css}

		.ve-mention {
			color: var(--ve-color-accent-light);
			background-color: var(--ve-color-light-background);
			padding: 6px;
			border-radius: 4px;
			font-weight: 600;
		}

		.ve-mention>.attribute {
			display: inline-flex;
			min-width: 120px;
			border: 1px solid var(--ve-color-medium-light-text);
			border-radius: 3px;
			margin-left: 4px;
			padding: 0 4px;
			background-color: var(--ve-color-button-light);
		}

		.ve-mention .content {
			min-width: 110px;
			margin-right: 3px;
		}

		.ve-mention .indicator {
			color: black;
			transform: scale(0.75);
		}

		.ve-mention>.attribute.active {
			border-color: var(--ve-color-accent-light);
			background-color: transparent;
		}

		.ve-mention>.attribute.active .content {
			color: var(--ve-color-medium-light-text);
		}
	`], d_doc_editor));

	// initialize custom overlays
	init_overlays();
}


type Adjusted = {
	type: 'visited';
} | {
	type: 'display';
} | {
	type: 'modified';
	modifications: string[];
};

function replace_listeners() {
	const dm_update_old = qs(document.body, '.save-button-container button');

	if(dm_update_old.getAttribute('data-ve')) {
		return;
	}

	const y_ceditor = AJS.Editor;
	if(!y_ceditor) return;

	const y_ceui = y_ceditor.UI;
	if(!y_ceui) return;

	try {
		y_ceditor.removeAllSaveHandlers();
	}
	catch(e_defined) {
		// ignore
		return;
	}

	const dm_update_new = dm_update_old.cloneNode(true) as HTMLElement;

	dm_update_new.setAttribute('data-ve', '1');

	dm_update_new.textContent = '*Update';

	y_ceui.saveButton = dm_update_new;

	// replace save button
	dm_update_old.parentElement?.replaceChild(dm_update_new, dm_update_old);

	// add new click listener
	dm_update_new.addEventListener('click', (d_evt: Event) => {
		d_evt.stopImmediatePropagation();
		d_evt.preventDefault();

		if(y_ceui.isButtonEnabled(jQuery(y_ceui.saveButton))) {
			y_ceui.toggleSavebarBusy(true);

			// start async task
			void publish_document();
		}
	});

	// TODO: create ctrl+s handler
}

/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
async function publish_document() {
	// stop Synchrony and pretend to be editor ;)
	AJS.trigger('synchrony.stop', {
		id: 'confluence.editor.publish',
	});

	// next beat
	await Promise.resolve();

	// notify confluence editor UI
	AJS.Editor.isPublishing(1);

	// acquire editor handle
	const y_editor = tinymce.get('wysiwygTextarea');

	// get text contents
	const sx_content = y_editor.getContent();

	// parse as HTML
	const d_doc_content = new DOMParser().parseFromString(sx_content, 'text/html');

	// query for data-adjusted attributes
	const a_adjusted = qsa(d_doc_content, '[data-adjusted]');

	// each element that matched
	for(const dm_adjusted of a_adjusted) {
		// decode attribute value
		const g_adjusted: Adjusted = decode_attr(dm_adjusted.getAttribute('data-adjusted')!)!;  // eslint-disable-line @typescript-eslint/no-unsafe-assignment

		// remove attribute from element
		dm_adjusted.removeAttribute('data-adjusted');

		// depending on value type
		switch(g_adjusted.type) {
			// attribute marks node as visited
			case 'visited': {
				break;
			}

			// simply for display, remove the entire element
			case 'display': {
				dm_adjusted.remove();
				break;
			}

			// element was modified, revert changes
			case 'modified': {
				// debugger;
				for(const sx_mod of g_adjusted.modifications.reverse()) {
					const g_mod = JSON.parse(sx_mod);

					let dm_node = dm_adjusted as unknown as Uobject;
					const a_path = g_mod.path;
					for(const s_path of a_path.slice(0, -1)) {
						dm_node = dm_node[s_path] as Uobject;
					}
					dm_node[a_path[a_path.length-1]] = g_mod.init;
				}

				// debugger;
				break;
			}

			default: {
				break;
			}
		}
	}

	const h_replacements: Record<string, (k: ConfluenceXhtmlDocument) => Node> = {};
	// special handling for ve elements
	{
		const a_mentions = qsa(d_doc_content, '[data-mention]');
		for(const dm_mention of a_mentions) {
			// parse mention metadata
			const g_mention = decode_attr(dm_mention.getAttribute('data-mention')!) as Record<string, unknown>;

			// prep transclusion metadata
			const si_transclusion = uuid_v4().replace(/_/g, '-');
			const gc_transclusion = {
				type: 'Transclusion',
				connectionPath: g_mention.connection_path,
				item: g_mention.item,
				displayAttribute: g_mention.display_attribute,
			};

			// create transclusion instance
			const sp_transclusion = `page#elements.serialized.transclusion.${si_transclusion}`;
			// @ts-expect-error veo path typing
			const k_transclusion = await VeOdm.createFromSerialized(Transclusion, sp_transclusion, gc_transclusion, G_CONTEXT);

			// save transclusion to page metadata
			await k_transclusion.save();


			dm_mention.replaceWith(dd('table', {
				'class': 'wysiwyg-macro',
				'data-macro-name': 'span',
				'data-macro-id': si_transclusion,
				'data-macro-parameters': `atlassian-macro-output-type=INLINE|id=${sp_transclusion}|class=ve-replace`,
				'data-macro-schema-version': '1',
				'data-macro-body-type': 'RICH_TEXT',
			}, [
				dd('tbody', {}, [
					dd('tr', {}, [
						dd('td', {
							class: 'wysiwyg-macro-body',
						}, [
							dd('p', {
								class: 'auto-cursor-target',
							}, [
								dd('br', {}, [], d_doc_content),
							], d_doc_content),
						], d_doc_content),
					], d_doc_content),
				], d_doc_content),
			], d_doc_content));

			h_replacements[si_transclusion] = (k_contents: ConfluenceXhtmlDocument) => {
				const f_builder = k_contents.builder();

				// replace with macro
				return ConfluencePage.annotatedSpan({
					params: {
						class: 've-mention',
						id: sp_transclusion,
					},
					body: [
						ConfluencePage.annotatedSpan({
							params: {
								style: 'display:none',
								class: 've-cql-search-tag',
							},
							body: f_builder('p', {}, [sp_transclusion]),
						}, k_contents),
						f_builder('p', {}, [
							'Loading transclusion...',
						]),
					],
					autoCursor: true,
				}, k_contents);
			};
		}
	}

	// re-serialize the mutated dom body and take care of pre-flight HTML sequences
	const sx_patched = new XMLSerializer()
		.serializeToString(d_doc_content.body)
		.replace(/^\s*<body[^>]*>\s*/, '')
		.replace(/\s*<\/body>\s*$/, '')
		.replace(/\s*style=""(\s*)/g, '$1')
		.replace(/\xa0/g, '&nbsp;');

	// convert editor HTML string to CXHTML storage representation format
	const g_convert = await confluence_post_json('/contentbody/convert/storage', {
		json: {
			representation: 'editor',
			value: sx_patched,
		},
	});

	// ref storage string
	const sx_storage = g_convert?.data?.value as string;

	// create confluence XHTML doc instance
	const k_contents = new ConfluenceXhtmlDocument(sx_storage);

	for(const [si_replacement, f_replace] of ode(h_replacements)) {
		const yn_macro: Node = k_contents.select1(`//ac:structured-macro[@ac:macro-id="${si_replacement}"]`);
		yn_macro.parentNode?.replaceChild(f_replace(k_contents), yn_macro);
	}

	// get commit message from DOM
	const s_msg = (qs(document.body, '#versionComment') as HTMLInputElement).value;

	// commit contents to page
	const g_res = await k_page.postContent(k_contents, s_msg || '');

	// get view page URL
	const pr_view = k_page.getDisplayUrlString();

	// // delete any drafts that formed
	// try {
	// 	await confluence_delete_json(`/content/${k_page.pageId}`, {
	// 		search: {
	// 			status: 'draft',
	// 		},
	// 	});
	// }
	// catch(e_delete) {}

	// delete any drafts that formed
	try {
		await delete_json(`/rest/synchrony/1.0/content/${k_page.pageId}/changes/unpublished`, {
			json: {
				draftId: G_META.content_id,
			},
		});
	}
	catch(e_delete) {}

	// prevent unload prompt by turning off editor dirtyness
	y_editor.isNotDirty = true;
	window.onbeforeunload = null;

	// load view page
	location.href = pr_view;
}

