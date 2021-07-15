<script lang="ts">
	import Select from 'svelte-select';

	import {
		Connection,
		MmsSparqlConnection,
	} from '#/model/Connection';

	import type {
		Context,
	} from '#/model/Serializable';
import type { VeoPath } from '#/common/veo';

	export let g_context: Context;
	let k_object_store = g_context.store;

	// interface SelectOption {
	// 	value: string;
	// 	label: string;
	// 	group: string;
	// }

	// interface Source {
	// 	id: string;
	// 	label: string;
	// 	versions: SelectOption[];
	// 	selected: SelectOption | null;
	// 	status_elmt: HTMLSpanElement | null;
	// 	select_version(dv: CustomEvent<SelectOption>): void;
	// }

	// const G_SOURCE_DNG: Source = {
	// 	id: 'dng',
	// 	label: 'DNG Requirements',
	// 	versions: [
	// 		{
	// 			value: '3/27/21',
	// 			label: 'Mar 27, 2021',
	// 			group: 'master',
	// 		},
	// 		{
	// 			value: '3/28/21',
	// 			label: 'Mar 28, 2021',
	// 			group: 'master',
	// 		},
	// 	] as SelectOption[],

	// 	selected: null,

	// 	select_version(dv_event: CustomEvent<SelectOption>) {
	// 		G_SOURCE_DNG.selected = dv_event.detail;
	// 	},

	// 	status_elmt: null,
	// };

	// const G_SOURCE_HELIX: Source = {
	// 	id: 'helix',
	// 	label: 'Helix Commands',
	// 	versions: [
	// 		{
	// 			value: '3/27/21',
	// 			label: 'Mar 27, 2021',
	// 			group: 'master',
	// 		},
	// 		{
	// 			value: '3/28/21',
	// 			label: 'Mar 28, 2021',
	// 			group: 'master',
	// 		},
	// 	] as SelectOption[],

	// 	selected: null,

	// 	select_version(dv_event: CustomEvent<SelectOption>) {
	// 		G_SOURCE_DNG.selected = dv_event.detail;
	// 	},

	// 	status_elmt: null,
	// };

	// initialize connections
	const A_CONNECTIONS: Connection[] = [];
	(async() => {
		const h_connections = await k_object_store.options<Connection.Serialized>('page#connection.**');

		for(const sp_connection in h_connections) {
			const gc_connection = (h_connections as Record<string, Connection.Serialized>)[sp_connection];
			switch(gc_connection.type) {
				case 'MmsSparqlConnection': {
					A_CONNECTIONS.push(new MmsSparqlConnection(sp_connection as VeoPath.MmsSparqlConnection, gc_connection as MmsSparqlConnection.Serialized, g_context));
					break;
				}

				default: {
					console.error(`Connection type is not mapped '${gc_connection.type}'`);
				}
			}
		}
	})();
</script>

<style lang="less">
	table {
		text-align: left;
		margin: 1em 0;
		border-spacing: 3pt;
		
		thead {
			line-height: 10px;

			tr {
				th {
					font-weight: 400;
					font-size: 9pt;
					color: var(--ve-color-medium-light-text);
					min-width: 14em;
					padding-bottom: 2pt;
				}
			}
		}

		tbody {
			tr {
				// border-top: 1px solid var(--ve-color-medium-light-text);

				&.hr {
					padding: 0;
					margin: 0;

					hr {
						margin: 0;
						color: var(--ve-color-medium-light-text);
					}
				}

				&.data {
					td {
						&:nth-child(n-1) {
							padding-right: 14pt;
						}

						--padding: 0;
						// --inputPadding: 0;
						--height: 20px;
						--itemColor: var(--ve-color-dark-text);
						--itemHoverBG: var(--ve-color-medium-light-text);

						// --itemActiveBackground: var(--ve-color-light-text);
						--itemIsActiveColor:  var(--ve-color-dark-text);
						--itemIsActiveBG:  var(--ve-color-light-text);
						--itemPadding: 2px 20px;

						:global(.selectContainer) {
							color: var(--ve-color-dark-text);
						}

						:global(.selectContainer .listContainer) {
							margin-left: -1px;
							margin-top: -5px;
						}

						// :global(.selectContainer div .active:before) {
						//     display: inline-block;
						//     text-rendering: auto;
						//     -webkit-font-smoothing: antialiased;
						//     font-family: "Font Awesome 5 Free";
						//     content: "\f00c";
						//     position: absolute;
						//     left: 6px;
						// }

						span.status {
							background-color: var(--ve-color-dark-text);
							color: var(--ve-color-light-text);
							font-size: 10px;
							text-transform: uppercase;
							font-weight: 500;
							letter-spacing: 0.05em;
							padding: 4pt 8pt;
							border-radius: 2pt;

							.text {
								padding-left: 4pt;
							}
						}
					}
				}
			}
		}
	}
</style>

<div>
	<table>
		<thead>
			<tr>
				<th>Data Type</th>
				<th>Version</th>
				<th>Status</th>
			</tr>
		</thead>
		<tbody>
			{#each A_CONNECTIONS as k_connection}
				<tr class="hr">
					<td colspan="3">
						<hr>
					</td>
				</tr>
				<tr class="data">
					<td>{k_connection.label}</td>
					<td>
						{#await k_connection.fetchVersions()}
							<Select
								isDisabled={true}
								isClearable={false}
								placeholder="Loading..."
							></Select>
						{:then a_versions}
							<Select
								items={a_versions}
								isClearable={false}
								placeholder="Loading..."
							></Select>
						{/await}
					</td>
					<td>
						<!-- <span class="status" bind:this={g_source.status_elmt}>
							<Fa icon={faCircleNotch} class="fa-spin" />
							<span class="text">
								Connecting...
							</span>
						</span> -->
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>