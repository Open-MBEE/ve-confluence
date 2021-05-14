<script lang="ts">
	import {
		onMount,
	} from 'svelte';

	import {
		slide,
	} from 'svelte/transition';

	import {
		build_select_query,
	} from './query-table';

	import QueryTableParam from './QueryTableParam.svelte';
	import type {
		Param,
	} from './QueryTableParam.svelte';
	
	export let G_CONTEXT: import('../common/ve4').Ve4ComponentContext;
	const {
		k_sparql,
	} = G_CONTEXT;

	export let dm_anchor = document.createElement('div');

	type Hash = Record<string, string>;
	type Row = Record<string, {
		value: string;
	}>;

	interface Preview {
		columns: Array<{label: string}>;
		rows: Array<Hash>;
	}

	let b_loading = false;
	let b_showing = false;

	$: dm_anchor.style.display = (b_showing && b_display_params)? 'none': 'block';
	$: dm_anchor.style.opacity = b_loading? '0.5': '1.0';

	let g_preview: Preview = {
		columns: [],
		rows: [],
	};

	let b_preview = false;

	export let h_params: Record<string, Param> = {
		level: {
			key: 'Level',
			sort: (g_a: {label: string}, g_b: {label: string}) => g_a.label < g_b.label? -1: 1,
			filter: '',
			values: [],
			selected: ['L3'],
		},
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
	}
</script>

<style lang="less">
	.controls {
		display: flex;
		background-color: rgba(255, 246, 230,0.4);
		border: 1px solid rgba(0,0,0,0.2);
		padding: 4pt;

		.metadata {
			flex: 1 auto;
		}

		button {
			background-color: #dfdfdf;
			float: right;
			border: 1px solid #aaa;
			padding: 6pt 12pt;
			margin: auto;
		}
	}

	.parameters {
		background-color: #dfdfdf;
		padding: 2pt 8pt;
	}

	.info {
		background-color: beige;
		padding: 4pt 10pt;
		margin-top: 6pt;
	}

	.loading {
		opacity: 0.5;
	}

	.hidden {
		display: none;
	}

</style>

<div class="controls">
	<span class="metadata">
		<div>
			<b>Lorem Ipsum</b>
		</div>
		<div>
			Last Generated: {(new Date()).toLocaleString()}
		</div>
	</span>
	<button on:click={toggle_param_display}>{b_display_params? 'Cancel Edits': 'Edit Parameters'}</button>
</div>

{#if b_display_params}
	<div class="parameters" transition:slide={{}}>
		{#each Object.values(h_params) as g_param}
			<QueryTableParam {g_param} {k_sparql} on:change={render} />
		{/each}
	</div>
{/if}

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
{/if}
