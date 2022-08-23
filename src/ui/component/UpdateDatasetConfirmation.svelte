<script lang="ts">
	import {
		lang,
	} from '#/common/static';


	import type {
		Connection,
		ModelVersionDescriptor,
	} from '#/model/Connection';

	import type {
		PageMap,
	} from '#/vendor/confluence/module/confluence';

	import type {
		ModalContext,
	} from './DatasetsTable.svelte';

	export let g_modal_context: ModalContext;

	export let k_connection: Connection;

	export let g_version: ModelVersionDescriptor;
	
	export let hm_tables: PageMap;

	export let confirm: () => void;

	export let cancel: () => void;

	const nl_tables = hm_tables.tables;
	const nl_pages = hm_tables.pages.length;
	const nl_cfs = hm_tables.cfs;
	let dt_version = new Date(g_version.dateTime);
	let s_latest_display = `${dt_version.toDateString()} @${dt_version.toLocaleTimeString()}`;

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
			Are you sure you want to update <b>{k_connection.label}</b> to the <b>{s_latest_display}</b> extraction?
			{nl_tables} table(s) and {nl_cfs} mention(s) will be affected across {nl_pages} page(s).
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
