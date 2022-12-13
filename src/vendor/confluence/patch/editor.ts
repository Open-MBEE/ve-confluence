import type {Hash} from '#/common/types';

import {
	dd,
	parse_html,
	qs,
	qsa,
} from '#/util/dom';

import {
	ConfluenceDocument,
	ConfluencePage,
	is_retro_fitted
} from '../module/confluence';

import {static_css} from '#/common/static';

import type {
	Context, Serializable,
} from '#/model/Serializable';

import {ObjectStore} from '#/model/ObjectStore';

import {K_HARDCODED} from '#/common/hardcoded';

import { Mention } from '#/element/Mentions/model/Mention';
import {DisplayMode} from "#/element/Mentions/model/Autocomplete";
import type { PatchedEditor } from '#/common/meta';

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
let g_autocomplete_active: {
	mention: Mention;
} | null = null;
let k_page: ConfluencePage;
let k_document: ConfluenceDocument | null;
const G_CONTEXT: Context = {} as Context;
let fk_resolve_store: (w: any) => void;
const dp_store_ready = new Promise((fk) => {
	fk_resolve_store = fk;
});
const A_NON_CHANGING_KEY = [
	'Alt',
	'AltGraph',
	'CapsLock',
	'Control',
	'Fn',
	'FnLock',
	'Hyper',
	'Meta',
	'NumLock',
	'ScrollLock',
	'Shift',
	'Super',
	'Symbol',
	'SymbolLock',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'Copy',
	'Insert',
];

const A_CANCEL_KEY = [
	'Escape',
	'PageDown',
	'PageUp',
	'Cancel',
];
export const decode_macro_parameters = (sx_params: string) => sx_params.split(/\|/g)
	.map(s_pair => s_pair.split(/=/))
	.reduce((h_out, [si_key, s_value]) => ({
		...h_out,
		[si_key]: s_value,
	}), {}) as Hash;

function adjust_virgin_macro(dm_node: HTMLElement) {
	// get macro id attribute
	const si_macro = dm_node.getAttribute('data-macro-id');
	const si_parameters = dm_node.getAttribute('data-macro-parameters');
	// macro element
	if ('TABLE' === dm_node.tagName && 'html' === dm_node.getAttribute('data-macro-name') && si_parameters?.includes('ve-mention')) {
		// remove background-image
		dm_node.style.backgroundImage = 'none';
		// query for output body
		const dm_pre = qs(dm_node, 'pre') as HTMLPreElement;
		// output body exists
		if (dm_pre) {
			// parse publish content
			const dm_publish = parse_html(`<body>${dm_pre.textContent || ''}</body>`).body;
			// query for serialized element tag
			const dm_script = qs(dm_publish, 'script[data-ve-type="element-metadata"]');
			// element exists
			if (dm_script) {
				// macro element has not yet been adjusted in editor
				if (!is_retro_fitted(dm_node)) {
					// decode serialized element
					const gc_element = JSON.parse(dm_script.textContent || '{}') as Serializable;
					// route macro viewer
					init_page_element(dm_node as HTMLTableElement, gc_element);
				} else if(!dm_node.classList.contains('ve-draft')) {
					// ensure it cannot be edited
					dm_node.contentEditable = 'false';
				}
			}
		}
	} else if ('TABLE' === dm_node.tagName && 'div' === dm_node.getAttribute('data-macro-name') && si_parameters?.includes('queryTable')) {
		let tr = dm_node.childNodes[0].childNodes[0] as HTMLElement; //querySelector('tr')!;
		tr.style.display = 'none';
		if (!tr.nextElementSibling) {
			$(tr.parentElement!).append('<tr><td>Please edit table in viewer mode.</td></tr>');
		}
	}
	return false;
}
// init transclusions
function init_page_element(dm_node: HTMLTableElement, gc_element: Serializable) {
	dm_node.classList.add('ve-inline-macro');
	// scope table row var
	// query for macro body tr
	const dm_tr = qs(dm_node, 'tr') as HTMLTableRowElement;
	// pre-loaded; do not re-add
	if(dm_tr.nextElementSibling) {
		return;
	}
	// hide actual table row
	dm_tr.style.display = 'none';
	// create component
	const si_type = gc_element.type;
	if (!(si_type in H_COMPONENTS)) {
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
	});
}
function onEditorChange()  {
	d_doc_editor.body.querySelectorAll('p[data-mce-caret]').forEach(p => p.remove());
	// remove stale observes-inline classes
	d_doc_editor.body.querySelectorAll('p.observes-inline').forEach((p) => {
		if (!p.nextElementSibling?.classList.contains('ve-inline-macro') &&
			!p.previousElementSibling?.classList.contains('ve-inline-macro')) {
			p.classList.remove('observes-inline');
		}
	});
	// for all ve inline macros, add appropriate classes to p above and below
	d_doc_editor.body.querySelectorAll('table.ve-inline-macro').forEach((table) => {
		if (table.previousElementSibling?.tagName === 'P') {
			table.previousElementSibling?.classList.add('auto-cursor-target');
			table.previousElementSibling?.classList.add('observes-inline');
		}
		if (table.nextElementSibling?.tagName === 'P') {
			table.nextElementSibling?.classList.add('auto-cursor-target');
			table.nextElementSibling?.classList.add('observes-inline');
		}
	});
}
function onSynchronyChange() {
	const dm_body = d_doc_editor.body;
	//fix ve macros
	qsa(dm_body, 'table').forEach((dm_node) => {
		adjust_virgin_macro(dm_node as HTMLElement);
	});
	//for some reason table filter macros displays this thing
	qsa(dm_body, 'div.tablefilter-pagination').forEach((dm_node) => {
		dm_node.style.display = 'none';
	})
	// check for mentions
	for(const dm_mention of qsa(d_doc_editor, '.ve-mention') as HTMLElement[]) {
		dm_mention.contentEditable = 'false';
	}
	onEditorChange();
}
function init_editor() {
	// ref body
	const dm_body = d_doc_editor.body;
	// clear other overlays
	qsa(dm_body, '.ve-overlays').forEach(dm => dm.remove());
	qsa(dm_body, '.ve-draft').forEach(dm => dm.remove());
	// create overlays space
	create_ve_overlays();
	onSynchronyChange();
}
async function init_meta(): Promise<boolean> {
	// fro current page
	k_page = await ConfluencePage.fromCurrentPage();

	await Promise.allSettled([
		(async() => { // fetch page metadata
			const g_meta = await k_page.fetchMetadataBundle(true);
		})(),

		(async() => {// page is part of document
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
	if (!gm_document) {
		return false;
	}
	return true;
}

// once DOM and scripts has completely loaded
if (document.readyState === "complete") {
    onReady();
} else {
    document.addEventListener("load", onReady);
}
async function onReady() {
	$(window).off('beforeunload'); //prevent unsaved prompt in certain cases
	d_doc_editor = (document.getElementById('wysiwygTextarea_ifr') as HTMLIFrameElement)?.contentDocument!;
	if (!d_doc_editor) {
		throw new Error('editor not found');
	}
    addTinymceCss();
	let b_okay = await init_meta();
	if (!b_okay) {
		throw new Error(`Metadata initialization failed`);
	}
    init_editor();
	init_bindings(tinymce.activeEditor);
	void Mention.initGlobalPrecache(G_CONTEXT);
}

function init_bindings(y_editor: PatchedEditor) {
	// on remote change
	AJS.bind('editor.remote.change', (z_param: unknown) => {
		console.log(z_param);
		onSynchronyChange();
	});
	// on any change that resulted in an undo stack
	y_editor.on('change', onEditorChange, false);
	// handle clicks
	y_editor.on('click', (de_event: MouseEvent) => {
		const dm_target = de_event.target as HTMLElement;
		// mention is active
		if(g_autocomplete_active) {
			// click was to overlay or mention
			if(dm_target && (dm_target.closest('#ve-overlays') || dm_target.closest('.ve-mention'))) {
				return;
			} else { // otherwise hide overlay
				g_autocomplete_active.mention.hideOverlay();
				// autocomplete no longer active
				g_autocomplete_active = null;
			}
		}
	});

	// bind tinymce input
	y_editor.on('input', (y_event: InputEvent) => {
		// single mention node
		if (g_autocomplete_active) {
			// ref mention
			const k_mention = g_autocomplete_active.mention;
			// ensure macro exists
			try {
				void k_mention.macroDom;
			} catch (e_destroyed) {
				return;
			}
			// prevent confluence from doing something
			y_event.stopImmediatePropagation();
			// execute search
			k_mention.searchInput();
		}
	}, true);

	// bind tinymce keydown
	y_editor.on('keydown', (d_event: KeyboardEvent) => {  // eslint-disable-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
		// none active
		if (!g_autocomplete_active) {
			// new mention
			if('#' === d_event.key) {
				d_event.stopImmediatePropagation();
				d_event.preventDefault();

				// no overlays space
				if(!qs(d_doc_editor.body, '#ve-overlays')) {
					create_ve_overlays();
				}
				// create new mention
				const k_mention = Mention.fromConception(G_CONTEXT, d_doc_editor, {
					connectionPath: 'document#connection.sparql.mms.dng', //TODO
				});
				k_mention.ready().then(() =>{
					// listen for overlay
					k_mention._fk_overlay = () => {
						if (!g_autocomplete_active) {
							g_autocomplete_active = {
								mention: k_mention,
							};
						}
					};
					// listen for destroy
					k_mention._fk_destroy = () => {
						if (g_autocomplete_active && k_mention === g_autocomplete_active.mention) {
							g_autocomplete_active = null;
						}
					};
					// set mention
					g_autocomplete_active = {
						mention: k_mention,
					};
					// get cursor offset
					const g_rect = y_editor.selection.getBoundingClientRect();
					// unable to get bounding rect
					if (!g_rect) {
						debugger;
						throw new Error(`y_editor.selection has no bounding client rect`);
					}
					// destructure rect
					const {
						left: x_left,
						top: x_top,
					} = g_rect;
					const scrollY = y_editor.dom.doc.documentElement.scrollTop;
					//or y_editor.dom.doc.defaultView.window.scrollY;
					// set widget display and offset
					k_mention.showOverlay({
						x: `${x_left}px`,
						y: `calc(${x_top + scrollY}px + 1.5em)`,
						mode: DisplayMode.ITEM,
					});
					const d_range = y_editor.selection.getRng();
					const dm_start = d_range.startContainer;
					let addObserves = false;
					// range is collapsed
					if (d_range.collapsed) {
						// ref range offset within start container
						const n_offset = d_range.startOffset;
						if (n_offset) {
							addObserves = true;
						}
					}
					// insert new mention
					y_editor.execCommand('mceInsertContent', false, k_mention.renderMacroHtml());
					/* should be taken care of by onChange
					// find element
					const dm_inserted = qs(d_doc_editor, k_mention.domSelector);
					// not found
					if (!dm_inserted) {
						throw new Error('Failed to insert mention content into confluence editor');
					}
					const dm_next = dm_inserted.nextElementSibling;
					if (dm_next && 'P' === dm_next.tagName) {
						//this should make confluence display the macro content as inline as directed, if the immediate siblings have auto-cursor-target class
						dm_next.classList.add('auto-cursor-target');
					}
					const dm_prev = dm_inserted.previousElementSibling;
					if (dm_prev && 'P' === dm_prev.tagName && addObserves) {
						dm_prev.classList.add('observes-inline');
						dm_prev.classList.add('auto-cursor-target');
					}*/
				});
			}
		} else { //mentions exist
			const k_mention = g_autocomplete_active.mention;
			// ensure macro exists
			try {
				void k_mention.macroDom;
			} catch(e_destroyed) {
				return;
			}
			const si_key = d_event.key;
			// navigation key
			switch(si_key) {
				case 'ArrowUp': {
					d_event.preventDefault();
					k_mention.postMessage('bump_selection', [-1]);
					return;
				}
				case 'ArrowDown': {
					d_event.preventDefault();
					k_mention.postMessage('bump_selection', [+1]);
					return;
				}
				// select attribute
				case 'Tab': {
					return;
				}
				// accept item
				case 'Accept':
				case 'Enter': {
					if (k_mention.acceptItem()) {
						d_event.preventDefault();
					}
					return;
				}
				case 'Backspace': {
					try {
						if (!k_mention.searchTerm) {
							throw new Error(`empty search term`);
						}
					} catch (e_abandoned) {
						d_event.stopImmediatePropagation();
						d_event.preventDefault();
						// hide overlay and allow mention to auto-destroy
						try {
							k_mention.hideOverlay();
						} catch(e_destroy) {}
					}
					return;
				}
				default: {
					break;
				}
			}
			// key does not edit input
			if (A_NON_CHANGING_KEY.includes(d_event.key)) {
				return;
			}
			// key closes mentions
			if (A_CANCEL_KEY.includes(d_event.key)) {
				// hide overlay
				k_mention.hideOverlay();
				// autocomplete no longer active
				g_autocomplete_active = null;
			}
			// abort pending requests
			k_mention.abortAll();

			// // invalidate all groups
			// for(const [, g_group] of ode(h_groups)) {
			// 	g_group.state = GroupState.DIRTY;
			// }

			// // indicate update to svelte
			// h_groups = h_groups;
		}
	}, true);
}

function create_ve_overlays() {
	// create private overlay div
	d_doc_editor.body.appendChild(dd('div', {
		'id': 've-overlays',
		'class': 'synchrony-exclude ve-overlays',
		'style': `user-select:none;`,
		'data-mce-bogus': 'all',
		'contenteditable': 'false',
	}, [], d_doc_editor));
}

function addTinymceCss() {
// add tinymce static css
	d_doc_editor.head.appendChild(dd('style', {}, [`
		${static_css}
		
		.ve-inline-macro + p {
			display: inline;
		}
		.ve-inline-macro + p[data-mce-caret="after"] + p {
			display: inline;
		}
		p[data-mce-caret="before"].observes-inline {
			display: none !important;
		}
		p[data-mce-caret="after"] {
			display: none !important;
		}
		.mce-visual-caret {
			display: none !important;
		}

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
}

