<script context="module" lang="ts">
	export interface Value {
		label: string;
		value: string;
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
	import Select from 'svelte-select';

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
			value: g_value.value,
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
	
	function handle_select(d_event) {
		debugger;
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
		// display: grid;
		// grid-template-columns: auto auto auto auto auto;

		// label {
		// 	border: 1px solid transparent;

		// 	&:hover {
		// 		background-color: aliceblue;
		// 		border: 1px solid rgba(0,0,0,0.3);
		// 	}
		// 

		color: var(--ve-color-dark-text);
		font-size: 13px;

		--height: 24px;
		--indicatorTop: 0px;
		--indicatorWidth: 7px;
		--indicatorHeight: 5px;
		--itemColor: var(--ve-color-dark-text);
		--multiItemBorderRadius: 2px;
		--multiItemPadding: 0 6px 0 6px;
		--multiItemMargin: 3px 0 3px 4px;
		--multiClearTop: 2px;
		--multiItemBG: var(--ve-color-medium-light-text);
		--multiItemHeight: 22px;
		--multiClearBG: transparent;
		--multiClearFill: var(--ve-color-dark-text);
		--multiSelectPadding: 0;

		:global(.indicator+div:nth-child(n+3)) {
			margin-top: -5px;
		}

		:global(.multiSelectItem_clear>svg) {
			transform: scale(0.9);
		}
	}

	.greyed-out {
		color: grey;
	}

	.hidden {
		display: none;
	}
</style>

<!-- <fieldset> -->
	<hr>
	<legend class="param-label">
		<span>{g_param.label || g_param.key}</span>
	</legend>
	<span class="param-values">
		{#if XC_LOAD_NOT === xc_load}
			<p>{lang.loading_pending}</p>
		{:else if XC_LOAD_ERROR === xc_load}
			<p style="color:red;">{lang.loading_failed}</p>
		{:else}
			<Select
				isMulti={true}
				showIndicator={true}
				items={g_param.values}
				indicatorSvg={/* syntax: html */ `
					<svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M3.5 4.5L0.468911 0.75L6.53109 0.75L3.5 4.5Z" fill="#333333"/>
					</svg>
				`}
			></Select>
			<!-- <div class="param-values" bind:this={dm_values}>
				{#each g_param.values as g_value}
					<label class:hidden={XC_STATE_HIDDEN === g_value.state}>
						<input type="checkbox" name="query_maturity" id="query_maturity_{g_value.label}" value="{g_value.label}" bind:group={a_values_selected} on:change={() => dispatch('change')}>
						{format_param_value_label(g_value)}
					</label>
				{/each}
			</div> -->
		{/if}
	</span>
<!-- </fieldset> -->