<script context="module" lang="ts">
	export interface Value {
		label: string;
		count: number;
		state: number;
	}

	export interface Param {
		key: string,
		label?: string;
		sort?: (g_a: {label: string}, g_b: {label: string}) => -1 | 0 | 1,
		filter?: string,
		values: Value[],
		selected: string[],
	}
</script>

<script lang="ts">
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();
	import {lang} from '../common/static';

	export let G_CONTEXT: import('../common/ve4').Ve4ComponentContext;
	const {
		k_sparql,
	} = G_CONTEXT;
	
	export let g_param: Param;
	
	export let a_values_selected = g_param.selected || [];
	$: g_param.selected = a_values_selected;

	const XC_STATE_HIDDEN = 0;
	const XC_STATE_VISIBLE = 1;

	const XC_LOAD_NOT = 0;
	const XC_LOAD_ERROR = 1;
	const XC_LOAD_YES = 2;

	let dp_params = null;
	let dm_values: HTMLElement;
	let e_query: Error | null = null;

	let xc_load = XC_LOAD_NOT;

	const terse_iri = (p: string): string => `<${p}>`;
	const terse_lit = (s: string): string => `"${s}"`;

	async function load_param(g_param: Param) {
		const a_bindings = await k_sparql.select(k => /* syntax: sparql */ `
			select ?value (count(?req) as ?count) from ${k.var('DATA_GRAPH')} {
				?_attr a rdf:Property ;
					rdfs:label ${k.literal(g_param.key)} .

				?req a oslc_rm:Requirement ;
					?_attr [rdfs:label ?value] .
			}
			group by ?value order by desc(?count)
		`);

		let a_values = a_bindings.map(({value:g_value, count:g_count}) => ({
			label: g_value.value,
			count: +(g_count.value),
			state: XC_STATE_VISIBLE,
		}));

		if('sort' in g_param) {
			a_values = a_values.sort(g_param.sort);
		}

		g_param.values = a_values;
	}

	(async() => {
		if(!g_param.values.length) {
			try {
				await load_param(g_param);
			}
			catch(_e_query) {
				e_query = _e_query;
			}
		}

		xc_load = XC_LOAD_YES;
	})();

	function format_param_value_label(g_value: Value) {
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

	$: if(g_param.filter) {
		const s_filter = g_param.filter;

		g_param.values = g_param.values.map(g_value => {
			g_value.state = g_value.label.toLowerCase().includes(s_filter)? XC_STATE_VISIBLE: XC_STATE_HIDDEN;
			return g_value;
		});
	}
	else {
		g_param.values = g_param.values.map(g_value => {
			g_value.state = XC_STATE_VISIBLE;
			return g_value;
		})
	}

	function checkboxes_select_all() {
		a_values_selected = g_param.values.map(g => g.label);
		dispatch('change');
	}

	function checkboxes_select_none() {
		a_values_selected.length = 0;
		dispatch('change');
	}

</script>

<style lang="less">
	fieldset {
		margin-bottom: 5pt;

		.param-header {
			margin-top: 2pt;
			margin-bottom: 1pt;

			&>*:nth-child(n+2) {
				margin-left: 8pt;
			}

			span {
				font-weight: bold;
			}

			input {

			}

			a {

			}
		}

		.param-values {
			display: grid;
			grid-template-columns: auto auto auto auto auto;

			label {
				border: 1px solid transparent;

				&:hover {
					background-color: aliceblue;
					border: 1px solid rgba(0,0,0,0.3);
				}
			}
		}
	}

	.greyed-out {
		color: grey;
	}

	.hidden {
		display: none;
	}
</style>

<fieldset>
	<legend class="param-header">
		<span>{g_param.label || g_param.key}</span>
		<input type="text" placeholder="{lang.placeholder.filter_query_params}" bind:value={g_param.filter}>
		<a href="javascript:void(0)" on:click={checkboxes_select_all} class:greyed-out={g_param.values.length && g_param.values.length === a_values_selected.length}>select all</a>
		<a href="javascript:void(0)" on:click={checkboxes_select_none} class:greyed-out={!a_values_selected.length}>clear selection</a>
	</legend>
	{#if XC_LOAD_NOT === xc_load}
		<p>{lang.loading_pending}</p>
	{:else if XC_LOAD_ERROR === xc_load}
		<p style="color:red;">{lang.loading_failed}</p>
	{:else}
		<div class="param-values" bind:this={dm_values}>
			{#each g_param.values as g_value}
				<label class:hidden={XC_STATE_HIDDEN === g_value.state}>
					<input type="checkbox" name="query_maturity" id="query_maturity_{g_value.label}" value="{g_value.label}" bind:group={a_values_selected} on:change={() => dispatch('change')}>
					{format_param_value_label(g_value)}
				</label>
			{/each}
		</div>
	{/if}
</fieldset>