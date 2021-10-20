import type {PatchedEditor} from '#/common/meta';

import {DisplayMode} from '#/element/Mentions/model/Autocomplete';

import {
	Mention,
} from '#/element/Mentions/model/Mention';

import type {Context} from '#/model/Serializable';

import {ode} from '#/util/belt';

import {
	qs,
	qsa,
} from '#/util/dom';
import { SI_EDITOR_SYNC_KEY } from './confluence';


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



let g_autocomplete_active: {
	mention: Mention;
} | null = null;

// there should only ever be a single editor per app
let y_editor: PatchedEditor;
let g_context: Context;
let d_doc_editor: Document;


function get_mentions(): {anchor: HTMLElement|null; mentions: HTMLElement[]} {
	// element struct
	const g_elements = {
		anchor: null,
		mentions: [],
	};

	// get selection
	let g_sel;
	try {
		g_sel = y_editor.selection.getSel();
	}
	catch(e_sel) {
		return g_elements;
	}

	// no selection; abort
	if(!g_sel) return g_elements;

	// @ts-expect-error anchorNode not defined in typings
	const dm_anchor = g_elements.anchor = g_sel.anchorNode as HTMLElement;

	// text node; traverse up
	const dm_focus = ('#text' === dm_anchor.nodeName? dm_anchor.parentNode: dm_anchor) as HTMLElement;

	let a_mentions = dm_focus.hasAttribute(SI_EDITOR_SYNC_KEY)? [dm_focus]: qsa(dm_focus, `.ve-mention[${SI_EDITOR_SYNC_KEY}]`) as HTMLElement[];

	if(!a_mentions.length) {
		const a_mentions_all = qsa(document, `.ve-mention[${SI_EDITOR_SYNC_KEY}]`) as HTMLElement[];
		if(1 === a_mentions_all.length) a_mentions = a_mentions_all;
	}

	// find mention data
	return {anchor:dm_anchor, mentions:a_mentions};
}


function init_bindings() {
	// on remote change
	window.parent.AJS.bind('editor.remote.change', (z_param: unknown) => {
		debugger;
		console.log(z_param);
	});

	// hadle clicks
	y_editor.on('click', (de_event: MouseEvent) => {
		const dm_target = de_event.target as HTMLElement;

		// mention is active
		if(g_autocomplete_active) {
			// click was to overlay or mention
			if(dm_target && (dm_target.closest('#ve-overlays') || dm_target.closest('.ve-mention'))) {
				return;
			}
			// otherwise; hide overlay
			else {
				g_autocomplete_active.mention.hideOverlay();
			}
		}
	});

	// bind tinymce input
	y_editor.on('input', (y_event: InputEvent) => {
		// single mention node
		if(g_autocomplete_active) {
			// prevent confluence from doing something
			y_event.stopImmediatePropagation();

			// ref mention
			const k_mention = g_autocomplete_active.mention;

			// execute search
			k_mention.searchInput();

			return;
		}
	}, true);

	// bind tinymce keydown
	y_editor.on('keydown', (d_event: KeyboardEvent) => {  // eslint-disable-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
		// none active
		if(!g_autocomplete_active) {
			// new mention
			if('@' === d_event.key) {
				d_event.stopImmediatePropagation();
				d_event.preventDefault();

				// create new mention
				const k_mention = Mention.fromConception(g_context, d_doc_editor, {
					connectionPath: 'document#connection.sparql.mms.dng',
				});

				// set mention
				g_autocomplete_active = {
					mention: k_mention,
				};

				// get cursor offset
				const g_rect = y_editor.selection.getBoundingClientRect();

				// unable to get bounding rect
				if(!g_rect) {
					debugger;
					throw new Error(`y_editor.selection has no bounding client rect`);
				}

				// destructure rect
				const {
					left: x_left,
					top: x_top,
				} = g_rect;

				// set widget display and offset
				k_mention.showOverlay({
					x: `${x_left}px`,
					y: `calc(${x_top}px + 1.5em)`,
					mode: DisplayMode.ITEM,
				});

				// insert new mention
				y_editor.execCommand('mceInsertContent', false, k_mention.renderHtml());

				// find element
				const dm_inserted = qs(d_doc_editor, k_mention.domSelector);

				// not found
				if(!dm_inserted) {
					throw new Error('Failed to insert mention content into confluence editor');
				}

				// fetch preceding element
				const dm_prev = dm_inserted.previousElementSibling;
				if(dm_prev) {
					// paragraph; add precedes inline class
					if('P' === dm_prev.tagName) {
						dm_prev.classList.add('precedes-inline');
					}
				}
			}
			// anything else
			else {
				// ignore
			}
		}
		// mentions exist
		else {
			const k_mention = g_autocomplete_active.mention;

			const si_key = d_event.key;

			// navigation key
			switch(si_key) {
				// go up
				case 'ArrowUp': {
					d_event.preventDefault();
					k_mention.postMessage('bump_selection', [-1]);
					return;
				}

				// go down
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
					if(k_mention.acceptItem()) {
						d_event.preventDefault();
					}
					return;
				}

				default: {
					break;
				}
			}

			// key does not edit input
			if(A_NON_CHANGING_KEY.includes(d_event.key)) {
				return;
			}

			// key closes mentions
			if(A_CANCEL_KEY.includes(d_event.key)) {
				k_mention.hideOverlay();
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


export function attach_editor_bindings(_y_editor: PatchedEditor, _g_context: Context, _d_doc_editor: Document): void {
	y_editor = _y_editor;
	g_context = _g_context;
	d_doc_editor = _d_doc_editor;

	init_bindings();
}
