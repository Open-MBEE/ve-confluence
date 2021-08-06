<script lang="ts">
	import {
		lang,
		process,
	} from "#/common/static";

	import type {
		MmsSparqlQueryTable,
	} from "#/element/QueryTable/model/QueryTable";

	import type {
		Connection,
		ModelVersionDescriptor,
	} from "#/model/Connection";

	import type {
		PageMap,
	} from "#/vendor/confluence/module/confluence";

	import type {
		ModalContext,
	} from './DatasetsTable.svelte';

	export let g_modal_context: ModalContext;

	export let k_connection: Connection;

	export let g_version: ModelVersionDescriptor;
	
	export let hm_tables: PageMap<MmsSparqlQueryTable.Serialized, MmsSparqlQueryTable>;

	export let confirm: () => void;

	export let cancel: () => void;

	const a_table_sets = [...hm_tables.values()];

	const nl_tables = a_table_sets.flatMap(h => Object.values(h)).length;
	const nl_pages = hm_tables.size;

	function close() {
		g_modal_context.close();
	}

	function close_and_cancel() {
		close();
		cancel();
	}

	function close_and_confirm() {
		close();
		confirm();
	}

</script>

<style lang="less">
	@import '/src/common/ve.less';

	section {
		font-weight: 400;

		h3, hr {
			color: var(--ve-color-medium-light-text);
		}

		h3 {
			margin: 0.75em 1em;
		}

		hr {
			margin: 0;
		}

		div {
			padding: 1em;
		}

		b {
			font-weight: 800;
		}

		.buttons {
			margin-top: 6pt;
			text-align: right;
		}
	}
</style>

<section>
	<h3>Update Connected Data</h3>

	<hr>

	<div>
		<p>
			Are you sure you want to update <b>{k_connection.label}</b> to the <b>{g_version.data?.original_label || g_version.label}</b> extraction?
			{1 === nl_tables? '1 table will be affected': `${nl_tables} tables will be affected ${1 === nl_pages? 'on 1 page': `across ${nl_pages} pages`}`}.
		</p>

		<p>
			<em>With the current version of {lang.basic.app_title}, it will not be possible to revert to a previous version of the data.</em>
		</p>
	</div>

	<div class="buttons">
		<button class="ve-button-primary" on:click={close_and_confirm}>Confirm</button>
		<button class="ve-button-secondary" on:click={close_and_cancel}>Cancel</button>
	</div>
</section>
