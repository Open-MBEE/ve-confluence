<script lang="ts">
	import {onMount} from 'svelte';

	import {quadOut} from 'svelte/easing';

	import {slide} from 'svelte/transition';

	import {create_in_transition} from 'svelte/internal';

	import Select from 'svelte-select';

	import Fa from 'svelte-fa';

	import {
		faCircleNotch,
		faFilter,
		faHistory,
		faQuestionCircle,
	} from '@fortawesome/free-solid-svg-icons';

	import SelectItem from '#/ui/component/SelectItem.svelte';

	import QueryTableParam from './QueryTableParam.svelte';

	import type {QueryTable} from '../model/QueryTable';

	import type {
		Connection,
		ModelVersionDescriptor,
	} from '#/model/Connection';
	
	import type {ValuedLabeledObject} from '#/common/types';

	export let k_query_table: QueryTable;
	(async() => {
		const k_connection = await k_query_table.getConnection();
		const g_version = await k_connection.getVersion();
		new Date(g_version.dateTime);
	})();

	let k_connection: Connection;
	let g_version: ModelVersionDescriptor;

	onMount(async() => {
		// get query table's connection
		const k_connection_new = await k_query_table.getConnection();

		// new connection; refresh version
		if(k_connection !== k_connection_new) {
			// cache new connection
			k_connection = k_connection_new;

			// pending version information
			s_display_version = '...';

			// get model version descriptor from connection
			g_version = await k_connection.getVersion();

			// parse datetime string
			const dt_version = new Date(g_version.dateTime);

			// update display version
			s_display_version = `${dt_version.toDateString()} @${dt_version.toLocaleTimeString()}`;
		}
	});

	const A_DUMMY_TABLE_ROWS = [{}, {}, {}];

	export let dm_anchor = document.createElement('div');
	let s_display_version = '...';
	let dm_parameters: HTMLDivElement;

	type Hash = Record<string, string>;
	type Row = Record<string, {value: string}>;

	interface Preview {
		rows: Array<Hash>;
	}

	let b_expand = false;

	let b_loading = false;
	let b_showing = false;
	let g_source: {label: string} | null = null;

	g_source = {label:'DNG Requirements'};

	let b_display_params = false;

	$: dm_anchor.style.display = b_showing && b_display_params? 'none' :'block';
	$: dm_anchor.style.opacity = b_loading? '0.5': '1.0';

	let g_preview: Preview = {rows:[]};

	enum G_INFO_MODES {
		PREVIEW = 1,
		LOADING = 2,
	}

	let xc_info_mode = G_INFO_MODES.PREVIEW;
	const SX_STATUS_INFO_INIT = 'PREVIEW (0 results)';
	let s_status_info = SX_STATUS_INFO_INIT;

	async function render() {
		xc_info_mode = G_INFO_MODES.LOADING;

		let b_filtered = false;
		const a_params = await k_query_table.getParameters();
		for(const g_param of a_params) {
			if(k_query_table.parameterValuesList(g_param.key).size) {
				b_filtered = true;
				break;
			}
		}

		if(!b_filtered) {
			b_loading = false;
			b_showing = false;
			return;
		}

		b_loading = true;

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

		g_preview.rows = a_rows.map((g_row) => {
			const h_out: Record<string, string> = {};

			for(const k_field of k_query_table.fields) {
				h_out[k_field.key] = k_field.cell(g_row);
			}

			return h_out;
		});

		b_loading = false;
		b_showing = true;

		s_status_info = `PREVIEW (${20 < a_rows.length ? '>20' : a_rows.length} result${1 === a_rows.length ? '' : 's'})`;
		xc_info_mode = G_INFO_MODES.PREVIEW;
	}

	function toggle_parameters() {
		b_expand = !b_expand;
		if(!b_expand) return;

		queueMicrotask(() => {
			create_in_transition(dm_parameters, slide, {
				duration: 400,
				easing: quadOut,
			}).start();
		});
	}

	function publish_table() {}

	function reset_table() {}

	function select_query_type(dv_select: CustomEvent<ValuedLabeledObject>) {
		k_query_table.setQueryType(dv_select.detail);
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

	.loading {
		opacity: 0.5;
	}

	.hidden {
		display: none;
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

		.config {
			background-color: var(--ve-color-dark-background);
			padding: 7pt 14pt;
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

				// select {
				// 	padding: 3px 6px;
				// 	color: var(--ve-color-dark-text);
				// }

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
	}
</style>

<div class="ve-query-table">
	<div class="controls">
		<span class="label">
			Connected Data Table {g_source ? `with ${g_source.label}` : ''}
			<Fa icon={faQuestionCircle} />
		</span>
		<span class="buttons">
			<button class="ve-button-primary" on:click={publish_table}
				>Publish</button
			>
			<button class="ve-button-secondary" on:click={reset_table}
				>Cancel</button
			>
		</span>
	</div>

	<div class="ve-table" class:expanded={b_expand}>
		<div class="config">
			<span class="tabs">
				<span class="parameters" on:click={toggle_parameters} class:active={b_expand}>
					<Fa icon={faFilter} size="xs" />
					Parameters
				</span>
				<span class="version">
					<Fa icon={faHistory} size="xs" />
					Version: {s_display_version}
				</span>
			</span>
			<span class="info">
				{#if G_INFO_MODES.PREVIEW === xc_info_mode}
					{s_status_info}
				{:else if G_INFO_MODES.LOADING === xc_info_mode}
					<Fa icon={faCircleNotch} class="fa-spin" /> LOADING PREVIEW
				{/if}
			</span>
		</div>

		<div class="config-body" bind:this={dm_parameters} style="display:{b_expand ? 'block' : 'none'};">
			<div class="query-type">
				<span class="label">Query Type</span>
				<span class="select">
					<Select
						showIndicator={true}
						selectedValue={k_query_table.queryType.toItem()}
						items={Object.values(
							k_query_table.queryTypeOptions
						).map(k => k.toItem())}
						indicatorSvg={/* syntax: html */ `
							<svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M3.5 4.5L0.468911 0.75L6.53109 0.75L3.5 4.5Z" fill="#333333"/>
							</svg>
						`}
						Item={SelectItem}
						on:select={select_query_type}
					/>
				</span>
			</div>
			<div class="form">
				<span class="header">Parameter</span>
				<span class="header">Value</span>
				{#await k_query_table.getParameters() then a_params}
					{#each a_params as k_param}
						<QueryTableParam {k_query_table} {k_param} k_values={k_query_table.parameterValuesList(k_param.key)} on:change={render} />
					{/each}
				{/await}
			</div>
		</div>
		<div class="table-wrap">
			<table class="wrapped confluenceTable tablesorter tablesorter-default stickyTableHeaders" role="grid" style="padding: 0px;" resolved="">
				<colgroup>
					{#each k_query_table.fields as k_field}
						<col />
					{/each}
				</colgroup>
				<thead class="tableFloatingHeaderOriginal">
					<tr role="row" class="tablesorter-headerRow">
						{#each k_query_table.fields as k_field, i_field}
							<th class="confluenceTh tablesorter-header sortableHeader tablesorter-headerUnSorted" data-column={i_field} tabindex="0" scope="col" role="columnheader" aria-disabled="false" unselectable="on" aria-sort="none" aria-label="{k_field.label}: No sort applied, activate to apply an ascending sort" style="user-select: none;">
								<div class="tablesorter-header-inner">
									{k_field.label}
								</div>
							</th>
						{/each}
					</tr>
				</thead>
				<thead class="tableFloatingHeader" style="display: none;">
					<tr role="row" class="tablesorter-headerRow">
						{#each k_query_table.fields as k_field, i_header}
							<th class="confluenceTh tablesorter-header sortableHeader tablesorter-headerUnSorted" data-column={i_header} tabindex="0" scope="col" role="columnheader" aria-disabled="false" unselectable="on" aria-sort="none" aria-label="{k_field.label}: No sort applied, activate to apply an ascending sort" style="user-select: none;">
								<div class="tablesorter-header-inner">
									{k_field.label}
								</div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody aria-live="polite" aria-relevant="all">
					{#if b_loading || !g_preview.rows.length}
						{#each A_DUMMY_TABLE_ROWS as g_row}
							<tr role="row">
								{#each k_query_table.fields as k_field}
									<td class="confluenceTd">
										<span class="ve-table-preview-cell-placeholder">&nbsp;</span>
									</td>
								{/each}
							</tr>
						{/each}
					{:else}
						{#each g_preview.rows as h_row}
							<tr role="row">
								{#each Object.values(h_row) as sx_cell}
									<td class="confluenceTd">{@html sx_cell}</td>
								{/each}
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
