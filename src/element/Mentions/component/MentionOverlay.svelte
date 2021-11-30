<script lang="ts">
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
		DisplayMode,
	} from '../model/Autocomplete';

	import type {
		Channel,
	} from '../model/Autocomplete';

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

	import Fa from 'svelte-fa';

	import {
		faAngleDown,
	} from '@fortawesome/free-solid-svg-icons';

	import {
		createEventDispatcher,
		onMount,
	} from 'svelte';

	import {
		GroupState,
		Row,
		RowGroup,
	} from '../model/Autocomplete';

	import type {
		Mention,
	} from '../model/Mention';
import { SI_EDITOR_SYNC_KEY } from '#/vendor/confluence/module/confluence';

	export let k_mention: Mention;
	
	export let b_display = false;
	export let sx_offset_x = '0px';
	export let sx_offset_y = '0px';
	export let i_select = 0;
	export let h_groups: Record<string, RowGroup> = {};

	export let xc_mode = DisplayMode.ITEM;
	export let a_attributes: ValuedLabeledObject[] = [];

	// export let k_session: AutocompleteSession;


	const SI_CLASS_ITEM_SELECTED = 'item-selected';

	let s_search = '';
	let dm_container!: HTMLDivElement;
	let dm_content!: HTMLDivElement;

	const f_dispatch = createEventDispatcher();
	onMount(() => {
		f_dispatch('dom', {
			dm_container,
			dm_content,
		});
	});

	// export let k_session = new AutocompleteSession({
	// 	g_context,
	// 	ready(h_channels) {
	// 		h_groups = ode(h_channels).reduce((h_out, [si_channel, g_channel]) => ({
	// 			...h_out,
	// 			[g_channel.hash]: {
	// 				channel_hash: g_channel.hash,
	// 				state: GroupState.DIRTY,
	// 				rows: [],
	// 			} as RowGroup,
	// 		}), {});
	// 	},
	// });

	function filter_channels(s_name: string) {
		k_mention.setChannelUse(g_channel => s_name === g_channel.connection.label);
		qs(dm_container, '.filter.selected')?.classList.remove('selected');
		qs(dm_container, `.filter[data-channel="${s_name}"]`)?.classList.add('selected');

		// reload view
		render_search();
	}

	function enable_all_channels() {
		k_mention.setChannelUse(() => true);
		qs(dm_container, '.filter.selected')?.classList.remove('selected');
		qs(dm_container, `.filter[data-channel-all]`)?.classList.add('selected');

		// reload view
		render_search();
	}

	function row_id(g_row: Row, si_channel: string) {
		return `DNG:${g_row.subtitle}`;
	}


	function select_row(g_attr?: ValuedLabeledObject<string>) {
		const dm_selected = qs(dm_content, '.item-selected');

		if(!dm_selected) {
			throw new Error(`Cannot select item, nothing selected`);
		}

		if(DisplayMode.ITEM === xc_mode) {
			return select_item(dm_selected);
		}
		else if(DisplayMode.ATTRIBUTE === xc_mode) {
			return select_attribute(g_attr!);
		}
	}

	function show_attribute_selector(dm_macro: HTMLElement) {
		xc_mode = DisplayMode.ATTRIBUTE;
		b_display = true;

		queueMicrotask(() => {
			const dm_hover = document.querySelector(':hover');
			if(dm_hover) {
				const dm_row = dm_hover.closest('.row[data-attribute]');

				if(dm_row) {
					for(const dm_selected of qsa(dm_macro, `.${SI_CLASS_ITEM_SELECTED}`) as HTMLElement[]) {
						dm_selected.classList.remove(SI_CLASS_ITEM_SELECTED);
					}

					dm_row.classList.add(SI_CLASS_ITEM_SELECTED);
				}
			}
		});
	}

	function select_item(dm_selected: Element): void {
		// placeholder id
		const si_item = dm_selected.getAttribute('data-id')!;

		// lookup item iri
		const p_item = dm_selected.getAttribute('data-iri')!;

		// lookup channel hash
		const si_channel = dm_selected.parentElement!.getAttribute('data-channel-hash')!;

		void k_mention.selectItem(si_channel, p_item, si_item);
	}

	function select_attribute(g_attr: ValuedLabeledObject<string>): void {
		// select attribute
		void k_mention.selectAttribute(g_attr);

		// hide autocomplete
		b_display = false;
	}

	function mouseenter_row(d_event: MouseEvent) {
		for(const dm_selected of qsa((d_event.target as HTMLElement).closest('.filter-content')!, `.${SI_CLASS_ITEM_SELECTED}`) as HTMLElement[]) {
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

	function render_search(_s_search: string=s_search) {
		s_search = _s_search;
	}


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


	k_mention.routeMessages({
		render_search,
		select_row,
		select_item,
		bump_selection,
		show_attribute_selector,
	});

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


<div class="container" style="display:{b_display? 'block': 'none'}; left:{sx_offset_x}; top:{sx_offset_y};" bind:this={dm_container}>
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
									on:click={() => select_row()}
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
								on:mouseenter={mouseenter_row}
								on:mouseleave={mouseleave_row}
								on:click={() => select_row(g_attr)}
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
