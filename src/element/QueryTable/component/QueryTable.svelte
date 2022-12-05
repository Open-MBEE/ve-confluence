<script lang="ts">
	import {onMount} from 'svelte';

	import {quadOut} from 'svelte/easing';

	import {slide} from 'svelte/transition';

	import {create_in_transition} from 'svelte/internal';

	import Select from 'svelte-select';

	// import Fa from 'svelte-fa';
	import Fa from 'svelte-fa/src/fa';

	import {
		faCircleNotch,
		faHistory,
		faInfoCircle
	} from '@fortawesome/free-solid-svg-icons';

	import SelectItem from '#/ui/component/SelectItem.svelte';

	import QueryTableParam from './QueryTableParam.svelte';

	import {
		QueryTable,
	} from '../model/QueryTable';

	import type {
		ValuedLabeledObject,
	} from '#/common/types';

	import {
		Connection,
		connectionHasVersioning,
	} from '#/model/Connection';

	import type {
		ModelVersionDescriptor,
	} from '#/model/Connection';

	import type {TypedString} from '#/util/strings';

	// number of preview rows
	const N_PREVIEW_ROWS = 40;

	// max number of published rows
	const N_MAX_PUBLISHED_ROWS = 300;

	/**
	 * The QueryTable model
	 */
	export let k_model: QueryTable;

	/**
	 * The HTML element to which this view element is anchored
	 */
	export let dm_anchor: Element; //this is the published table div or the confluence init link

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


	let dm_display: HTMLElement;

	let dm_preview: HTMLElement;

	let dm_anchor_parent: HTMLElement;

	// shows/hides the table results
	let b_display_preview = !b_published;

	// shows/hides the parameter controls
	let b_display_parameters = false;

	// whether or not the published parameters have been changed in edit mode
	let b_changed_published_parameters = false;

	// the connection model
	let k_connection: Connection;

	// the model version descriptor
	let g_version: ModelVersionDescriptor;

	// prep a simple concat hash for query parameters to prevent redundant queries
	let si_query_hash_previous = '';

	// published query hash
	let si_query_hash_published = b_published? k_model.hash(): '';

	// whether or not there are any filters applied
	let b_filtered = false;

	// whether or not parameter values in QueryTableParam have been loaded
	let b_param_values_loading: boolean;

	// table edited
	$: b_changed = b_published? si_query_hash_previous !== si_query_hash_published : '' !== si_query_hash_previous;

	// once the component mounts
	onMount(async() => {
		// get query table's connection
		const k_connection_new = await k_model.fetchConnection();

		// new connection; refresh version
		if(k_connection !== k_connection_new) {
			// cache new connection
			k_connection = k_connection_new;

			// pending version information
			s_display_version = '...';

			// ensure versioned connection
			if(!connectionHasVersioning(k_connection)) {
				throw new Error(`Connection does not have versioning: ${k_connection.hash()}`);
			}

			// get model version descriptor from connection
			g_version = await k_connection.fetchCurrentVersion();

			// parse datetime string
			let dt_version = new Date(g_version.dateTime);

			// invalid date; replace with now
			if('Invalid Date' === dt_version.toString()) {
				dt_version = new Date();
			}

			// update display version
			s_display_version = dt_version.toLocaleDateString('en-us', { year:"numeric", month:"long", day:"numeric"});
		}
		// keep track of the number of rows in the published table
		n_published_rows = get_published_table_rows().length;
	});

	const A_DUMMY_TABLE_ROWS = [{}, {}, {}];

	let s_display_version = '...';
	let dm_parameters: HTMLDivElement;

	interface Preview {
		rows: Array<Record<string, TypedString>>;
	}

	let b_busy_loading = false;

	// whether or not the table is in the process of being published
	let b_publishing = false;

	let g_source: {label: string, source: string} | null = null;

	// number of rows in the published table
	let n_published_rows: Number = 0;

	g_source = {label:'DNG Requirements', source: "Doors NG"};

	$: {
		dm_anchor.style.display = (dm_anchor.localName === 'a' || (b_published && b_display_preview)) ? 'none' :'block';
	}

	// anchor provided
	if (dm_anchor) {
		// remove any top margin from table
		dm_anchor.style.marginTop = '0px';
	}

	let g_preview: Preview = {rows:[]};

	enum G_INFO_MODES {
		PREVIEW = 1,
		LOADING = 2,
		PUBLISHING = 3,
	}

	let xc_info_mode = G_INFO_MODES.PREVIEW;
	const SX_STATUS_INFO_INIT = 'PREVIEW (0 results)';
	let s_status_info = SX_STATUS_INFO_INIT;

	function clear_preview(): void {
		b_busy_loading = false;

		// redo query hash
		si_query_hash_previous = '';

		s_status_info = 'PREVIEW (0 results)';
		xc_info_mode = G_INFO_MODES.PREVIEW;
		g_preview.rows = [];
	}

	async function check_filters() {
		// reset filter status
		b_filtered = false;

		// each parameter
		for(const g_param of await k_model.queryType.fetchParameters()) {
			// collect all values from list
			const a_values = [...k_model.parameterValuesList(g_param.key)];

			// some values are present
			if(a_values.length) {
				// results are now filtered
				b_filtered = true;

				break;
			}
		}
	}

	async function render() {
		await check_filters();

		// changed from published
		let si_query_hash_current = k_model.hash();
		b_changed_published_parameters = si_query_hash_current !== si_query_hash_published;

		// no filters, clear preview
		if(!b_filtered) {
			return clear_preview();
		}

		// concat hash differs, submit query and rebuild preview
		if(si_query_hash_current !== si_query_hash_previous) {
			xc_info_mode = G_INFO_MODES.LOADING;
			// update hash
			si_query_hash_previous = si_query_hash_current;

			// set busy loading state
			b_busy_loading = true;

			const k_query = await k_model.fetchQueryBuilder();
			const a_rows = await k_connection.execute(k_query.paginate(N_PREVIEW_ROWS+1));

			// only display results for the most recent execution
			if(si_query_hash_previous === si_query_hash_current) {
				if(N_PREVIEW_ROWS < a_rows.length) {
					// start counting all rows
					k_connection.execute(k_query.count())
						.then((a_counts) => {
							const nl_rows_total = +a_counts[0].count.value;
							s_status_info = `PREVIEW (${N_PREVIEW_ROWS < nl_rows_total? N_PREVIEW_ROWS: nl_rows_total} / ${nl_rows_total} result${1 === nl_rows_total ? '' : 's'})`;
						})
						.catch(() => {
							console.error('Failed to count rows for query');
						});
				}
				g_preview.rows = a_rows.map(QueryTable.cellRenderer(k_model));

				s_status_info = `PREVIEW (${N_PREVIEW_ROWS < a_rows.length ? '>'+N_PREVIEW_ROWS : a_rows.length} result${1 === a_rows.length ? '' : 's'})`;
				b_busy_loading = false;
				// no longer busy loading
				xc_info_mode = G_INFO_MODES.PREVIEW;
			}
		}
	}

	function toggle_pagination_controls() {
		// show/hide pagination controls for preview/edit mode table
		if(dm_preview) {
			// get pagination controls div (appears immediately after the preview table div)
			let preview_sibling = dm_preview.nextElementSibling;
			if(preview_sibling) {
				let display_attribute = b_display_parameters ? "display: block;" : "display: none;";
				preview_sibling.setAttribute("style", display_attribute);
			}
		}

		// show/hide pagination controls for view mode table
		// keep track of table div parent element
		let dm_parent = dm_anchor.parentElement;
		if(dm_parent) {
			dm_anchor_parent = dm_parent
		}

		if(dm_anchor_parent) {
			// remove the table div from DOM whenever in preview mode
			// add table div back to DOM when out of preview
			b_display_parameters ? dm_anchor.remove() : dm_anchor_parent.appendChild(dm_anchor);
		}
	}

	function toggle_parameters() {
		// do not allow closing while pending edits
		if(b_published && b_changed && b_display_parameters) return;

		// toggle parameters display
		b_display_parameters = !b_display_parameters;

		// show/hide table pagination controls
		toggle_pagination_controls();

		// parameters should not be showing
		if(!b_display_parameters) {
			// table is published; hide the preview
			if(b_published) b_display_preview = false;
			// done
			return;
		}

		// table is published; show the preview
		if(b_published) b_display_preview = true;

		render();

		// allow toggle to trigger svelte change to dom
		queueMicrotask(() => {
			// // table is published
			// if(b_published) {
			// 	// force css-transition by setting background-color
			// 	dm_parameters.style.backgroundColor = 'var(--ve-color-light-background)';

			// 	// after starting the slide transition
			// 	queueMicrotask(() => {
			// 		dm_parameters.style.backgroundColor = 'var(--ve-color-dark-background)';
			// 	});
			// }

			// start slide transition
			create_in_transition(dm_parameters, slide, {
				duration: 400,
				easing: quadOut,
			}).start();
		});
	}

	async function publish_table() {
		b_publishing = true;
		xc_info_mode = G_INFO_MODES.PUBLISHING;
		// get page content as xhtml document
		const {
			page: k_page,
		} = k_model.getContext();

		const {
			rows: a_rows,
			contents: k_contents,
		} = await k_model.exportResultsToCxhtml(k_connection, yn_directive, b_published);

		// prepare commit message
		let s_commit_message = '';
		{
			const a_where = [];
			const a_params = await k_model.queryType.fetchParameters();
			for(const gc_param of a_params) {
				const k_list = k_model.parameterValuesList(gc_param.key);
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
			const nl_rows = a_rows.length;

			s_commit_message = `Published query table with ${nl_rows} row${1 === nl_rows? '': 's'} using "${k_model.queryType.label}" ${a_where.length? `where\n(${a_where.join(') AND (')}`: ''})`
				+` from ${k_connection.label} on ${s_display_version}`;
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


	async function reset_table() {
		// change publishing state
		b_publishing = false;
		// hide parameters
		b_display_parameters = false;

		// published; hide preview
		if(b_published) {
			b_display_preview = false;
		}

		// show/hide table pagination controls
		toggle_pagination_controls();

		// clear preview
		clear_preview();

		// restore from serialized
		k_model = await k_model.restore();

		// preload query results for next time preview is shown
		await render();
	}

	function select_query_type(dv_select: CustomEvent<ValuedLabeledObject>) {
		// set query type on model
		k_model.setQueryType(dv_select.detail);

		// clear parameters
		for(const si_param in k_model.parameterValues) {
			k_model.parameterValuesList(si_param).clear();
		}

		// clear preview
		clear_preview();

		// not filtered
		b_filtered = false;

		// trigger svelte update for query type change
		k_model = k_model;
	}

	function get_published_table_rows() {
		if(dm_anchor && dm_anchor.firstElementChild) {
			const table_children: NodeListOf<ChildNode> = dm_anchor.firstElementChild.childNodes;
			for(let i = 0; i < table_children.length; i++) {
				let child = table_children[i];
				if(child.nodeName == "TBODY") {
					return (child as HTMLTableSectionElement).rows;
				}
			}
		}
		return [];
	}

</script>

<style lang="less">
	@import '/src/common/ve.less';

	:global(.ve-query-table + .table-wrap > table) {
		width: 100%;
	}

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

			.active {
				display: None;
			}
		}
	}

	.label {
		font-weight: 500;
	}

	.ve-table {
/*
		&.published:not(.changed) {
			&.expanded {
				.config {
					.tabs {
						border-bottom: 1px solid var(--ve-color-medium-light-text);
					}
				}
			}

			.table-wrap {
				border: 0;
			}

			.config {
				background-color: var(--ve-color-light-background);
				// .transition(background-color 0.2s ease-out;);

				.tabs {
					.active {
						border-bottom: 3px solid var(--ve-color-dark-text);
					}

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

			.config-body {
				background-color: var(--ve-color-light-background);
				color: var(--ve-color-medium-text);

				.query-type {
					color: var(--ve-color-dark-text);
				}
			}
		}*/

		.config {
			.transition(background-color 0.5s ease-out;);

			background-color: var(--ve-color-dark-background);
			padding: 5pt 10pt;
			border-radius: 3px 3px 0 0;
			display: flex;

			.tabs {
				align-self: center;
				margin: 0;
				padding: 4px 0 4px 0;

				* {
					align-self: baseline;
					padding: 5px 5px;
				}


				*:nth-child(n + 2) {
					margin-left: 0.25em;
				}

				:global(* svg) {
					margin-right: 3px;
					transform: scale(0.9);
				}

				.version {
					color: var(--ve-color-medium-light-text);
					font-size: 14px;
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

		.max-rows-info {
			padding: 8px;
			font-style: italic;
			color: #172B4D;
			border: 1px solid #C1C7D0;

			.tooltip {
				position: relative;
				display: inline-block;
			}

			.tooltip .tooltip-text {
				position: absolute;
				z-index: 1;
				background-color: #444C50;
				visibility: hidden;
				width: 400px;
				height: 40px;
				border-radius: 4px;
				padding: 8px 24px;
				font-size: 12px;
				font-weight: 400;
				line-height: 16px;
				color: #F8F8F8;
				text-align: center;
				display: flex;
				align-items:center;
				justify-content:center;
				top: 15px;
				left: 11px;
			}

			.tooltip:hover .tooltip-text {
				visibility: visible;
			}
		}

		.config-body {
			.transition(background-color 0.5s ease-out;);

			background-color: var(--ve-color-dark-background);
			color: var(--ve-color-medium-light-text);
			padding: 5pt 12pt 5pt 12pt;

			.form {
				display: grid;
				grid-template-columns: auto 1fr;
				grid-template-rows: auto;

				.label {
					color: var(--ve-color-light-text);
					vertical-align: middle;
					font-size: 14px;
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
						min-width: 285px;
						vertical-align: middle;
						padding: 0px 40px 0px 6px;
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

				.active {
					:global(.selectContainer) {
						background: var(--ve-color-medium-light-text) !important;
						border-color: var(--ve-color-medium-light-text) !important;
						color: var(--ve-color-medium-text) !important;
						border: 0.5px solid;
						padding-left: 6px;
					}
					:global(.selectContainer > .multiSelectItem) {
						background: var(--ve-color-medium-text) !important;
						color: var(--ve-color-button-light) !important;			
					}
				}

				hr {
					border: 1px solid var(--ve-color-medium-text);
					width: 100%;
					margin-top: 12px;
					margin-bottom: 0px;
				}
			}

			.preview-button {
				display: flex;

				button {
					margin-left: auto;
					margin-right: 0px;
					display: flex;
					align-items: center;
					text-align: center;
					margin-top: 8px;
				}
			}
		}

		.table-wrap {
			border: 2px solid var(--ve-color-dark-background);
			margin: 0;

			font-size: 14px;
			line-height: 20px;

			table {
				width: 100%;

				.ve-table-preview-cell-placeholder {
					vertical-align: middle;
					border: none;
					font-style: italic;
				}
			}
		}

		.tablesorter-header-inner {
			font-size: 14px;
		}
	}

	.busy {
		opacity: 0.5;
	}
</style>

{#await k_model.ready()}
	<!-- loading -->
{:then}
	<div class="ve-query-table" bind:this={dm_display}>
		<div class="controls">
			<span class="label">
				Connected Data Table {g_source ? `with ${g_source.label}` : ''}
			</span>
			<span class="buttons">
				<button class="ve-button-primary" on:click={toggle_parameters} class:active={b_display_parameters}>Edit Table</button>
				{#if b_display_parameters}
					<button class="ve-button-primary" on:click={publish_table} disabled={!b_filtered || b_publishing || b_busy_loading || b_param_values_loading}>Publish Table</button>
					<button class="ve-button-secondary" on:click={reset_table}>Cancel</button>
				{/if}
			</span>
		</div>

		<div class="ve-table" class:published={b_published} class:changed={b_changed} class:expanded={b_display_parameters}>
			<div class="config">
				<span class="tabs">
					<span class="version">
						<Fa icon={faHistory} />
						Version: {s_display_version}
					</span>
				</span>
				<span class="info">
					{#if b_display_preview || !b_published}
						{#if G_INFO_MODES.PREVIEW === xc_info_mode}
							{s_status_info}
						{:else if G_INFO_MODES.LOADING === xc_info_mode}
							<Fa icon={faCircleNotch} class="fa-spin" /> LOADING PREVIEW
						{:else if G_INFO_MODES.PUBLISHING === xc_info_mode}
							<Fa icon={faCircleNotch} class="fa-spin" /> PUBLISHING
						{/if}
					{/if}
				</span>
			</div>
			{#if b_published && !b_display_parameters}
				{#if n_published_rows >= N_MAX_PUBLISHED_ROWS}
					<div class="max-rows-info">
						<span>
							Table may exceed {N_MAX_PUBLISHED_ROWS} record wiki limit. Showing {N_MAX_PUBLISHED_ROWS} of total query results.
						</span>
						<span>	
							<div class="tooltip">
								<Fa icon={faInfoCircle} />
								<span class="tooltip-text">The {N_MAX_PUBLISHED_ROWS} record wiki limit minimizes Confluence performance impacts. Create a smaller table, or access the complete list in {g_source ? `${g_source.source}` : ''}.</span>
							</div>							  
						</span>
					</div>
				{/if}
			{/if}
			{#if b_display_parameters}
			<div class="config-body" bind:this={dm_parameters} style="display:{b_display_parameters ? 'block' : 'none'};">
				<div class="form">
					<span class="label">Query Type:</span>
					<span class="select" class:active={!b_param_values_loading && b_publishing}>
						<Select
							value={k_model.queryType.toItem()}
							items={Object.values(k_model.queryTypeOptions).map(k => k.toItem())}
							showIndicator={true}
							indicatorSvg={/* syntax: html */ `
								<svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M3.5 4.5L0.468911 0.75L6.53109 0.75L3.5 4.5Z" fill="#333333"/>
								</svg>
							`}
							Item={SelectItem}
							listOffset={0}
							isDisabled={!b_param_values_loading && b_publishing}
							on:select={select_query_type}
						/>
					</span>
					<hr>
					<hr>
					{#await k_model.queryType.fetchParameters() then a_params}
						{#each a_params as k_param}
							<QueryTableParam on:change={check_filters} bind:b_param_values_loading={b_param_values_loading} k_query_table={k_model} {k_param} {b_publishing} />
						{/each}
					{/await}
				</div>
				<div class="preview-button">
					<button class="ve-button-primary" on:click={render} disabled={!b_filtered || b_publishing || b_param_values_loading}>Preview Results</button>
				</div>
			</div>
			{/if}
			{#if b_display_preview}
				<div class="table-wrap" class:busy={b_busy_loading || b_publishing} bind:this={dm_preview}>
					<!-- svelte-ignore a11y-resolved -->
					<table class="wrapped confluenceTable tablesorter tablesorter-default stickyTableHeaders" role="grid" style="padding: 0px;" resolved="">
						<colgroup>
							{#each k_model.queryType.fields as k_field}
								<col />
							{/each}
						</colgroup>
						<thead class="tableFloatingHeaderOriginal">
							<tr role="row" class="tablesorter-headerRow">
								{#each k_model.queryType.fields as k_field, i_field}
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
								{#each k_model.queryType.fields as k_field, i_header}
									<th class="confluenceTh tablesorter-header sortableHeader tablesorter-headerUnSorted" data-column={i_header} tabindex="0" scope="col" role="columnheader" aria-disabled="false" unselectable={true} aria-sort="none" aria-label="{k_field.label}: No sort applied, activate to apply an ascending sort" style="user-select: none;">
										<div class="tablesorter-header-inner">
											{k_field.label}
										</div>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody aria-live="polite" aria-relevant="all">
							<!-- show initial preview of published table for those that have content -->
							{#if n_published_rows > 0 && !g_preview.rows.length && !b_changed}
								{#each get_published_table_rows() as row}
									{@html row.innerHTML}
								{/each}
							<!-- for new tables/those with no content, display a placeholder -->
							{:else if !g_preview.rows.length}
								<tr role="row">
									<td class="confluenceTd ve-table-preview-cell-placeholder">No results. Edit the query to add data to the table.</td>
								</tr>
							<!-- render preview cells -->
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
