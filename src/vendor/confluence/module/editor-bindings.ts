import type {PatchedEditor} from '#/common/meta';

import {DisplayMode} from '#/element/Mentions/model/Autocomplete';

import {
	MacroDestroyedError,
	Mention,
} from '#/element/Mentions/model/Mention';

import type {Context} from '#/model/Serializable';

import {ode} from '#/util/belt';

import {
	dd,
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

const S_NBSP = '\xa0';

export function create_ve_overlays(dm_body: HTMLElement, d_doc_editor_in=d_doc_editor as Document) {
	// create private overlay div
	dm_body.appendChild(dd('div', {
		'id': 've-overlays',
		'class': 'synchrony-exclude ve-overlays',
		'style': `user-select:none;`,
		'data-mce-bogus': 'all',
		'contenteditable': 'false',
	}, [], d_doc_editor_in));
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

				// autocomplete no longer active
				g_autocomplete_active = null;
			}
		}
	});

	// bind tinymce input
	y_editor.on('input', (y_event: InputEvent) => {
		// single mention node
		if(g_autocomplete_active) {
			// ref mention
			const k_mention = g_autocomplete_active.mention;

			// ensure macro exists
			try {
				void k_mention.macroDom;
			}
			catch(e_destroyed) {
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
		if(!g_autocomplete_active) {
			// new mention
			if('#' === d_event.key) {
				d_event.stopImmediatePropagation();
				d_event.preventDefault();

				// no overlays space
				if(!qs(d_doc_editor.body, '#ve-overlays')) {
					create_ve_overlays(d_doc_editor.body);
				}

				// create new mention
				const k_mention = Mention.fromConception(g_context, d_doc_editor, {
					connectionPath: 'document#connection.sparql.mms.dng', //TODO
				});

				// listen for overlay
				k_mention._fk_overlay = () => {
					if(!g_autocomplete_active) {
						g_autocomplete_active = {
							mention: k_mention,
						};
					}
				};

				// listen for destroy
				k_mention._fk_destroy = () => {
					if(g_autocomplete_active && k_mention === g_autocomplete_active.mention) {
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
				if(!g_rect) {
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

				// whether to propagate inline onto the next sibling element
				let b_propagate_inline = false;

				// whether to break the preceding element
				let b_break_preceding = false;

				// range is collapsed
				if(d_range.collapsed) {
					// ref range offset within start container
					const n_offset = d_range.startOffset;

					// preceding content is empty
					if(!n_offset) {
						// propagate inline
						b_propagate_inline = true;

						// insert break
						b_break_preceding = true;
					}
					// cursor at end of preceding pre
					else {
						// select text node's parent element
						const dm_precede = dm_start.parentElement!;

						// set preceding p as observes-inline if it exists
						const dm_p = dm_precede.closest('p');
						if(dm_p) dm_p.classList.add('observes-inline');

						// cursor within pre
						if(n_offset !== dm_start.textContent?.length) {
							b_propagate_inline = true;
						}
					}
				}


					// // iteratively find next sibling
					// dm_next = (() => {
					// 	let dm_node = d_range.commonAncestorContainer as HTMLElement;
					// 	while(!dm_node.nextElementSibling) {
					// 		dm_node = dm_node.parentElement!;
					// 	}
					// 	return dm_node.nextElementSibling as HTMLElement;
					// })();


				// insert new mention
				y_editor.execCommand('mceInsertContent', false, k_mention.renderMacroHtml());

				// find element
				const dm_inserted = qs(d_doc_editor, k_mention.domSelector);

				// not found
				if(!dm_inserted) {
					throw new Error('Failed to insert mention content into confluence editor');
				}

				// propagate inline
				if(b_propagate_inline) {
					dm_inserted.classList.add('propagates-inline');
				}

				// break preceding
				if(b_break_preceding) {
					dm_inserted.insertAdjacentElement('beforebegin', dd('p'));
				}

				// // select preceding element
				// const dm_prev = dm_inserted.previousElementSibling;
				// if(dm_prev) {
				// 	// paragraph; add observes-inline class
				// 	if('P' === dm_prev.tagName) {
				// 		dm_prev.classList.add('observes-inline');
				// 	}
				// }

				// const dm_span = dd('span', {}, [S_NBSP]);

				// // select following element
				// const dm_next = dm_inserted.nextElementSibling;
				// if(dm_next && 'P' === dm_next.tagName && 'SPAN' === dm_next.firstElementChild?.tagName) {
				// 	dm_next.prepend(dm_span);
				// 	if(!dm_next.textContent) {
				// 		dm_next.textContent = S_NBSP;
				// 	}
				// }
				// else {
				// 	dm_inserted.insertAdjacentElement('afterend', dd('p', {}, [dm_span]));
				// }
			}
			// anything else
			else {
				// ignore
			}
		}
		// mentions exist
		else {
			const k_mention = g_autocomplete_active.mention;

			// ensure macro exists
			try {
				void k_mention.macroDom;
			}
			catch(e_destroyed) {
				return;
			}

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

				// backspace
				case 'Backspace': {
					try {
						if(!k_mention.searchTerm) {
							throw new Error(`empty search term`);
						}
					}
					catch(e_abandoned) {
						d_event.stopImmediatePropagation();
						d_event.preventDefault();

						// hide overlay and allow mention to auto-destroy
						try {
							k_mention.hideOverlay();
						}
						catch(e_destroy) {}
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


export function attach_editor_bindings(_y_editor: PatchedEditor, _g_context: Context, _d_doc_editor: Document): void {
	y_editor = _y_editor;
	g_context = _g_context;
	d_doc_editor = _d_doc_editor;

	init_bindings();

	void Mention.initGlobalPrecache(g_context);
}
