<script lang="ts">
	import {
		onMount,
	} from 'svelte';

	import {
		slide,
	} from 'svelte/transition';
	import Select from 'svelte-select';

    import Fa from 'svelte-fa';
    import {
        faCheckCircle,
        faCircleNotch,
		faFilter,
		faHistory,
		faQuestionCircle,
    } from '@fortawesome/free-solid-svg-icons';

	import SelectItem from './SelectItem.svelte';

	import {
		build_select_query,
	} from './query-table';

	import QueryTableParam from './QueryTableParam.svelte';
	import type {
		Param,
	} from './QueryTableParam.svelte';
import { spread } from 'svelte/internal';
	
	export let G_CONTEXT: import('../common/ve4').Ve4ComponentContext;
	const {
		k_sparql,
	} = G_CONTEXT;

	const A_DUMMY_TABLE_HEADERS = [
		{
			label: 'ID',
		},
		{
			label: 'Requirement Name',
		},
		{
			label: 'Requirement Text',
		},
		{
			label: 'Key/Driver Indicator',
		},
		{
			label: 'Affected Systems',
		},
		{
			label: 'Maturity',
		},
	];

	const A_DUMMY_TABLE_ROWS = [{}, {}, {}];

	export let dm_anchor = document.createElement('div');

	type Hash = Record<string, string>;
	type Row = Record<string, {
		value: string;
	}>;

	interface Preview {
		columns: Array<{label: string}>;
		rows: Array<Hash>;
	}

	let b_expand = false;


	let b_loading = false;
	let b_showing = false;
	let g_source: {label:string} | null = null;

	g_source = {
		label: 'DNG Requirements',
	};

	$: dm_anchor.style.display = (b_showing && b_display_params)? 'none': 'block';
	$: dm_anchor.style.opacity = b_loading? '0.5': '1.0';

	let g_preview: Preview = {
		columns: [],
		rows: [],
	};

	let b_preview = false;

	export let h_params: Record<string, Param> = {
		// level: {
		// 	key: 'Level',
		// 	sort: (g_a: {label: string}, g_b: {label: string}) => g_a.label < g_b.label? -1: 1,
		// 	filter: '',
		// 	values: [],
		// 	selected: ['L3'],
		// },
		sysvac: {
			key: 'System VAC',
			filter: '',
			values: [],
			selected: [],
		},
		maturity: {
			key: 'Maturity',
			filter: '',
			values: [],
			selected: [],
		},
	};

	let b_display_params = false;

	enum INFO_MODES {
		PREVIEW=1,
		LOADING=2,
	};

	let xc_info_mode = INFO_MODES.PREVIEW;
	const SX_STATUS_INFO_INIT = 'PREVIEW (0 results)';
	let s_status_info = SX_STATUS_INFO_INIT;

	function toggle_param_display() {
		b_display_params = !b_display_params;
		b_preview = false;
		b_loading = false;
		b_showing = false;
	}

	const escape_html = (s: string) => s.replace(/</g, '&lt;');

	const unordered_list = (si_key: string) => (g: Row) => `<ul>${(g[si_key]?.value || '').split('\0').map(s => `<li>${escape_html(s)}</li>`).join('')}</ul>`;

	const H_FIELDS: Record<string, (g: Row) => string> = {
		id: g => escape_html(g.identifierValue.value),
		name: g => `<a href="${g.artifact.value}">${escape_html(g.titleValue.value)}</a>`,
		text: g => g.primaryTextValue.value,
		keydriver: unordered_list('keydriverValue'),
		systems: g => escape_html(g.systemsValue?.value || ''),
		maturity: g => g.maturityValue?.value || '',
	};


	async function render() {
		xc_info_mode = INFO_MODES.LOADING;

		let b_filtered = false;
		for(const g_param of Object.values(h_params)) {
			if(g_param.selected.length) {
				b_filtered = true;
				break;
			}
		}

		if(!b_filtered) {
			b_loading = false;
			b_preview = false;
			b_showing = false;
			return;
		}

		b_loading = true;
		b_preview = true;

		const sq_select = build_select_query(h_params, {
			systems: {
				key: 'Affected Systems',
			},
			maturity: {
				key: 'Maturity',
			},
			keydriver: {
				key: 'Key/Driver [S]',
				label: 'Key/Driver',
				array: true,
			},
		});

		const a_rows = await k_sparql.select(sq_select);

		g_preview.columns = [
			{label:'ID'},
			{label:'Requirement Name'},
			{label:'Requirement Text'},
			{label:'Key/Driver Indicator'},
			{label:'Affected Systems'},
			{label:'Maturity'},
		];

		g_preview.rows = a_rows.map(g_row => {
			const h_out: Record<string, string> = {};

			for(const [si_field, f_field] of Object.entries(H_FIELDS)) {
				h_out[si_field] = f_field(g_row);
			}

			return h_out;
		});

		b_loading = false;
		b_showing = true;

		s_status_info = `PREVIEW (${a_rows.length > 20? '>20': '20'} result${1 === a_rows.length? '': 's'})`;
		xc_info_mode = INFO_MODES.PREVIEW;
	}

	function toggle_parameters() {
		b_expand = !b_expand;
		if(!b_expand) return;

		
	}

	const a_query_types = [
		{
			label: 'Appendix Flight Systems Requirements',
			value: 'afsr',
		},
		{
			label: 'Appendix Subsystem Requirements',
			value: 'asr',
		},
	];
</script>

<style lang="less">
	@import './ve.less';

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

				*:nth-child(n+2) {
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

				*:nth-child(n+2) {
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

					:global(.indicator+div:nth-child(n+3)) {
						margin-top: -5px;
					}

					:global(.multiSelectItem_clear>svg) {
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
					background-color: #e5e5e5;
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
			Connected Data Table {g_source? `with ${g_source.label}`: ''}
			<Fa icon={faQuestionCircle} />
		</span>
		<span class="buttons">
			<button class="ve-button-primary">Publish</button>
			<button class="ve-button-secondary">Cancel</button>
		</span>
		<!-- <button on:click={toggle_param_display}>{b_display_params? 'Cancel Edits': 'Edit Parameters'}</button> -->
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
					Version: March 20, 2021
				</span>
			</span>
			<span class="info">
				{#if INFO_MODES.PREVIEW === xc_info_mode}
					{s_status_info}
				{:else if INFO_MODES.LOADING === xc_info_mode}
					<Fa icon={faCircleNotch} /> LOADING PREVIEW
				{/if}
			</span>
		</div>
		{#if b_expand}
			<div class="config-body" transition:slide={{}}>
				<div class="query-type">
					<span class="label">Query Type</span>
					<span class="select">
						<Select
							showIndicator={true}
							selectedValue={a_query_types[0]}
							items={a_query_types}
							indicatorSvg={/* syntax: html */ `
								<svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M3.5 4.5L0.468911 0.75L6.53109 0.75L3.5 4.5Z" fill="#333333"/>
								</svg>
							`}
							Item={SelectItem}
						/>
					</span>
				</div>
				<div class="form">
					<!-- <div class="header"> -->
						<span class="header">Parameter</span>
						<span class="header">Value</span>
					<!-- </div> -->
					{#each Object.values(h_params) as g_param}
						<QueryTableParam {G_CONTEXT} {g_param} on:change={render} />
					{/each}
				</div>
			</div>
		{/if}
		<div class="table-wrap">
			<table class="wrapped confluenceTable tablesorter tablesorter-default stickyTableHeaders" role="grid" style="padding: 0px;" resolved="">
				<colgroup>
					{#each A_DUMMY_TABLE_HEADERS as g_header, i_header}
						<col>
					{/each}
				</colgroup>
				<thead class="tableFloatingHeaderOriginal">
					<tr role="row" class="tablesorter-headerRow">
						{#each A_DUMMY_TABLE_HEADERS as g_header, i_header}
							<th class="confluenceTh tablesorter-header sortableHeader tablesorter-headerUnSorted" data-column="{i_header}" tabindex="0" scope="col" role="columnheader" aria-disabled="false" unselectable="on" aria-sort="none" aria-label="{g_header.label}: No sort applied, activate to apply an ascending sort" style="user-select: none;">
								<div class="tablesorter-header-inner">{g_header.label}</div>
							</th>
						{/each}
					</tr>
				</thead>
				<thead class="tableFloatingHeader" style="display: none;">
					<tr role="row" class="tablesorter-headerRow">
						{#each A_DUMMY_TABLE_HEADERS as g_header, i_header}
							<th class="confluenceTh tablesorter-header sortableHeader tablesorter-headerUnSorted" data-column="{i_header}" tabindex="0" scope="col" role="columnheader" aria-disabled="false" unselectable="on" aria-sort="none" aria-label="{g_header.label}: No sort applied, activate to apply an ascending sort" style="user-select: none;">
								<div class="tablesorter-header-inner">{g_header.label}</div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody aria-live="polite" aria-relevant="all">
					{#if b_loading || !g_preview.rows.length}
						{#each A_DUMMY_TABLE_ROWS as g_row}
							<tr role="row">
								{#each A_DUMMY_TABLE_HEADERS as g_header}
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

{#if b_display_params}
	<div class="parameters" transition:slide={{}}>
		{#each Object.values(h_params) as g_param}
			<QueryTableParam {G_CONTEXT} {g_param} on:change={render} />
		{/each}
	</div>
{/if}
<!-- 
{#if b_preview}
	<div class="preview">
		<div class="info">
			{#if b_loading}
				Loading preview...
			{:else}
				Previewing {g_preview.rows.length} requirements that match these filters
			{/if}
		</div>
		<div class="table-wrap" class:loading={b_loading} class:hidden={!b_showing}>
			<table class="wrapped confluenceTable tablesorter tablesorter-default stickyTableHeaders" role="grid" style="padding: 0px;">
				<colgroup>
					{#each g_preview.columns as g_column}
						<col>
					{/each}
				</colgroup>
				<thead class="tableFloatingHeaderOriginal">
					<tr role="row" class="tablesorter-headerRow">
						{#each g_preview.columns as g_column}
							<th class="confluenceTh tablesorter-header sortableHeader tablesorter-headerUnSorted" data-column="0" tabindex="0" scope="col" role="columnheader" aria-disabled="false" unselectable aria-sort="none" aria-label="ID: No sort applied, activate to apply an ascending sort" style="user-select: none;">
								<div class="tablesorter-header-inner">{g_column.label}</div>
							</th>
						{/each}
					</tr>
				</thead>
				<thead class="tableFloatingHeader" style="display: none;">
					<tr role="row" class="tablesorter-headerRow">
						{#each g_preview.columns as g_column}
							<th class="confluenceTh tablesorter-header sortableHeader tablesorter-headerUnSorted" data-column="0" tabindex="0" scope="col" role="columnheader" aria-disabled="false" unselectable aria-sort="none" aria-label="ID: No sort applied, activate to apply an ascending sort" style="user-select: none;">
								<div class="tablesorter-header-inner">{g_column.label}</div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody aria-live="polite" aria-relevant="all">
					{#each g_preview.rows as h_row}
						<tr role="row">
							{#each Object.values(h_row) as sx_cell}
								<td class="confluenceTd">{@html sx_cell}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if} -->
