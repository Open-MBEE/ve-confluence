<script lang="ts">
	import {onMount} from 'svelte';

	import {
		dd,
		encode_attr,
		qs,
		qsa,
	} from '#/util/dom';

	import type {PatchedEditor} from '#/common/meta';

	import type {Context} from '#/model/Serializable';

	import {AutocompleteSession} from '../model/AutocompleteSession';

	import type {QueryRow} from '#/common/types';

	import type {Connection} from '#/model/Connection';

	import { escape_html } from '#/util/strings';

	export let y_editor: PatchedEditor;
	export let g_context: Context;

	interface CompleteRow {
		title: string;
		subtitle: string;
		source: Connection;
		uri: string;
	}

	let s_search = '';
	let b_display = false;
	let x_offset_x = 0;
	let x_offset_y = 0;
	let a_complete: CompleteRow[] = [];


	let k_session = new AutocompleteSession({
		g_context,
	});

	y_editor.on('input', (y_event: InputEvent) => {
		// get selection
		let g_sel;
		try {
			g_sel = y_editor.selection.getSel();
		}
		catch(e_sel) {
			return;
		}

		// no selection; abort
		if(!g_sel) return;

		// @ts-expect-error anchorNode not defined in typings
		const dm_anchor = g_sel.anchorNode as HTMLElement;

		// text node; traverse up
		const dm_focus = ('#text' === dm_anchor.nodeName? dm_anchor.parentNode: dm_anchor) as HTMLElement;

		// find mention data
		const dm_mentions = dm_focus.hasAttribute('data-mention')? [dm_focus]: qsa(dm_focus, '[data-mention]');

		// mention data node not found; exit
		if(!dm_mentions.length) return;

		// single mention node
		if(1 === dm_mentions.length) {
			// extract mention query
			s_search = dm_anchor.textContent!.replace(/^@/, '');

			// prevent confluence from doing something
			y_event.stopImmediatePropagation();

			// apply query
			void k_session.update(s_search, (k_connection: Connection, a_rows: QueryRow[]) => {
				let a_mapped: CompleteRow[] = [];

				if('DNG Requirements' === k_connection.label) {
					// debugger;
					a_mapped = a_rows.map(h_row => ({
						title: h_row.requirementNameValue.value,
						subtitle: h_row.idValue.value,
						uri: h_row.artifact.value,
						source: k_connection,
					}));
				}

				a_complete = [...a_mapped];
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
	y_editor.on('keydown', (y_event: KeyboardEvent) => {  // eslint-disable-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
		// new mention
		if('@' === y_event.key) {
			y_event.stopImmediatePropagation();
			y_event.preventDefault();

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
			x_offset_y = x_top + 100;

			// insert new mention
			y_editor.execCommand('mceInsertContent', false, `<span class="ve-mention" data-mention="${encode_attr({})}">@</span>`);
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
		return escape_html(s_display).replace(s_search, `<b>${s_search}</b`);
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

					.row {
						padding: 6px;
						cursor: default;
						display: flex;

						&:hover {
							background-color: #ECF0FF;
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


<div class="container" style="display:{b_display? 'block': 'none'}; left:{x_offset_x}px; top:{x_offset_y}px;">
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
			<div class="content selected">
				{#each a_complete as g_complete}
					<div class="row" data-uri={g_complete.uri}>
						<span class="ve-icon">
							{@html H_ICONS[g_complete.source.label]}
						</span>
						<span class="info">
							<div class="title">
								{@html bolden_keyword(g_complete.title)}
							</div>
							<div class="subtitle">
								{@html bolden_keyword(g_complete.subtitle)}
							</div>
						</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
