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
		faHistory,
		faPencilAlt,
		faAngleLeft,
		faAngleRight,
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


	/**
	 * The QueryTable model
	 */
	export let k_model: QueryTable;

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

	//
	// $: b_changed = '' !== si_query_hash_previous && (!b_published || b_changed_published_parameters);
	$: b_changed = b_published? si_query_hash_previous !== si_query_hash_published: '' !== si_query_hash_previous;
	// let b_not_changed = '' === si_query_hash_previous || (b_published && !b_changed_published_parameters)

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

		// redo query hash
		si_query_hash_previous = k_model.hash();

		s_status_info = 'PREVIEW (0 results)';
		xc_info_mode = G_INFO_MODES.PREVIEW;
		g_preview.rows = [];
	}

	async function render() {
		xc_info_mode = G_INFO_MODES.LOADING;

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

		// changed from published
		let si_query_hash_current = k_model.hash();
		b_changed_published_parameters = si_query_hash_current !== si_query_hash_published;

		// no filters, clear preview
		if(!b_filtered) {
			return clear_preview();
		}

		// concat hash differs, submit query and rebuild preview
		if(si_query_hash_current !== si_query_hash_previous) {
			// update hash
			si_query_hash_previous = si_query_hash_current;

			// set busy loading state
			b_busy_loading = true;

			const k_query = await k_model.fetchQueryBuilder();
			const a_rows = await k_connection.execute(k_query.paginate(N_PREVIEW_ROWS+1));

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

			// no longer busy loading
			b_busy_loading = false;

			s_status_info = `PREVIEW (${N_PREVIEW_ROWS < a_rows.length ? '>'+N_PREVIEW_ROWS : a_rows.length} result${1 === a_rows.length ? '' : 's'})`;
		}

		xc_info_mode = G_INFO_MODES.PREVIEW;
	}

	function toggle_parameters() {
		// do not allow closing while pending edits
		if(b_published && b_changed) return;

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
		xc_info_mode = G_INFO_MODES.LOADING;

		// get page content as xhtml document
		const {
			page: k_page,
		} = k_model.getContext();

		// commit query table state
		const g_payload = await k_model.save(`Auto-saved from user table publish`);

		const {
			rows: a_rows,
			contents: k_contents,
		} = await k_model.exportResultsToCxhtml(k_connection, yn_directive);

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
		// hide parameters
		b_display_parameters = false;

		// published; hide preview
		if(b_published) {
			b_display_preview = false;
		}

		// clear preview
		clear_preview();

		// restore from serialized
		k_model = await k_model.restore();

		// preload query results for next time preview is shown
		await render();
	}

	async function select_query_type(dv_select: CustomEvent<ValuedLabeledObject>) {
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
	}

	.label {
		font-weight: 500;
	}

	.ve-table {
		&.expanded {
			.config {
				.tabs {
					border-bottom: 1px solid var(--ve-color-light-text);
				}
			}
		}

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
			}

			.config-body {
				background-color: var(--ve-color-light-background);
				color: var(--ve-color-medium-text);

				.query-type {
					color: var(--ve-color-dark-text);
				}
			}
		}

		.config {
			.transition(background-color 0.5s ease-out;);

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
			.transition(background-color 0.5s ease-out;);

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

		.table-browse {
			background-color: #F4F5F7;
			border-right: 2px solid var(--ve-color-dark-background);
			border-left:  2px solid var(--ve-color-dark-background);
			border-top: 2px solid var(--ve-color-dark-background);
			border-bottom: 1px solid #C1C7D0;

			position: sticky;
			top: 40px;
			z-index: 1;

			.control {
				height: 30px;

				.info {
					color: var(--ve-color-dark-text);
					margin-left: auto;
					margin-top: 0;
					font-size: 12px;
					font-weight: 500;
					letter-spacing: 0.5px;
					align-self: center;
					padding: 2pt 8pt;
					line-height: 30px
				}

				.page-controls {
					padding-left: 7px;
					padding-right: 7px;
				}
			}
		}

		.table-wrap {
			border-right:  2px solid var(--ve-color-dark-background);
			border-left:  2px solid var(--ve-color-dark-background);
			border-bottom: 2px solid var(--ve-color-dark-background);
			margin: 0;

			font-size: 14px;
			line-height: 20px;
			overflow-x: unset !important;

			table {
				width: 100%;

				.ve-table-preview-cell-placeholder {
					background-color: transparent;
					vertical-align: middle;
					height: 1em;
					display: inline-block;
					width: 100%;
					border-radius: 4px;
				}

				thead tr th {
					position: sticky;
					top: 72px;
					z-index: 1;
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

	.confluenceTable {
		overflow-x: unset !important;
	}

</style>

{#await k_model.ready()}
	<!-- loading -->
{:then}
	<div class="ve-query-table">
		<div class="controls">
			<span class="label">
				Connected Data Table {g_source ? `with ${g_source.label}` : ''}
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
			<span class="buttons">
				{#if b_published}
					<span class="ve-pill">
						<Fa icon={faCheckCircle} size="sm" />
						Published
					</span>
				{/if}
				{#if b_display_parameters}
					<button class="ve-button-primary" on:click={publish_table} disabled={!b_changed || !b_filtered}>{b_published? 'Update': 'Publish'}</button>
					<button class="ve-button-secondary" on:click={reset_table}>Cancel Changes</button>
				{/if}
			</span>
		</div>

		<div class="ve-table" class:published={b_published} class:changed={b_changed} class:expanded={b_display_parameters}>
			<div class="config">
				<span class="tabs">
					<span class="parameters" on:click={toggle_parameters} class:active={b_display_parameters}>
						<Fa icon={faPencilAlt} size="sm" />
						Edit Query
					</span>
					<span class="version">
						<Fa icon={faHistory} size="xs" />
						Version: {s_display_version}
					</span>
				</span>
			</div>

			<div class="config-body" bind:this={dm_parameters} style="display:{b_display_parameters ? 'block' : 'none'};">
				<div class="query-type">
					<span class="label">Query Type</span>
					<span class="select">
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
							containerStyles={'padding: 0px 40px 0px 6px;'}
							listOffset={0}
							on:select={select_query_type}
						/>
					</span>
				</div>
				<div class="form">
					<span class="header">Parameter</span>
					<span class="header">Value</span>
					{#await k_model.queryType.fetchParameters() then a_params}
						{#each a_params as k_param}
							<QueryTableParam k_query_table={k_model} {k_param} on:change={render} />
						{/each}
					{/await}
				</div>
			</div>
			<div class="table-browse">
				<div class="control">
					<span class="info">1-{N_PREVIEW_ROWS} of 325</span>
					<span class="page-controls">
						<Fa icon={faAngleLeft} size="xs" />
					</span>
					<span>
						<Fa icon={faAngleRight} size="xs" />
					</span>
				</div>
			</div>
			{#if b_display_preview}
				<div class="table-wrap" class:busy={b_busy_loading}>
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
							{#if !g_preview.rows.length}
								{#each A_DUMMY_TABLE_ROWS as g_row}
									<tr role="row">
										{#each k_model.queryType.fields as k_field}
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
