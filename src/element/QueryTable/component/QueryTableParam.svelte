<script lang="ts">
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();
	import {lang} from '#/common/static';
	import Select from 'svelte-select';

	import type {
		ParamValuesList,
		QueryParam,
		SparqlQueryTable,
	} from '#/element/QueryTable/model/QueryTable';

	import type {
		MmsSparqlConnection,
	} from '#/model/Connection';

	import {
		Sparql,
	} from '#/util/sparql-endpoint';

	interface Option {
		label: string;
		value: string;
		count: number;
		state: number;
	}
	
	export let k_param: QueryParam;
	export let k_values: ParamValuesList;
	export let k_query_table: SparqlQueryTable;

	let a_options: Option[] = [];

	const XC_STATE_HIDDEN = 0;
	const XC_STATE_VISIBLE = 1;

	const XC_LOAD_NOT = 0;
	const XC_LOAD_ERROR = 1;
	const XC_LOAD_YES = 2;

	let e_query: Error | null = null;

	let xc_load = XC_LOAD_NOT;

	async function load_param(k_param: QueryParam) {
		if(k_query_table.type.startsWith('MmsSparql')) {
			const k_connection = (await k_query_table.getConnection()) as MmsSparqlConnection;

			const a_rows = await k_connection.execute(/* syntax: sparql */ `
				select ?value (count(?req) as ?count) from <${k_connection.modelGraph}> {
					?_attr a rdf:Property ;
						rdfs:label ${Sparql.literal(k_param.value)} .

					?req a oslc_rm:Requirement ;
						?_attr [rdfs:label ?value] .
				}
				group by ?value order by desc(?count)
			`);

			a_options = a_rows.map(({value:g_value, count:g_count}) => ({
				label: g_value.value,
				value: g_value.value,
				count: +(g_count.value),
				state: XC_STATE_VISIBLE,
			}));

			if(k_param.sort) {
				a_options = a_options.sort(k_param.sort);
			}
		}
	}

	(async() => {
		if(!k_values.size) {
			try {
				await load_param(k_param);
			}
			catch(_e_query) {
				e_query = _e_query;
			}
		}

		xc_load = XC_LOAD_YES;
	})();

	function format_param_value_label(g_value: Option) {
		const n_count = g_value.count;
		let s_label = g_value.label;

		if(n_count >= 1000) {
			s_label += ` [>${Math.floor(n_count / 1000)}k]`;
		}
		else {
			s_label += ` [${n_count}]`;
		}

		return s_label;
	}

	function select_value(dv_select: CustomEvent<Option[]>) {
		if(dv_select.detail) {
			for(const g_value of dv_select.detail) {
				if(g_value.state) {
					k_values.add(g_value);
				}
				else {
					k_values.delete(g_value);
				}
			}
		}

		dispatch('change');
	}

	function handle_clear(dv_select: CustomEvent<Option[]>) {
		k_values.clear();
	}
</script>

<style lang="less">
	hr {
		grid-column-start: 1;
		grid-column-end: span 2;
		width: 100%;
		height: 0px;
		margin-top: 4px;
	}

	[class^="param-"] {
		align-self: center;
		margin-bottom: 2px;
	}

	.param-label {
		color: var(--ve-color-light-text);
		margin-right: 6em;
		font-size: 13px;
	}

	.param-values {
		color: var(--ve-color-dark-text);
		font-size: 13px;
		padding: 1px 2px 1px 2px;

		--height: 24px;
		--indicatorTop: 2px;
		--indicatorWidth: 7px;
		--indicatorHeight: 5px;
		--itemColor: var(--ve-color-dark-text);

		--multiItemBorderRadius: 2px;
		--multiItemPadding: 0 6px 0 6px;
		--multiItemMargin: 2px;
		--multiItemBG: var(--ve-color-medium-light-text);
		--multiItemHeight: 22px;

		--multiClearTop: 3px;
		--multiClearWidth: 12px;
		--multiClearHeight: 12px;
		--multiClearRadius: 20%;
		--multiClearPadding: 2px;
		--multiClearBG: transparent;
		--multiClearFill: var(--ve-color-dark-text);

		--multiItemActiveBG: var(--ve-color-medium-text);
		--multiItemActiveColor: var(--ve-color-light-text);

		--multiClearHoverBG: var(--ve-color-light-background);
		--multiClearHoverFill: var(--ve-color-dark-text);
		
		--multiLabelMargin: 0;

		--multiSelectPadding: 0 0 0 2px;
		--multiSelectInputMargin: 0 0 0 2px;

		--clearSelectTop: 5px;
		--clearSelectRight: 20px;
		--clearSelectBottom: 5px;
		--clearSelectWidth: 20px;

		:global(.indicator+div:nth-child(n+3)) {
			margin-top: -5px;
		}

		:global(.multiSelectItem_clear) {
			margin-left: 3px;
		}

		:global(.multiSelectItem_clear>svg) {
			transform: scale(0.9);
		}

		:global(.multiSelectItem) {
			margin: 3px 0 3px 4px;
		}
	}

	.greyed-out {
		color: grey;
	}

	.hidden {
		display: none;
	}
</style>


<hr>
<legend class="param-label">
	<span>{k_param.label}</span>
</legend>
<span class="param-values">
	{#if XC_LOAD_NOT === xc_load}
		<p>{lang.loading_pending}</p>
	{:else if XC_LOAD_ERROR === xc_load}
		<p style="color:red;">{lang.loading_failed}</p>
	{:else}
		<Select
			isMulti={true}
			isClearable={false}
			showIndicator={true}
			items={a_options}
			placeholder="Select Attribute Value(s)"
			indicatorSvg={/* syntax: html */ `
				<svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M3.5 4.5L0.468911 0.75L6.53109 0.75L3.5 4.5Z" fill="#333333"/>
				</svg>
			`}
			on:select={select_value}
			on:clear={handle_clear}
		></Select>
	{/if}
</span>