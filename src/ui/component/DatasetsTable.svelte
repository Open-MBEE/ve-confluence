<script lang="ts">
	import Select from 'svelte-select';

	import {
		Connection,
		MmsSparqlConnection,
	} from '#/model/Connection';

	import type {
		ModelVersionDescriptor,
	} from '#/model/Connection';

	import type {
		Context,
		Serializable,
	} from '#/model/Serializable';

	import {
		VeOdm,
	} from '#/model/Serializable';

	import type {VeoPath} from '#/common/veo';

	import SelectItem from './SelectItem.svelte';

	import {
		faCheckCircle,
		faCircleNotch,
	} from '@fortawesome/free-solid-svg-icons';

	import Fa from 'svelte-fa';

	import {
		ConfluenceEntity,
		ConfluencePage,
	} from '#/vendor/confluence/module/confluence';


	import type {PageMap} from '#/vendor/confluence/module/confluence';

	import {MmsSparqlQueryTable,
		QueryTable} from '#/element/QueryTable/model/QueryTable';

	type CustomDataProperties = {
		status_mode: G_STATUS;
		tables: PageMap<MmsSparqlQueryTable.Serialized, MmsSparqlQueryTable>;
		tables_touched_count: number;
		tables_changed_count: number;
		pages_touched_count: number;
		pages_changed_count: number;
	};

	export let g_context: Context;
	let k_object_store = g_context.store;

	let g_version_current: ModelVersionDescriptor;

	enum G_STATUS {
		CONNECTING,
		CONNECTED,
		UPDATING,
		UPDATED,
		ERROR,
	}

	let hmw_connections = new WeakMap<Connection, CustomDataProperties>();

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

		for(const k_connection of A_CONNECTIONS) {
			hmw_connections.set(k_connection, {
				status_mode: G_STATUS.CONNECTING,
				tables: new Map(),
				tables_touched_count: 0,
				tables_changed_count: 0,
				pages_touched_count: 0,
				pages_changed_count: 0,
			});
		}

		A_CONNECTIONS = A_CONNECTIONS;
	})();

	function set_connection_properties(k_connection: Connection, h_set: Partial<CustomDataProperties>) {
		// set properties
		Object.assign(hmw_connections.get(k_connection), h_set);

		// reload keyed markup
		hmw_connections = hmw_connections;
	}

	function select_version_for(k_connection: Connection) {
		return async function select_version(this: Select, d_event: CustomEvent<ModelVersionDescriptor>) {
			// ref selected model version info
			const g_version_new = d_event.detail;

			// set status mode
			set_connection_properties(k_connection, {
				status_mode: G_STATUS.UPDATING,
			});

			// fetch connection data
			const g_data = hmw_connections.get(k_connection);
			if(!g_data) throw new Error(`No connection data found for ${k_connection.path}`);

			// counters
			let c_tables_touched = 0;
			let c_tables_changed = 0;
			let c_pages_touched = 0;
			let c_pages_changed = 0;

			// each page
			const hm_tables = g_data.tables;
			for(const [g_page, h_odms] of hm_tables) {
				// download page
				const k_page = ConfluencePage.fromBasicPageInfo(g_page);

				// fetch xhtml contents
				let {
					document: k_contents,
				} = await k_page.fetchContentAsXhtmlDocument();

				// count how many tables change on this page
				let c_tables_changed_local = 0;

				// cache page contents
				let sx_page = k_contents.toString();

				// each table
				for(const sp_table in h_odms) {
					const {
						odm: k_odm,
						anchor: yn_anchor,
					} = h_odms[sp_table];

					// clone page contents
					const {
						rows: a_rows,
						contents: k_contents_update,
					} = await (k_odm as unknown as QueryTable).exportResultsToCxhtml(k_connection, yn_anchor, k_contents);

					// build new page
					const sx_page_update = k_contents_update.toString();

					// nothing changed
					if(sx_page_update === sx_page) {
						// update tables touched
						set_connection_properties(k_connection, {
							tables_touched_count: ++c_tables_touched,
						});
					}
					// something changed
					else {
						c_tables_changed_local += 1;
						sx_page = sx_page_update;
						k_contents = k_contents_update;

						// update tables changed
						set_connection_properties(k_connection, {
							tables_touched_count: ++c_tables_touched,
							tables_changed_count: ++c_tables_changed,
						});
					}
				}

				// nothing changed
				if(!c_tables_changed_local) {
					// update pages touched
					set_connection_properties(k_connection, {
						pages_touched_count: ++c_pages_touched,
					});

					// continue iterating pages
					continue;
				}

				// prepare commit message
				const s_verb = Date.parse(g_version_current.dateTime) < Date.parse(g_version_new.dateTime)? 'Updated': 'Changed';
				const s_message = `
					${s_verb} dataset version of  ${k_connection.label} from ${g_version_current.label} to ${g_version_new.label}
					which affected ${c_tables_changed} tables
				`.replace(/\t/, '').trim();

				// post content
				await k_page.postContent(k_contents, s_message);

				// update pages touched/changed
				set_connection_properties(k_connection, {
					pages_touched_count: ++c_pages_touched,
					pages_changed_count: ++c_pages_changed,
				});
			}

			// set status mode
			set_connection_properties(k_connection, {
				status_mode: G_STATUS.UPDATED,
			});
		};
	}

	async function locate_tables(k_connection: Connection): Promise<PageMap<MmsSparqlQueryTable.Serialized, MmsSparqlQueryTable>> {
		const hm_tables = await g_context.document.findPathTags<MmsSparqlQueryTable.Serialized, MmsSparqlQueryTable>('page#elements.serialized.queryTable', g_context, MmsSparqlQueryTable);
		set_connection_properties(k_connection, {
			tables: hm_tables,
		});
		return hm_tables;
	}

	async function fetch_version_info(k_connection: Connection): Promise<[ModelVersionDescriptor[], ModelVersionDescriptor]> {
		const [a_versions_raw, g_version_current_raw] = await Promise.all([
			k_connection.fetchVersions(),
			k_connection.fetchCurrentVersion(),
		]);

		const a_versions = a_versions_raw.map(g => Object.assign({}, g));
		g_version_current = Object.assign({}, g_version_current_raw);

		a_versions.sort((g_a, g_b) => Date.parse(g_b.dateTime) - Date.parse(g_a.dateTime));

		if(a_versions.length) {
			const g_version_latest = a_versions[0];
			g_version_latest.data = {
				...g_version_latest.data,
				latest: true,
			};

			g_version_latest.label += `
				<span class="ve-tag-pill" style="position:relative; top:-2px;">
					Latest
				</span>
			`;
		}

		const si_version_current = g_version_current.id;
		for(const g_version of a_versions) {
			if(g_version.id === si_version_current) {
				g_version.data = {
					...g_version.data,
					current: true,
				};
				break;
			}
		}

		set_connection_properties(k_connection, {
			status_mode: G_STATUS.CONNECTED,
		});

		return [
			a_versions,
			g_version_current,
		];
	}

	/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
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
					padding-right: 10px;
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

						&.cell-no-border {
							border: none;
						}

						&:nth-child(n-1) {
							padding-right: 14pt;
						}

						--height: 26px;
						--padding: 0;
						// --inputPadding: 0;
						--height: 24px;

						--border: transparent;
						--borderHoverColor: transparent;

						--itemColor: var(--ve-color-dark-text);
						--itemIsActiveColor:  var(--ve-color-dark-text);

						--itemHoverBG: var(--ve-color-medium-light-text);
						// --itemActiveBackground: var(--ve-color-medium-light-text);
						--itemIsActiveBG:  var(--ve-color-light-text);

						--itemPadding: 2px 6px;

						--indicatorTop: 1px;
						--indicatorWidth: 7px;
						--indicatorHeight: 5px;

						:global(.selectContainer) {
							color: var(--ve-color-dark-text);

							display: inline-flex;
							width: fit-content;
							min-width: 260px;
							vertical-align: middle;

							height: 28px;
							border-radius: 0px;
						}

						:global(.selectContainer .listContainer) {
							margin-left: -1px;
							margin-top: -5px;
						}

						:global(.listItem .item) {
							cursor: pointer;
						}

						:global(.listItem>.hover) {
							background-color: var(--ve-color-medium-light-text);
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

						.status {
							vertical-align: middle;

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
				<th>&nbsp;</th>
			</tr>
		</thead>
		<tbody>
			{#each A_CONNECTIONS as k_connection}
				<tr class="data">
					<td>{k_connection.label}</td>
					<td class="cell-version">
						{#await fetch_version_info(k_connection)}
							<Select
								isDisabled={true}
								isClearable={false}
								placeholder="Loading..."
							></Select>
						{:then [a_versions, g_current_version]}
							<Select
								optionIdentifier={'id'}
								value={g_current_version}
								items={a_versions}
								isClearable={false}
								placeholder="Missing Version Information"
								showIndicator={true}
								indicatorSvg={/* syntax: html */ `
									<svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M3.5 4.5L0.468911 0.75L6.53109 0.75L3.5 4.5Z" fill="#333333"/>
									</svg>
								`}
								Item={SelectItem}
								containerStyles={'padding: 0px 40px 0px 6px;'}
								listOffset={7}
								on:select={select_version_for(k_connection)}
							></Select>
						{/await}
					</td>
					<td class="cell-align-center">
						{#await locate_tables(k_connection)}
							Counting...
						{:then h_tags}
							{#key hmw_connections}
								{[...hmw_connections.get(k_connection)?.tables.values() || []].reduce((c_out, h_values) => c_out+Object.values(h_values).length, 0)}
							{/key}
						{/await}
					</td>
					<td class="cell-no-border">
						<!-- bind:this={h_sources[k_connection.path].status_elmt} -->
						{#key hmw_connections}
							{#await hmw_connections.get(k_connection) then g_data}
								{#await g_data?.status_mode then xc_status_mode}
									{#if G_STATUS.CONNECTING === xc_status_mode}
										<span class="status">
											<Fa icon={faCircleNotch} class="fa-spin" />
											<span class="text">
												Connecting...
											</span>
										</span>
									{:else if G_STATUS.CONNECTED === xc_status_mode}
										<!-- no display -->
									{:else if G_STATUS.UPDATING === xc_status_mode}
										<span class="status">
											<Fa icon={faCircleNotch} class="fa-spin" />
											<span class="text">
												{g_data?.tables_touched_count}/{Object.keys(g_data?.tables || {}).length} Updating Tables
											</span>
										</span>
									{:else if G_STATUS.UPDATED === xc_status_mode}
										<span class="status">
											<Fa icon={faCheckCircle} />
											<span class="text">
												{g_data?.tables_touched_count}/{Object.keys(g_data?.tables || {}).length} Tables Updated
											</span>
										</span>
									{/if}
								{/await}
							{/await}
						{/key}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>