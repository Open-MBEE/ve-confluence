<script lang="ts">
	import QueryTable from './QueryTable.svelte';
	import Diagram from './Diagram.svelte';

	export let G_CONTEXT: import('../common/ve4').Ve4ComponentContext;
	const {
		k_sparql,
	} = G_CONTEXT;

	let si_block_type_selected = '';

	const H_BLOCK_TYPES = {
		query_table: {
			label: 'Query Table',
			component: QueryTable,
		},
		diagram: {
			label: 'Diagram',
			component: Diagram,
		},
	};

	function select(si_block_type) {
		// de-select
		if(si_block_type_selected === si_block_type) return si_block_type_selected = '';

		// apply selection
		si_block_type_selected = si_block_type;
	}
</script>

<style lang="less">
	.insert {
		background-color: aliceblue;
		padding: 4pt 8pt;
		border: 1px solid rgba(0,0,127,0.4);
		border-radius: 3pt;

		.header {
			margin: 0;
			display: flex;

			span {
				margin-left: 2pt;
				margin-right: 6pt;
				display: inline-flex;
				align-items: center;
			}
		}
	}

	button {
		padding: 6pt 12pt;
		margin: 0 0.25em;
		border: 1px solid #999;
		border-radius: 2pt;
		background-color: white;
		cursor: pointer;

		&:not(.selected):hover {
			background-color: #eaeaf1;
		}

		&.selected {
			border-color: rgba(0,0,120,0.6);
			background-color: rgba(210,210,255,0.3);

			&:hover {
				background-color: rgba(150, 150, 250, 0.3);
			}
		}
	}
</style>

<div class="insert">
	<div class="header">
		<span>Insert new block view:</span>
		<span>
			{#each Object.keys(H_BLOCK_TYPES) as si_block_type}
				<button
					class:selected={si_block_type === si_block_type_selected}
					on:click={() => select(si_block_type)}
				>{H_BLOCK_TYPES[si_block_type].label}</button>
			{/each}
		</span>
	</div>
	<div class="block">
		{#if si_block_type_selected}
			<svelte:component this={H_BLOCK_TYPES[si_block_type_selected].component} {k_sparql} />
		{/if}
	</div>
</div>