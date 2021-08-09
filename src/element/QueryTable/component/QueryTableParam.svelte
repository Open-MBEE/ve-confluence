<script lang="ts">
	import {createEventDispatcher} from 'svelte';
	import {lang} from '#/common/static';
	import Select from 'svelte-select';
	
	import type {
		QueryParam,
		QueryTable,
	} from '#/element/QueryTable/model/QueryTable';
	
	import type {MmsSparqlConnection} from '#/model/Connection';
	
	import type {ValuedLabeledObject} from '#/common/types';
	
	interface Option {
		count: number;
		state: number;
		data: ValuedLabeledObject;
	}
	
	const f_dispatch = createEventDispatcher();
	export let k_param: QueryParam;
	export let k_query_table: QueryTable;
	
	let k_values = k_query_table.parameterValuesList(k_param.key);
	$: k_values = k_query_table.parameterValuesList(k_param.key);
	
	k_query_table.onRestore((k_new: typeof k_query_table): Promise<void> => {
		k_query_table = k_new;
		return Promise.resolve();
	});
	let a_options: Option[] = [];
	let a_selected_options: Option[] = [];
	let a_init_values = [...k_values];
	const XC_STATE_HIDDEN = 0;
	const XC_STATE_VISIBLE = 1;
	const XC_LOAD_NOT = 0;
	const XC_LOAD_ERROR = 1;
	const XC_LOAD_YES = 2;
	let e_query: Error | null = null;
	let xc_load = XC_LOAD_NOT;
	const get_option_label = (option: ValuedLabeledObject) => option.label;
	const get_selection_label = (option: ValuedLabeledObject) => option.value;

	async function load_param(filterText: string): Promise<ValuedLabeledObject[]> {
		console.log("filter text is " + filterText);
		if(k_query_table.type.startsWith('MmsSparql')) {
			const k_connection = (await k_query_table.fetchConnection()) as MmsSparqlConnection;
			let k_query = await k_query_table.fetchParamQueryBuilder(k_param, filterText);
			const a_rows = await k_connection.execute(/* syntax: sparql */ k_query.stringify());

			a_options = a_rows.map(({value:g_value, count:g_count}) => ({
				count: +g_count.value,
				state: XC_STATE_VISIBLE,
				data: {
					label: g_value.value,
					value: g_value.value,
				},
			}));
			if(k_param.sort) {
				a_options = a_options.map(g_opt => g_opt.data).sort(k_param.sort).map(g_data => a_options.find(g_opt => g_opt.data.value === g_data.value)) as Option[];
			}
			return Promise.resolve(a_options.map(option => option.data));
		}
		else {
			return Promise.reject();
		}
	}
	(async() => {
		// if(!k_values.size) {
		if(XC_LOAD_NOT === xc_load) {
			// add initial selected values to Option array to track of their state
			a_selected_options = a_init_values.map(({value:g_value}) => ({
				count: 1,
				state: XC_STATE_HIDDEN,
				data: {
					label: g_value,
					value: g_value,
				},
			}));
			try {
				await load_param('');
			}
			catch(_e_query) {
				e_query = _e_query as Error;
			}
		}
		xc_load = XC_LOAD_YES;
	})();
	function format_param_value_label(g_opt: Option) {
		const n_count = g_opt.count;
		let s_label = g_opt.data.label;
		if(1000 <= n_count) {
			s_label += ` [>${Math.floor(n_count / 1000)}k]`;
		}
		else {
			s_label += ` [${n_count}]`;
		}
		return s_label;
	}
	function select_value(dv_select: CustomEvent<ValuedLabeledObject[]>) {
		if(dv_select.detail) {
			for(const g_data of dv_select.detail) {
				// check to see if param has been selected
				let g_opt = a_selected_options.find(g_opt_find => g_opt_find.data.value === g_data.value) as Option;

				// if it's not previously selected, it's in a_options
				if(!g_opt) {
					g_opt = a_options.find(g_opt_find => g_opt_find.data.value === g_data.value) as Option;
				}
				if(g_opt && XC_STATE_VISIBLE === g_opt.state) {
					// add parameter to array to keep track of selected elements in the event that it is not in a_options
					if(!a_selected_options.includes(g_opt)) {
						a_selected_options.push(g_opt);
					}
					k_values.add(g_data);
				}
				else {
					k_values.delete(g_data);
				}
			}
		}
		f_dispatch('change');
	}
	function handle_clear(dv_select: CustomEvent<ValuedLabeledObject[]>) {
		k_values.clear();
		f_dispatch('change');
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
		font-size: 14px;
	}
	.param-values {
		color: var(--ve-color-dark-text);
		font-size: 13px;
		padding: 1px 2px 1px 2px;
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
		--virtualListHeight: 500px;
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
		:global(.select-input input) {
			height: 24px;
		}
		:global(svelte-virtual-list-row .item) {
			height: 25px;
			line-height: 25px;
			padding-top: 5px;
			padding-bottom: 5px;
		}
	}
</style>


<hr>
<legend class="param-label">
	<span>{k_param.label}</span>
</legend>
<span class="param-values">
	{#if XC_LOAD_NOT === xc_load}
		<p>{lang.basic.loading_pending}</p>
	{:else if XC_LOAD_ERROR === xc_load}
		<p style="color:red;">{lang.basic.loading_failed}</p>
	{:else}
		<Select
			loadOptions={load_param}
			items={a_options.map(g_opt => g_opt.data)}
			value={a_init_values.length? a_init_values: null}
			getSelectionLabel={get_selection_label}
			getOptionLabel={get_option_label}
			placeholder="Select Attribute Value(s)"
			isMulti={true}
			containerClasses={'select-input'}
			isVirtualList={true}
			isClearable={false}
			showIndicator={true}
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