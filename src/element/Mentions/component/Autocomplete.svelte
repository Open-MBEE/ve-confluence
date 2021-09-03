<script lang="ts">
	import {onMount} from 'svelte';

	import {
		dd,
		decode_attr,
		encode_attr,
		qs,
		qsa,
	} from '#/util/dom';

	import type {PatchedEditor} from '#/common/meta';

	import type {Context} from '#/model/Serializable';

	import {
		AutocompleteSession,
	} from '../model/AutocompleteSession';

	import type {
		Channel,
	} from '../model/AutocompleteSession';

	import type {QueryRow} from '#/common/types';

	import type {Connection} from '#/model/Connection';

	import {escape_html} from '#/util/strings';
import AsyncLockPool from '#/util/async-lock-pool';
import { escape_regex } from '#/util/belt';

	export let y_editor: PatchedEditor;
	export let g_context: Context;

	enum GroupState {
		FRESH,
		DIRTY,
	}

	interface Row {
		title: string;
		subtitle: string;
		source: Connection;
		uri: string;
	}

	type RowGroup = {
		state: GroupState;
		rows: Row[];
	};

	const SI_CLASS_ITEM_SELECTED = 'item-selected';

	let s_search = '';
	let b_display = false;
	let x_offset_x = 0;
	let x_offset_y = 0;
	let a_groups: RowGroup[] = [];
	let i_select = 0;
	let dm_container!: HTMLDivElement;
	let dm_content!: HTMLDivElement;

	let k_session = new AutocompleteSession({
		g_context,
		ready(a_channels) {
			a_groups = a_channels.map(g_channel => ({
				state: GroupState.DIRTY,
				rows: [],
			}) as RowGroup);
		},
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

	const H_CACHE: Record<string, {
		title: string;
		id: string;
	}> = {};

	function* range(s_from: string, s_to: string) {
		for(let i_char=s_from.codePointAt(0)!, i_to=s_to.codePointAt(0)!; i_char<i_to; i_char++) {
			yield String.fromCodePoint(i_char);
		}
	}

	interface Scenario {
		input: string;
		groups: RowGroup[];
		ready: boolean;
	}

	const query_row_to_display_row = (h_row: QueryRow, k_connection: Connection): Row => ({
		title: h_row.requirementNameValue.value,
		subtitle: h_row.idValue.value,
		uri: h_row.artifact.value,
		source: k_connection,
	});

	const H_PRECACHE: Record<string, Scenario> = {};
	{
		const XC_FRESH = GroupState.FRESH;
		const kl_precache = new AsyncLockPool(16);

		const precache = async(s_input: string) => {
			const f_release = await kl_precache.acquire();

			const a_groups_local: RowGroup[] = [];

			const g_scenario: Scenario = H_PRECACHE[s_input] = {
				input: s_input,
				ready: false,
				groups: a_groups_local,
			};

			void k_session_precache.update(s_input, (g_channel, a_rows) => {
				a_groups_local[g_channel.index] = {
					state: XC_FRESH,
					rows: a_rows.map(h => query_row_to_display_row(h, g_channel.connection)),
				};
			}).then(() => {
				for(let i_check=0; i_check<a_groups_local.length; i_check++) {
					if(!a_groups_local[i_check]) a_groups_local[i_check] = {state:XC_FRESH, rows:[] as Row[]};
				}

				g_scenario.ready = true;
				f_release();
				console.log(`precached search: "${s_input}"`);
			});
		};

		const k_session_precache = new AutocompleteSession({
			g_context,
			ready() {
				for(const s_char of range('0', '9')) {
					void precache(s_char);
				}

				for(const s_char of range('a', 'z')) {
					void precache(s_char);
				}

				void precache('tr');
				void precache('ch');
				void precache('sh');
				void precache('th');

				for(const s_char of range('a', 'z')) {
					void precache(s_char+'a');
					void precache(s_char+'e');
					void precache(s_char+'i');
					void precache(s_char+'o');
					void precache(s_char+'u');
				}

				for(const s_char of range('a', 'z')) {
					if('bcfgps'.includes(s_char)) {
						void precache(s_char+'r');
						void precache(s_char+'l');
					}
				}
			},
		});
	}


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

		// find mention data
		return {anchor:dm_anchor, mentions:dm_focus.hasAttribute('data-mention')? [dm_focus]: qsa(dm_focus, '[data-mention]') as HTMLElement[]};
	}

	function select_item() {
		const dm_selected = qs(dm_content, '.item-selected');

		if(!dm_selected) {
			throw new Error(`Cannot select item, nothing selected`);
		}

		const p_item = dm_selected.getAttribute('data-uri')!;

		const {
			title: s_title,
			id: si_item,
		} = H_CACHE[p_item];

		// mention data nodes
		const {anchor:dm_anchor, mentions:a_mentions} = get_mentions();

		// replace content
		for(const dm_mention of a_mentions) {
			dm_mention.textContent = `@${si_item}`;

			const dm_attribute = dd('');

			// append attribute selector
			dm_mention.appendChild(dm_attribute);
		}

		// hide autocomplete
		b_display = false;
	}
	

	function mouseenter_row(d_event: MouseEvent) {
		for(const dm_selected of qsa(dm_content, SI_CLASS_ITEM_SELECTED) as HTMLElement[]) {
			dm_selected.classList.remove(SI_CLASS_ITEM_SELECTED);
		}

		(d_event.target as HTMLElement).classList.add(SI_CLASS_ITEM_SELECTED);
	}

	function mouseleave_row(d_event: MouseEvent) {
		(d_event.target as HTMLElement).classList.remove(SI_CLASS_ITEM_SELECTED);
	}

	function ensure_selected_visible() {
		const dm_selected = qs(dm_content, '.'+SI_CLASS_ITEM_SELECTED) as HTMLDivElement | null;

		if(!dm_selected) return;

		dm_selected.scrollIntoView({
			behavior: 'smooth',
			block: 'nearest',
		});
	}

	function bump_selection(xc_direction: -1 | 1) {
		const dm_selected = qs(dm_content, '.'+SI_CLASS_ITEM_SELECTED);
		if(!dm_selected) {
			const dm_first = qs(dm_content, '.row');

			if(dm_first) {
				dm_first.classList.add(SI_CLASS_ITEM_SELECTED);
			}
		}
		else if(xc_direction > 0) {
			const dm_next = dm_selected.nextElementSibling;
			if(dm_next) {
				dm_selected.classList.remove(SI_CLASS_ITEM_SELECTED);
				dm_next.classList.add(SI_CLASS_ITEM_SELECTED);

				ensure_selected_visible();
			}
		}
		else if(xc_direction < 0) {
			const dm_prev = dm_selected.previousElementSibling;
			if(dm_prev) {
				dm_selected.classList.remove(SI_CLASS_ITEM_SELECTED);
				dm_prev.classList.add(SI_CLASS_ITEM_SELECTED);

				ensure_selected_visible();
			}
		}
	}

	y_editor.on('input', (y_event: InputEvent) => {
		// mention data nodes
		const {anchor:dm_anchor, mentions:a_mentions} = get_mentions();

		// no nodes; exit
		if(!dm_anchor || !a_mentions.length) return;

		// single mention node
		if(1 === a_mentions.length) {
			// extract mention query
			s_search = dm_anchor.textContent!.replace(/^@/, '').trim().toLocaleLowerCase();

			// prevent confluence from doing something
			y_event.stopImmediatePropagation();

			// precache available
			const g_scenario = H_PRECACHE[s_search];
			if(g_scenario?.ready) {
				// update
				a_groups = g_scenario.groups;

				// exit
				return;
			}

			// apply query
			void k_session.update(s_search, (g_channel: Channel, a_rows: QueryRow[]) => {
				let a_mapped: Row[] = [];
				const k_connection = g_channel.connection;

				if('DNG Requirements' === g_channel.connection.label) {
					a_mapped = a_rows.map((h_row) => {
						H_CACHE[h_row.artifact.value] = {
							title: h_row.requirementNameValue.value,
							id: `DNG:${h_row.idValue.value}`,
						};

						return {
							title: h_row.requirementNameValue.value,
							subtitle: h_row.idValue.value,
							uri: h_row.artifact.value,
							source: k_connection,
						};
					});
				}

				// ref group
				const g_group = a_groups[g_channel.index];

				// update rows
				g_group.rows = a_mapped;

				// clean state
				g_group.state = GroupState.FRESH;

				// update
				a_groups = a_groups;
			});

			return;
		}
		// multiple mention nodes
		else {
			debugger;
			{
				// replace all mentions nodes with offset locator
				const dm_anchor_clone = dm_anchor.cloneNode(true) as HTMLElement;
				let i_mention = 0;
				for(const dm_mention_each of qsa(dm_anchor_clone, '[data-mention]')) {
					dm_mention_each.replaceWith(dm_anchor_clone.ownerDocument.createTextNode(`<mention data-index="${i_mention++}" />`));
				}
			}
		}
	}, true);

	// bind tinymce keydown
	y_editor.on('keydown', (d_event: KeyboardEvent) => {  // eslint-disable-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
		// mention data nodes
		const {mentions:a_mentions} = get_mentions();

		// no nodes
		if(!a_mentions.length) {
			// new mention
			if('@' === d_event.key) {
				d_event.stopImmediatePropagation();
				d_event.preventDefault();

				// get cursor offset
				const g_rect = y_editor.selection.getBoundingClientRect();

				if(!g_rect) {
					debugger;
					throw new Error(`y_editor.selection has no bounding client rect`);
				}

				const {
					left: x_left,
					top: x_top,
				} = g_rect;

				// update autocomplete widget offset
				b_display = true;
				x_offset_x = x_left + 15;
				x_offset_y = x_top + 107;

				// insert new mention
				y_editor.execCommand('mceInsertContent', false, `<span class="ve-mention" data-mention="${encode_attr({})}">@</span>`);
			}
			// other, cancel mentions
			else {
				k_session.abortAll();
				b_display = false;
			}
		}
		// mentions exist
		else {
			const si_key = d_event.key;

			// navigation key
			switch(si_key) {
				// go up
				case 'ArrowUp': {
					d_event.preventDefault();
					bump_selection(-1);
					return;
				}

				// go down
				case 'ArrowDown': {
					d_event.preventDefault();
					bump_selection(+1);
					return;
				}

				// select attribute
				case 'Tab': {
					break;
				}

				// accept item
				case 'Accept':
				case 'Enter': {
					d_event.preventDefault();
					select_item();
					break;
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
				b_display = false;
			}

			// abort pending requests
			k_session.abortAll();

			// invalidate all groups
			for(const g_group of a_groups) {
				g_group.state = GroupState.DIRTY;
			}

			// indicate update to svelte
			a_groups = a_groups;
		}
	}, true);


	const H_ICONS: Record<string, string> = {
		'DNG Requirements': `
			<svg style="transform:scale(0.75, 0.75)" width="33" height="33" version="2.0">
				<use href="#ve-icon-dng" />
			</svg>
		`,
	};

	function bolden_keyword(s_display: string) {
		return escape_html(s_display).replace(new RegExp('('+escape_regex(s_search)+')', 'i'), '<b>$1</b>');
	}

</script>

<style lang="less">
	.no-scrollbar() {
		&::-webkit-scrollbar {
			display: none;
		}
		scrollbar-width: none;
		-ms-overflow-style: none;  // Edge
	}

	.container {
		position: absolute;
		display: none;
		width: 300px;
		height: 250px;
		background-color: var(--ve-color-light-background);
		border: 1px solid var(--ve-color-accent-darker);
		overflow: hidden;
		box-shadow: 3px 3px 14px 2px rgba(0, 0, 0, 0.2);

		.heading {
			font-weight: 600;
			padding: 6px 8px;
			height: 20px;
		}

		.tab-select-scrollable {
			.no-scrollbar();

			overflow-x: scroll;
			padding: 6px;
			height: 20px;
			background-color: var(--ve-color-medium-light-text);

			.tab-select {
				width: max-content;
				cursor: pointer;

				.tab {
					padding: 6px;

					&:hover {
						text-decoration: underline;
					}

					&.selected {
						font-weight: 600;
						text-decoration: underline;
					}
				}
			}
		}

		.tab-content-scrollable {
			overflow-y: scroll;
			overflow-x: hidden;
			height: calc(100% - 64px);

			.tab-content {
				.content {
					display: hidden;

					.selected {
						display: inline-block;
					}

					.group {

						&.dirty {
							filter: blur(1px);
							opacity: 0.5;
						}

						.row {
							padding: 5px 6px;
							cursor: default;
							display: flex;
							border: 1px solid transparent;

							&.item-selected {
								background-color: #ECF0FF;
								border-top: 1px solid rgba(100, 100, 100, 0.2);
								border-bottom: 1px solid rgba(100, 100, 100, 0.2);
							}

							.ve-icon {
							}

							.info {
								.no-scrollbar();
								overflow-x: scroll;

								.title {
									width: max-content;
								}
								.subtitle {
									width: max-content;

									font-size: 12px;
									color: var(--ve-color-medium-text);
								}
							}
						}
					}
				}
			}
		}
	}
</style>

<svg style="display:none" version="2.0" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<symbol id="ve-icon-dng" width="33" height="33" viewBox="0 0 33 33" fill="none">
			<circle cx="16.4846" cy="16.2207" r="14.72" fill="#1E9EB7"/>
			<path fill-rule="evenodd" clip-rule="evenodd" d="M18.245 6.30078L9.125 8.22078V21.9808L18.245 25.1808V21.9808V21.3408V8.86078V8.22078V6.30078ZM15.845 16.8608V13.3408C15.845 13.3408 17.125 13.3408 17.125 14.9408C17.125 16.5408 15.845 16.8608 15.845 16.8608Z" fill="white"/>
			<path d="M22.885 8.22078H18.245V8.86078H22.405L22.245 21.3408H18.245V21.9808H22.885V8.22078Z" fill="white"/>
			<path fill-rule="evenodd" clip-rule="evenodd" d="M16.4846 29.3407C23.7306 29.3407 29.6046 23.4667 29.6046 16.2207C29.6046 8.97472 23.7306 3.10069 16.4846 3.10069C9.23863 3.10069 3.36461 8.97472 3.36461 16.2207C3.36461 23.4667 9.23863 29.3407 16.4846 29.3407ZM16.4846 29.9807C24.084 29.9807 30.2446 23.8201 30.2446 16.2207C30.2446 8.62125 24.084 2.46069 16.4846 2.46069C8.88517 2.46069 2.72461 8.62125 2.72461 16.2207C2.72461 23.8201 8.88517 29.9807 16.4846 29.9807Z" fill="#0A6673"/>
		</symbol>
	</defs>
</svg>


<div class="container" style="display:{b_display? 'block': 'none'}; left:{x_offset_x}px; top:{x_offset_y}px;" bind:this={dm_container}>
	<div class="heading">
		Insert Cross-Reference
	</div>

	<div class="tab-select-scrollable">
		<div class="tab-select">
			<span class="tab selected">
				All
			</span>
			<span class="tab">
				DNG Requirements
			</span>
			<span class="tab">
				Helix Dictionary Items
			</span>
			<span class="tab">
				People
			</span>
		</div>
	</div>

	<div class="tab-content-scrollable">
		<div class="tab-content">
			<div class="content" bind:this={dm_content}>
				{#each a_groups as g_group, i_group}
					<div class="group" class:dirty={GroupState.DIRTY === g_group.state}>
						{#each g_group.rows as g_row, i_row}
							<div class="row" data-uri={g_row.uri} on:mouseenter={mouseenter_row} on:mouseleave={mouseleave_row} on:click={select_item} class:item-selected={!i_group && !i_row}>
								<span class="ve-icon">
									{@html H_ICONS[g_row.source.label]}
								</span>
								<span class="info">
									<div class="title">
										{@html bolden_keyword(g_row.title)}
									</div>
									<div class="subtitle">
										{@html bolden_keyword(g_row.subtitle)}
									</div>
								</span>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
