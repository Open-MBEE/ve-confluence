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

	let e_query: Error | null = null;

	let xc_load = XC_LOAD_NOT;

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
	
	function select_value(d_event: CustomEvent<Value[]>) {
		if(!d_event.detail) {
			return;
		}

		for(const g_value of d_event.detail) {
			if(g_value.state) {
				a_values_selected.push(g_value.label);
			}
			else {
				const i_value = a_values_selected.indexOf(g_value.label);
				a_values_selected.splice(i_value, 1);
			}
		}

		dispatch('change');
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
				isClearable={false}
				showIndicator={true}
				items={g_param.values}
				placeholder="Select Attribute Value(s)"
				indicatorSvg={/* syntax: html */ `
					<svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M3.5 4.5L0.468911 0.75L6.53109 0.75L3.5 4.5Z" fill="#333333"/>
					</svg>
				`}
				on:select={select_value}
			></Select>
		{/if}
	</span>
<!-- </fieldset> -->