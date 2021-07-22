<script lang="ts">
	import {onMount} from 'svelte';

	import {quadOut} from 'svelte/easing';

	import {slide} from 'svelte/transition';

	import {create_in_transition} from 'svelte/internal';

	import Select from 'svelte-select';

	import Fa from 'svelte-fa';

	import {
		faCheckCircle,
		faCircleNotch,
		faFilter,
		faHistory,
		faQuestionCircle,
	} from '@fortawesome/free-solid-svg-icons';

	import SelectItem from '#/ui/component/SelectItem.svelte';

	import QueryTableParam from './QueryTableParam.svelte';

	import type {
		QueryField,
		QueryTable,
	} from '../model/QueryTable';

	import type {
		QueryRow,
		ValuedLabeledObject,
	} from '#/common/types';

	import type {
		Connection,
		ModelVersionDescriptor,
	} from '#/model/Connection';

	import {
		autoCursorMutate,
		ConfluencePage,
		wrapCellInHtmlMacro,
	} from '#/vendor/confluence/module/confluence';

	import xmldom from 'xmldom';

	import XHTMLDocument from '#/vendor/confluence/module/xhtml-document';

	import {process} from '#/common/static';
	import type { TypedString } from '#/util/strings';


	/**
	 * The QueryTable model
	 */
	export let k_query_table: QueryTable;
	/**
	 * The HTML element to which this view element is anchored
	 */
	export let dm_anchor = document.createElement('div');

	/**
	 * An optional XHTML node that should be replaced when publishing this table to the page
	*/
	export let yn_directive: Node & {
		localName: string;
	};

	/**
	 * Whether or not this table is already published
	 */
	export let b_published = false;
	

	// shows/hides the table results
	let b_display_preview = !b_published;

	// shows/hides the parameter controls
	let b_display_parameters = false;

	// the connection model
	let k_connection: Connection;

	// the model version descriptor
	let g_version: ModelVersionDescriptor;

	// once the component mounts
	onMount(async() => {
		// get query table's connection
		const k_connection_new = await k_query_table.fetchConnection();

		// new connection; refresh version
		if(k_connection !== k_connection_new) {
			// cache new connection
			k_connection = k_connection_new;

			// pending version information
			s_display_version = '...';

			// get model version descriptor from connection
			g_version = await k_connection.fetchCurrentVersion();

			// parse datetime string
			const dt_version = new Date(g_version.dateTime);

			// update display version
			s_display_version = `${dt_version.toDateString()} @${dt_version.toLocaleTimeString()}`;
		}

		// render table
		await render();
	});

	const A_DUMMY_TABLE_ROWS = [{}, {}, {}];

	let s_display_version = '...';
	let dm_parameters: HTMLDivElement;

	interface Preview {
		rows: Array<Record<string, TypedString>>;
	}

	let b_busy_loading = false;

	let g_source: {label: string} | null = null;

	g_source = {label:'DNG Requirements'};

	$: dm_anchor.style.display = b_published && b_display_preview? 'none' :'block';

	// anchor provided
	if(dm_anchor) {
		// remove any top margin from table
		dm_anchor.style.marginTop = '0px';
	}

	let g_preview: Preview = {rows:[]};

	enum G_INFO_MODES {
		PREVIEW = 1,
		LOADING = 2,
	}

	let xc_info_mode = G_INFO_MODES.PREVIEW;
	const SX_STATUS_INFO_INIT = 'PREVIEW (0 results)';
	let s_status_info = SX_STATUS_INFO_INIT;

	function clear_preview(): void {
		b_busy_loading = false;

		s_status_info = 'PREVIEW (0 results)';
		xc_info_mode = G_INFO_MODES.PREVIEW;
		g_preview.rows = [];
	}

	const F_RENDER_CELL = (g_row: QueryRow): Record<string, TypedString> => {
		const h_out: Record<string, TypedString> = {};

		for(const k_field of k_query_table.queryType.fields) {
			h_out[k_field.key] = k_field.cell(g_row);
		}

		return h_out;
	};

	async function render() {
		xc_info_mode = G_INFO_MODES.LOADING;

		let b_filtered = false;

		const a_params = await k_query_table.queryType.fetchParameters();
		for(const g_param of a_params) {
			if(k_query_table.parameterValuesList(g_param.key).size) {
				b_filtered = true;
				break;
			}
		}

		// no filters, clear preview
		if(!b_filtered) return clear_preview();

		b_busy_loading = true;

		const k_query = await k_query_table.fetchQueryBuilder();
		const a_rows = await k_connection.execute(k_query.paginate(21));

		if(20 < a_rows.length) {
			// start counting all rows
			k_connection.execute(k_query.count())
				.then((a_counts) => {
					const nl_rows_total = +a_counts[0].count.value;
					s_status_info = `PREVIEW (${20 < nl_rows_total? '20': nl_rows_total} / ${nl_rows_total} result${1 === nl_rows_total ? '' : 's'})`;
				})
				.catch(() => {
					console.error('Failed to count rows for query');
				});
		}

		g_preview.rows = a_rows.map(F_RENDER_CELL);

		b_busy_loading = false;

		s_status_info = `PREVIEW (${20 < a_rows.length ? '>20' : a_rows.length} result${1 === a_rows.length ? '' : 's'})`;
		xc_info_mode = G_INFO_MODES.PREVIEW;
	}

	function toggle_parameters() {
		// toggle parameters display
		b_display_parameters = !b_display_parameters;

		// parameters should not be showing
		if(!b_display_parameters) {
			// table is published; hide the preview
			if(b_published) b_display_preview = false;

			// done
			return;
		}

		// table is published; show the preview
		if(b_published) b_display_preview = true;

		void render();

		queueMicrotask(() => {
			create_in_transition(dm_parameters, slide, {
				duration: 400,
				easing: quadOut,
			}).start();
		});
	}

	function sanitize_false_directives(sx_html: string): string {
		const d_parser = new DOMParser();
		const d_doc = d_parser.parseFromString(sx_html, 'text/html');
		const a_links = d_doc.querySelectorAll(`a[href^="${process.env.DOORS_NG_PREFIX}"]`);
		a_links.forEach(yn_link => yn_link.setAttribute('data-ve4', '{}'));
		return d_doc.body.innerHTML;
	}

	async function publish_table() {
		xc_info_mode = G_INFO_MODES.LOADING;

		// get page content as xhtml document
		const {
			source: k_contents,
			page: k_page,
		} = k_query_table.getContext();

		// fetch query builder
		const k_query = await k_query_table.fetchQueryBuilder();

		// prepare commit message
		let s_commit_message = '';
		{
			const a_where = [];
			const a_params = await k_query_table.queryType.fetchParameters();
			for(const gc_param of a_params) {
				const k_list = k_query_table.parameterValuesList(gc_param.key);
				const a_values = [];
				for(const g_data of k_list) {
					a_values.push(g_data.label);
				}
				if(a_values.length) {
					if(1 === a_values.length) {
						a_where.push(`'${gc_param.label}' = "${a_values[0]}"`);
					}
					else {
						a_where.push(`'${gc_param.label}' is either ${a_values.slice(0, -1).map(s => `"${s}"`).join(', ')} or "${a_values[a_values.length-1]}"`);
					}
				}
			}

			const nl_rows = +(await k_connection.execute(k_query.count()))[0].count.value;

			s_commit_message = `Published query table with ${nl_rows} row${1 === nl_rows? '': 's'} using "${k_query_table.queryType.label}" ${a_where.length? `where\n(${a_where.join(') AND (')}`: ''})`
				+` from ${k_connection.label} on ${s_display_version}`;
		}

		// commit query table state
		const g_payload = await k_query_table.save(s_commit_message);

		// execute query and download all rows
		const a_rows = await k_connection.execute(k_query.all());

		// build XHTML table
		const yn_table = build_xhtml_table(k_query_table.queryType.fields, a_rows);

		// wrap in confluence macro
		const yn_macro = ConfluencePage.annotatedSpan({
			params: {
				id: k_query_table.path,
			},
			body: yn_table,
		}, k_contents);

		// use directive as anchor
		if(yn_directive) {
			// replace node
			let yn_replace: Node = yn_directive;

			// not structured macro
			if('structured-macro' !== yn_directive.localName) {
				// crawl out of p tags
				yn_replace = yn_directive.parentNode as Node;
				while('p' === yn_replace.parentNode?.nodeName) {
					yn_replace = yn_replace.parentNode;
				}
			}

			// replace node
			yn_replace.parentNode?.replaceChild(yn_macro, yn_replace);

			// auto cusor mutate
			autoCursorMutate(yn_macro, k_contents);
		}
		// no directive
		else {
			throw new Error(`No directive node was given`);
		}

		// upload contents
		const g_res = await k_page.postContent(k_contents, s_commit_message);

		if(g_res.error) {
			// TODO: show error in UI
			throw g_res.error;
		}
		else if(!g_res.response.ok) {
			// TODO show error in UI
			throw new Error(JSON.stringify(g_res.data));
		}
		else {
			location.reload();
		}
	}

	function build_xhtml_table(a_fields: QueryField[], a_rows: QueryRow[]): Node {
		const k_contents = k_query_table.getContext().source;

		const f_builder = k_contents.builder();

		return f_builder('table', {}, [
			f_builder('colgroup', {}, a_fields.map(() => f_builder('col'))),
			f_builder('tbody', {}, [
				f_builder('tr', {}, a_fields.map(g_field => f_builder('th', {}, [
					g_field.label,
				]))),
				...a_rows.map(F_RENDER_CELL).map(h_row => f_builder('tr', {}, [
					...Object.values(h_row).map((ksx_cell) => {
						const a_nodes: Array<Node | string> = [];
						let sx_cell = ksx_cell.toString().trim();

						// rich content type
						if('text/plain' !== ksx_cell.contentType) {
							// sanitize false directives
							const sx_sanitize = sanitize_false_directives(sx_cell);

							// sanitization changed string (making it HTML) or it already was HTML; wrap in HTML macro
							if(sx_sanitize !== sx_cell || 'text/html' === ksx_cell.contentType) {
								a_nodes.push(wrapCellInHtmlMacro(sx_sanitize, k_contents));
							}
							// update cell
							else {
								a_nodes.push(...XHTMLDocument.xhtmlToNodes(sx_sanitize));
							}
						}
						else {
							a_nodes.push(sx_cell);
						}

						// build cell using node or string
						return f_builder('td', {}, a_nodes);
					}),
				])),
			]),
		]);
	}

	function reset_table() {
		clear_preview();
	}

	function select_query_type(dv_select: CustomEvent<ValuedLabeledObject>) {
		// set query type on model
		k_query_table.setQueryType(dv_select.detail);

		// trigger svelte update for query type change
		k_query_table = k_query_table;

		// clear preview
		clear_preview();
	}
</script>

<style lang="less">
	@import '/src/common/ve.less';

	.controls {
		display: flex;
		margin-bottom: 0.5em;

		* {
			align-self: center;
		}

		.label {
			flex: 1 auto;

			:global(svg) {
				transform: scale(0.8);
				cursor: pointer;
			}
		}

		.buttons {
			flex: 1 auto;
			text-align: right;
		}

		.buttons button {
			cursor:pointer;
		}
	}

	.label {
		font-weight: 500;
	}

	.published-status {
		border-radius: 3px 3px 0 0;
		background-color: var(--ve-color-darker-background);
		color: var(--ve-color-light-text);
		border-color: var(--ve-color-accent-darker);
	}

	.ve-table {
		&.expanded {
			.config {
				.tabs {
					border-bottom: 1px solid var(--ve-color-light-text);
				}
			}
		}

		&.published:not(.expanded) {
			.table-wrap {
				border: 0;
			}

			.config {
				background-color: var(--ve-color-light-background);
				.tabs {
					.parameters {
						color: var(--ve-color-dark-text);
					}
					.version {
						color: var(--ve-color-medium-text);
					}
				}
				.info {
					background-color: var(--ve-color-light-background);
					color: var(--ve-color-dark-text);
				}
			}
		}

		.config {
			background-color: var(--ve-color-dark-background);
			padding: 5pt 10pt;
			border-radius: 3px 3px 0 0;
			display: flex;

			.tabs {
				align-self: center;
				border-bottom: 1px solid transparent;
				margin: 0;
				padding: 4px 0 4px 0;

				* {
					align-self: baseline;
					padding: 5px 10px;
				}

				.active {
					border-bottom: 3px solid var(--ve-color-light-text);
				}

				*:nth-child(n + 2) {
					margin-left: 0.25em;
				}

				:global(* svg) {
					margin-right: 3px;
					transform: scale(0.9);
				}

				.parameters {
					color: var(--ve-color-light-text);
					cursor: pointer;
				}

				.version {
					color: var(--ve-color-medium-light-text);
				}
			}

			.info {
				background-color: var(--ve-color-dark-text);
				color: var(--ve-color-light-text);
				border-radius: 2px;
				margin-left: auto;
				margin-top: 0;

				font-size: 12px;
				font-weight: 500;
				letter-spacing: 1px;
				align-self: center;
				padding: 2pt 4pt;
			}
		}

		.config-body {
			background-color: var(--ve-color-dark-background);
			color: var(--ve-color-medium-light-text);
			padding: 6pt 20pt 10pt 20pt;

			.query-type {
				color: var(--ve-color-light-text);

				*:nth-child(n + 2) {
					margin-left: 0.5em;
				}

				.label {
					vertical-align: middle;
				}

				.select {
					vertical-align: middle;
					color: var(--ve-color-dark-text);
					font-size: 13px;
					padding: 1px 2px 1px 2px;

					--height: 24px;
					--indicatorTop: 2px;
					--indicatorWidth: 7px;
					--indicatorHeight: 5px;
					--itemColor: var(--ve-color-dark-text);

					--itemPadding: 0 10px;
					--itemIsActiveBG: transparent;
					--itemIsActiveColor: var(--ve-color-dark-text);
					--itemHoverBG: var(--ve-color-light-background);

					:global(.selectContainer) {
						display: inline-flex;
						width: fit-content;
						min-width: 200px;
						vertical-align: middle;
					}

					:global(.indicator + div:nth-child(n + 3)) {
						margin-top: -5px;
					}

					:global(.multiSelectItem_clear > svg) {
						transform: scale(0.9);
					}

					:global(.multiSelectItem) {
						margin: 3px 0 3px 4px;
					}
				}
			}

			.form {
				margin-top: 1em;
				display: grid;
				grid-template-columns: auto 1fr;
				grid-template-rows: auto;

				.header {
					margin: 0;
					font-size: 12px;
				}
			}
		}

		.table-wrap {
			border: 2px solid var(--ve-color-dark-background);
			margin: 0;

			table {
				width: 100%;

				.ve-table-preview-cell-placeholder {
					// background-color: #e5e5e5;
					background-color: transparent;
					vertical-align: middle;
					height: 1em;
					display: inline-block;
					width: 100%;
					border-radius: 4px;
				}
			}
		}

		.tablesorter-header-inner {
			font-size: 14px;
		}
	}
</style>

{#await k_query_table.ready()}
	<!-- loading -->
{:then}
	<div class="ve-query-table">
		<div class="controls">
			<span class="label">
				Connected Data Table {g_source ? `with ${g_source.label}` : ''}
				<Fa icon={faQuestionCircle} />
			</span>
			<span class="buttons">
				{#if b_published}
					<span class="ve-pill">
						<Fa icon={faCheckCircle} size="sm" />
						Published
					</span>
				{/if}
				{#if !b_published || b_display_parameters}
					<button class="ve-button-primary" on:click={publish_table}>Publish</button>
					<button class="ve-button-secondary" on:click={reset_table}>Cancel</button>
				{/if}
			</span>
		</div>

		<div class="ve-table" class:published={b_published} class:expanded={b_display_parameters}>
			<div class="config">
				<span class="tabs">
					<span class="parameters" on:click={toggle_parameters} class:active={b_display_parameters}>
						<Fa icon={faFilter} size="xs" />
						Parameters
					</span>
					<span class="version">
						<Fa icon={faHistory} size="xs" />
						Version: {s_display_version}
					</span>
				</span>
				<span class="info">
					{#if b_display_preview || !b_published}
						{#if G_INFO_MODES.PREVIEW === xc_info_mode}
							{s_status_info}
						{:else if G_INFO_MODES.LOADING === xc_info_mode}
							<Fa icon={faCircleNotch} class="fa-spin" /> LOADING PREVIEW
						{/if}
					{/if}
				</span>
			</div>

			<div class="config-body" bind:this={dm_parameters} style="display:{b_display_parameters ? 'block' : 'none'};">
				<div class="query-type">
					<span class="label">Query Type</span>
					<span class="select">
						<Select
							value={k_query_table.queryType.toItem()}
							items={Object.values(k_query_table.queryTypeOptions).map(k => k.toItem())}
							showIndicator={true}
							indicatorSvg={/* syntax: html */ `
								<svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M3.5 4.5L0.468911 0.75L6.53109 0.75L3.5 4.5Z" fill="#333333"/>
								</svg>
							`}
							Item={SelectItem}
							containerStyles={'padding: 0px 40px 0px 6px;'}
							listOffset={0}
							on:select={select_query_type}
						/>
					</span>
				</div>
				<div class="form">
					<span class="header">Parameter</span>
					<span class="header">Value</span>
					{#await k_query_table.queryType.fetchParameters() then a_params}
						{#each a_params as k_param}
							<QueryTableParam {k_query_table} {k_param} k_values={k_query_table.parameterValuesList(k_param.key)} on:change={render} />
						{/each}
					{/await}
				</div>
			</div>
			{#if b_display_preview}
				<div class="table-wrap">
					<!-- svelte-ignore a11y-resolved -->
					<table class="wrapped confluenceTable tablesorter tablesorter-default stickyTableHeaders" role="grid" style="padding: 0px;" resolved="">
						<colgroup>
							{#each k_query_table.queryType.fields as k_field}
								<col />
							{/each}
						</colgroup>
						<thead class="tableFloatingHeaderOriginal">
							<tr role="row" class="tablesorter-headerRow">
								{#each k_query_table.queryType.fields as k_field, i_field}
									<th class="confluenceTh tablesorter-header sortableHeader tablesorter-headerUnSorted" data-column={i_field} tabindex="0" scope="col" role="columnheader" aria-disabled="false" unselectable={true} aria-sort="none" aria-label="{k_field.label}: No sort applied, activate to apply an ascending sort" style="user-select: none;">
										<div class="tablesorter-header-inner">
											{k_field.label}
										</div>
									</th>
								{/each}
							</tr>
						</thead>
						<thead class="tableFloatingHeader" style="display: none;">
							<tr role="row" class="tablesorter-headerRow">
								{#each k_query_table.queryType.fields as k_field, i_header}
									<th class="confluenceTh tablesorter-header sortableHeader tablesorter-headerUnSorted" data-column={i_header} tabindex="0" scope="col" role="columnheader" aria-disabled="false" unselectable={true} aria-sort="none" aria-label="{k_field.label}: No sort applied, activate to apply an ascending sort" style="user-select: none;">
										<div class="tablesorter-header-inner">
											{k_field.label}
										</div>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody aria-live="polite" aria-relevant="all">
							{#if b_busy_loading || !g_preview.rows.length}
								{#each A_DUMMY_TABLE_ROWS as g_row}
									<tr role="row">
										{#each k_query_table.queryType.fields as k_field}
											<td class="confluenceTd">
												<span class="ve-table-preview-cell-placeholder">&nbsp;</span>
											</td>
										{/each}
									</tr>
								{/each}
							{:else}
								{#each g_preview.rows as h_row}
									<tr role="row">
										{#each Object.values(h_row) as ksx_cell}
											<td class="confluenceTd">{@html ksx_cell.toString()}</td>
										{/each}
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
{/await}
