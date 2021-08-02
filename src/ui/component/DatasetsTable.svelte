<script lang="ts">
	import Select from 'svelte-select';

	import {
		Connection,
		MmsSparqlConnection,
	} from '#/model/Connection';

	import type {
		Context,
	} from '#/model/Serializable';

	import {
		VeOdm,
	} from '#/model/Serializable';

	import type {VeoPath} from '#/common/veo';
import SelectItem from './SelectItem.svelte';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

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
	let A_CONNECTIONS: Connection[] = [];
	(async() => {
		const h_connections = await k_object_store.options<Connection.Serialized>('document#connection.**', g_context);
		for(const sp_connection in h_connections) {
			const gc_connection = (h_connections as Record<string, Connection.Serialized>)[sp_connection];
			switch(gc_connection.type) {
				case 'MmsSparqlConnection': {
					const k_connection = await VeOdm.createFromSerialized(
						MmsSparqlConnection,
						sp_connection as VeoPath.MmsSparqlConnection,
						gc_connection as MmsSparqlConnection.Serialized, g_context
					);
					A_CONNECTIONS.push(k_connection as unknown as Connection);
					break;
				}

				default: {
					console.error(`Connection type is not mapped '${gc_connection.type}'`);
				}
			}
		}

		A_CONNECTIONS = A_CONNECTIONS;
	})();

	function select_version() {

	}
</script>

<style lang="less">
	@import '/src/common/ve.less';

	table {
		text-align: left;
		margin: 1em 0;
		border-spacing: 3pt;
		border-collapse: collapse;
		
		thead {
			line-height: 10px;

			tr {
				th {
					font-weight: 400;
					font-size: 9pt;
					color: var(--ve-color-medium-light-text);
					padding-bottom: 4pt;

					padding-left: 6px;
					padding-right: 6px;
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
						border: 1px solid var(--ve-color-medium-light-text);
						padding: 4px 6px;
						font-size: 14px;

						&.cell-version {
							padding: 0 !important;
						}

						&.cell-align-center {
							text-align: center;
							padding: 0 !important;
							vertical-align: middle;
						}

						&:nth-child(n-1) {
							padding-right: 14pt;
						}

						--height: 26px;
						--padding: 0;
						// --inputPadding: 0;
						--height: 24px;
						--itemColor: var(--ve-color-dark-text);
						--itemHoverBG: var(--ve-color-medium-light-text);

						// --itemActiveBackground: var(--ve-color-light-text);
						--itemIsActiveColor:  var(--ve-color-dark-text);
						--itemIsActiveBG:  var(--ve-color-light-text);
						--itemPadding: 2px 6px;

						--indicatorTop: -1px;
						--indicatorWidth: 7px;
						--indicatorHeight: 5px;

						:global(.selectContainer) {
							color: var(--ve-color-dark-text);

							display: inline-flex;
							width: fit-content;
							min-width: 200px;
							vertical-align: middle;

							height: 28px;
							border-radius: 0px;
						}

						:global(.selectContainer .listContainer) {
							margin-left: -1px;
							margin-top: -5px;
						}

						:global(span.state-indicator) {
							padding-right: 2px;
						}

						:global(.indicator + div:nth-child(n + 3)) {
							margin-top: -5px;
						}

						:global(.multiSelectItem_clear > svg) {
							transform: scale(0.9);
						}

						:global(.multiSelectItem) {
							margin: 3px 0 3px 4px;
						}

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
				<th>Tables</th>
				<th>Status</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each A_CONNECTIONS as k_connection}
				<tr class="data">
					<td>{k_connection.label}</td>
					<td class="cell-version">
						{#await k_connection.fetchVersions()}
							<Select
								isDisabled={true}
								isClearable={false}
								placeholder="Loading..."
							></Select>
						{:then a_versions}
							<Select
								items={[
									{
										label: 'Mar 20, 2021 <span class="ve-tag-pill">Latest</span>',
										value: '2021-03-20',
									},
									...a_versions,
								]}
								isClearable={false}
								placeholder="{a_versions.length}"
								showIndicator={true}
								indicatorSvg={/* syntax: html */ `
									<svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M3.5 4.5L0.468911 0.75L6.53109 0.75L3.5 4.5Z" fill="#333333"/>
									</svg>
								`}
								Item={SelectItem}
								containerStyles={'padding: 0px 40px 0px 6px;'}
								listOffset={5}
								on:select={select_version}
							></Select>
						{/await}
					</td>
					<td class="cell-align-center">
						{#await g_context.document.findPathTags('page#elements.serialized.queryTable', g_context)}
							Counting...
						{:then c_tags}
							{c_tags}
						{/await}
					</td>
					<td class="cell-align-center">
						<span class="ve-pill">
							DRAFT

							<Fa icon={faCheckCircle} size="sm" />
							Published
						</span>
					</td>
					<td>
						Publish N Tables
					</td>
					<!-- <td>
						<span class="status" bind:this={g_source.status_elmt}>
							<Fa icon={faCircleNotch} class="fa-spin" />
							<span class="text">
								Connecting...
							</span>
						</span>
					</td> -->
				</tr>
			{/each}
		</tbody>
	</table>
</div>