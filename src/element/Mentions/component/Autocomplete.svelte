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

	import type {QueryRow,
		ValuedLabeledObject} from '#/common/types';

	import type {Connection} from '#/model/Connection';

	import {escape_html} from '#/util/strings';

	import AsyncLockPool from '#/util/async-lock-pool';

	import {
		escape_regex,
		ode,
		oderac,
	} from '#/util/belt';

	import Select from 'svelte-select';

import Fa from 'svelte-fa';

import {faAngleDown,
		faArrowDown} from '@fortawesome/free-solid-svg-icons';

import {safe_not_equal} from 'svelte/internal';

	export let y_editor: PatchedEditor;
	export let g_context: Context;

	enum GroupState {
		FRESH,
		DIRTY,
	}

	enum DisplayMode {
		ITEM,
		ATTRIBUTE,
	}

	interface Row {
		title: string;
		subtitle: string;
		source: Connection;
		uri: string;
	}

	type RowGroup = {
		channel_hash: string;
		state: GroupState;
		rows: Row[];
	};

	const SI_CLASS_ITEM_SELECTED = 'item-selected';

	let s_search = '';
	let b_display = false;
	let x_offset_x = 0;
	let x_offset_y = 0;
	let h_groups: Record<string, RowGroup> = {};
	let i_select = 0;
	let dm_container!: HTMLDivElement;
	let dm_content!: HTMLDivElement;
	let xc_mode = DisplayMode.ITEM;
	let a_attributes: ValuedLabeledObject[] = [];

	let k_session = new AutocompleteSession({
		g_context,
		ready(h_channels) {
			h_groups = ode(h_channels).reduce((h_out, [si_channel, g_channel]) => ({
				...h_out,
				[g_channel.hash]: {
					channel_hash: g_channel.hash,
					state: GroupState.DIRTY,
					rows: [],
				} as RowGroup,
			}), {});
		},
	});

	function filter_channels(s_name: string) {
		k_session.setChannelUse(g_channel => s_name === g_channel.connection.label);
		qs(dm_container, '.filter.selected')?.classList.remove('selected');
		qs(dm_container, `.filter[data-channel="${s_name}"]`)?.classList.add('selected');

		// reload view
		render_search();
	}

	function enable_all_channels() {
		k_session.setChannelUse(() => true);
		qs(dm_container, '.filter.selected')?.classList.remove('selected');
		qs(dm_container, `.filter[data-channel-all]`)?.classList.add('selected');

		// reload view
		render_search();
	}

	function row_id(g_row: Row, si_channel: string) {
		return `DNG:${g_row.subtitle}`;
	}

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

	function* range(s_from: string, s_to: string) {
		for(let i_char=s_from.codePointAt(0)!, i_to=s_to.codePointAt(0)!; i_char<i_to; i_char++) {
			yield String.fromCodePoint(i_char);
		}
	}

	interface Scenario {
		input: string;
		groups: Record<string, RowGroup>;
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

			const h_groups_local: Record<string, RowGroup> = {};

			let g_scenario: Scenario = H_PRECACHE[s_input] = {
				input: s_input,
				ready: false,
				groups: h_groups_local,
			};

			void k_session_precache.update(s_input, (g_channel, a_rows) => {
				h_groups_local[g_channel.hash] = {
					channel_hash: g_channel.hash,
					state: XC_FRESH,
					rows: a_rows.map(h => query_row_to_display_row(h, g_channel.connection)),
				};
			}, true).then(() => {
				for(const si_channel of Object.keys(h_groups_local)) {
					if(!h_groups_local[si_channel]) {
						h_groups_local[si_channel] = {
							channel_hash: si_channel,
							state: XC_FRESH,
							rows: [] as Row[],
						};
					}
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

				// for(const s_char of range('a', 'z')) {
				// 	void precache(s_char+'a');
				// 	void precache(s_char+'e');
				// 	void precache(s_char+'i');
				// 	void precache(s_char+'o');
				// 	void precache(s_char+'u');
				// }

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

		let a_mentions = dm_focus.hasAttribute('data-mention')? [dm_focus]: qsa(dm_focus, '[data-mention]') as HTMLElement[];

		if(!a_mentions.length) {
			const a_mentions_all = qsa(document, '[data-mention]') as HTMLElement[];
			if(1 === a_mentions_all.length) a_mentions = a_mentions_all;
		}

		// find mention data
		return {anchor:dm_anchor, mentions:a_mentions};
	}

	async function select_row() {
		const dm_selected = qs(dm_content, '.item-selected');

		if(!dm_selected) {
			throw new Error(`Cannot select item, nothing selected`);
		}

		if(DisplayMode.ITEM === xc_mode) {
			return await select_item(dm_selected);
		}
		else if(DisplayMode.ATTRIBUTE === xc_mode) {
			return select_attribute(dm_selected);
		}
	}

	function prompt_attribute_selector(dm_mention: HTMLDivElement) {
		qs(dm_mention, '.attribute').classList.add('active');
		xc_mode = DisplayMode.ATTRIBUTE;
		b_display = true;

		queueMicrotask(() => {
			const dm_hover = document.querySelector(':hover');
			if(dm_hover) {
				const dm_row = dm_hover.closest('.row[data-attribute]');

				if(dm_row) {
					for(const dm_selected of qsa(dm_mention, SI_CLASS_ITEM_SELECTED) as HTMLElement[]) {
						dm_selected.classList.remove(SI_CLASS_ITEM_SELECTED);
					}

					dm_row.classList.add(SI_CLASS_ITEM_SELECTED);
				}
			}
		});
	}

	async function select_item(dm_selected: HTMLDivElement) {
		// placeholder id
		const si_item = dm_selected.getAttribute('data-id');

		// lookup item iri
		const p_item = dm_selected.getAttribute('data-iri')!;

		// lookup channel hash
		const si_channel = dm_selected.parentElement!.getAttribute('data-channel-hash')!;

		// mention data nodes
		const {mentions:a_mentions} = get_mentions();

		// each mention
		for(const dm_mention of a_mentions) {
			// make mention not editable
			dm_mention.contentEditable = 'false';

			// replace content
			dm_mention.textContent = `@${si_item}`;

			// get channel
			const g_channel = k_session.getChannel(si_channel);

			// set mention metadata
			dm_mention.setAttribute('data-mention', encode_attr({
				connection_path: g_channel.connection_path,
				connection: g_channel.connection.toSerialized(),
				item: {
					iri: p_item,
				},
			}));
		}

		// get item details
		const g_item = await k_session.fetchItemDetails(si_channel, p_item);

		// each mention
		for(const dm_mention of a_mentions) {
			// load attributes
			a_attributes = oderac(g_item, (si_key, {label:s_label, value:s_value}) => ({
				label: s_label,
				key: si_key,
				value: s_value,
			}));

			// switch to attribute selector
			xc_mode = DisplayMode.ATTRIBUTE;

			// create active attribute selector
			dm_mention.appendChild(dd('span', {
				class: 'attribute active',
				contentEditable: 'false',
			}, [
				dd('span', {
					class: 'content',
				}, [
					'|',  // cursor preview
				]),
				dd('span', {
					class: 'indicator',
				}),
			]));

			const dm_attribute = qs(dm_mention, '.attribute') as HTMLSpanElement;

			dm_attribute.addEventListener('click', () => {
				prompt_attribute_selector(dm_mention);
			});
			dm_attribute.addEventListener('input', () => {
				prompt_attribute_selector(dm_mention);
			});
			dm_attribute.addEventListener('keydown', (d_event) => {
				d_event.preventDefault();

				if('Backspace' === d_event.key) {
					dm_attribute.textContent = '|';
				}

				prompt_attribute_selector(dm_mention);
			});

			new Fa({
				target: qs(dm_attribute, '.indicator'),
				props: {
					icon: faAngleDown,
				},
			});
		}
	}

	function select_attribute(dm_selected: HTMLDivElement): void {
		//
		const g_attr = decode_attr(dm_selected.getAttribute('data-attribute')!) as ValuedLabeledObject;

		// mention data nodes
		const {mentions:a_mentions} = get_mentions();

		// each mention
		for(const dm_mention of a_mentions) {
			// selector no longer active
			const dm_attribute = qs(dm_mention, '.attribute');
			dm_attribute.classList.remove('active');

			// parse mention metadata
			const g_mention = decode_attr(dm_mention.getAttribute('data-mention')!) as Record<string, unknown>;

			// add display attribute and re-encode
			dm_mention.setAttribute('data-mention', encode_attr({
				...g_mention,
				display_attribute: g_attr,
			}));

			// replace text content with new attribute
			qs(dm_attribute, '.content').textContent = g_attr.label;
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

	const XT_DEBOUNCE = 350;
	let i_debounce = 0;

	function render_search(b_debounce=false) {
		// precache available
		const g_scenario = H_PRECACHE[s_search];
		if(g_scenario?.ready) {
			// update
			h_groups = g_scenario.groups;

			// exit
			return;
		}

		// debounce
		clearTimeout(i_debounce);
		i_debounce = setTimeout(() => {
			// apply query
			void k_session.update(s_search, (g_channel: Channel, a_rows: QueryRow[]) => {
				let a_mapped: Row[] = [];
				const k_connection = g_channel.connection;

				if('DNG Requirements' === g_channel.connection.label) {
					a_mapped = a_rows.map(h_row => ({
						title: h_row.requirementNameValue.value,
						subtitle: h_row.idValue.value,
						uri: h_row.artifact.value,
						source: k_connection,
					}));
				}

				// ref/create group
				const si_channel = g_channel.hash;
				const g_group = h_groups[si_channel] = h_groups[si_channel] || {
					channel_hash: si_channel,
					state: GroupState.DIRTY,
					rows: [],
				};

				// update rows
				g_group.rows = a_mapped;

				// clean state
				g_group.state = GroupState.FRESH;

				// update
				h_groups = h_groups;
			});
		}, b_debounce? XT_DEBOUNCE: 0);
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

			// render search
			render_search(true);

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
					return;
				}

				// accept item
				case 'Accept':
				case 'Enter': {
					d_event.preventDefault();
					select_item();
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
				b_display = false;
			}

			// abort pending requests
			k_session.abortAll();

			// invalidate all groups
			for(const [, g_group] of ode(h_groups)) {
				g_group.state = GroupState.DIRTY;
			}

			// indicate update to svelte
			h_groups = h_groups;
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
			padding: 6px 8px 4px;
			height: 20px;
			border-bottom: 1px solid var(--ve-color-medium-light-text);
		}

		.filter-select-scrollable {
			.no-scrollbar();

			overflow-x: scroll;
			padding: 6px;
			height: 20px;
			background-color: var(--ve-color-medium-light-text);

			.filter-select {
				width: max-content;
				cursor: pointer;

				.filter {
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

		.filter-content-scrollable {
			overflow-y: scroll;
			overflow-x: hidden;
			height: calc(100% - 64px);

			.filter-content {
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

	:global(.ve-mention .selectContainer) {
		--height: 20px;
		--inputPadding: 0 4px;
		--itemPadding: 0 4px;
		--padding: 0 4px;
		--selectedItemPadding: 0 4px;
		--background: var(--ve-color-button-light);
		--itemActiveBackground: var(--ve-color-medium-light-text);
		--itemIsActiveBG: var(--ve-color-medium-text);
		--itemIsActiveColor: var(--ve-color-light-text);
		--itemHoverBG: #ECF0FF;
		--border: 1px solid var(--ve-color-medium-light-text);
		--borderFocusColor: var(--ve-color-medium-light-text);
		--borderRadius: 3px;
		margin-left: 4px;
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
		{#if DisplayMode.ITEM === xc_mode}
			Insert Cross-Reference
		{:else if DisplayMode.ATTRIBUTE === xc_mode}
			Select Display Attribute
		{/if}
	</div>

	{#if DisplayMode.ITEM === xc_mode}
		<div class="filter-select-scrollable">
			<div class="filter-select">
				<span class="filter selected" data-channel-all=1 on:click={() => enable_all_channels()}>
					All
				</span>
				<span class="filter" data-channel="DNG Requirements" on:click={() => filter_channels('DNG Requirements')}>
					DNG Requirements
				</span>
				<span class="filter" data-channel="Helix" on:click={() => filter_channels('Helix')}>
					Helix Dictionary Items
				</span>
				<span class="filter" data-channel="People" on:click={() => filter_channels('People')}>
					People
				</span>
			</div>
		</div>
	{/if}

	<div class="filter-content-scrollable">
		<div class="filter-content">
			<div class="content" bind:this={dm_content}>
				{#if DisplayMode.ITEM === xc_mode}
					{#each ode(h_groups) as [, g_group], i_group}
						<div class="group" class:dirty={GroupState.DIRTY === g_group.state} data-channel-hash={g_group.channel_hash}>
							{#each g_group.rows as g_row, i_row}
								<div class="row"
									data-iri={g_row.uri}
									data-id={row_id(g_row, g_group.channel_hash)}
									on:mouseenter={mouseenter_row}
									on:mouseleave={mouseleave_row}
									on:click={select_row}
									class:item-selected={!i_group && !i_row}
								>
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
				{:else if DisplayMode.ATTRIBUTE === xc_mode}
					{#each a_attributes as g_attr, i_attr}
						<div class="group">
							<div class="row"
								data-attribute={encode_attr(g_attr)}
								on:mouseenter={mouseenter_row}
								on:mouseleave={mouseleave_row}
								on:click={select_row}
								class:item-selected={!i_attr}
							>
								<span class="info">
									<div class="title">
										{g_attr.label}
									</div>
									<div class="subtitle">
										{g_attr.value}
									</div>
								</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>
