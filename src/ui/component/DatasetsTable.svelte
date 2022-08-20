<script context="module" lang="ts">

	export interface ModalContext {
		open: (dc_component: any, g_props?: any, g_options?: any, g_callbacks?: any) => void;
		close: () => void;
	}

</script>
<script lang="ts">

	import {
		Connection,
		connectionHasVersioning,
		Mms5Connection,
	} from '#/model/Connection';

	import type {
		ModelVersionDescriptor,
	} from '#/model/Connection';

	import type {
		Context,
	} from '#/model/Serializable';

	import {
		VeOdm,
	} from '#/model/Serializable';
import {
	ObjectStore
} from '#/model/ObjectStore';

	import {
		faCheckCircle,
		faCircleNotch,
	} from '@fortawesome/free-solid-svg-icons';

	import Fa from 'svelte-fa';

	import Modal from 'svelte-simple-modal';

	import ContextDummy from './ContextDummy.svelte';
	// import {bind} from 'svelte-simple-modal';

	import {
		ConfluencePage,
	} from '#/vendor/confluence/module/confluence';
	import XhtmlDocument, {XHTMLDocument} from '#/vendor/confluence/module/xhtml-document';

	import type {PageMap} from '#/vendor/confluence/module/confluence';

	import {
		MmsSparqlQueryTable,
		QueryTable,
	} from '#/element/QueryTable/model/QueryTable';


	import UpdateDatasetConfirmation from './UpdateDatasetConfirmation.svelte';


	type CustomDataProperties = {
		status_mode: G_STATUS;
		tables: PageMap<MmsSparqlQueryTable.Serialized, MmsSparqlQueryTable>;
		tables_touched_count: number;
		tables_changed_count: number;
		pages_touched_count: number;
		pages_changed_count: number;
	};

	export let g_context: Context;
	export let b_read_only = false;
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

	let dm_warning: HTMLDivElement;

	// initialize connections
	let A_CONNECTIONS: Connection[] = [];
	(async() => {
		const h_connections = await k_object_store.options<Connection.Serialized>('document#connection.**', g_context);
		for(const sp_connection in h_connections) {
			const gc_connection = (h_connections as Record<string, Connection.Serialized>)[sp_connection];
			switch(gc_connection.type) {
				case 'Mms5Connection': {
					const k_connection = await VeOdm.createFromSerialized(
						Mms5Connection,
						sp_connection,
						gc_connection as Mms5Connection.Serialized, g_context
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


	let g_modal_context: ModalContext;

	function modal_context_acquired(d_event: CustomEvent<ModalContext>) {
		g_modal_context = d_event.detail;
	}

	// for preventing the browser window from being closed during asynchronous data operations
	const f_cancel_unload = (d_event_before_unload: BeforeUnloadEvent) => {
		d_event_before_unload.preventDefault();
		d_event_before_unload.returnValue = '';
	};

	function select_version_for(k_connection: Connection) {
		return function select_version(d_event) {

		(k_connection as Mms5Connection).fetchLatestVersion().then((g_version_new) => {
			// open confirmation modal
			g_modal_context.open(UpdateDatasetConfirmation, {
				g_modal_context,
				k_connection,
				g_version: g_version_new,
				hm_tables: hmw_connections.get(k_connection)?.tables,

				// upon confirmation
				async confirm() {
					// unsaved changes tab close
					window.addEventListener('beforeunload', f_cancel_unload);

					// apply changes
					try {
						await change_version(k_connection, g_version_new);
						window.removeEventListener('beforeunload', f_cancel_unload);
						location.reload();
					}
					// catch error
					catch(e_change) {
						// render to warning
						dm_warning.style.visibility = 'visible';
						dm_warning.innerHTML = `<b>Error</b>: ${k_connection.label} could not be published. Please contact CAE for assistance. Error details:`
							+`<code style="white-space:pre;">${(e_change as Error).stack?.replace(/</g, '&lt;') || (e_change as Error).toString()}</code>`;
					}

					// remove listener
					window.removeEventListener('beforeunload', f_cancel_unload);
				},

				// upon cancellation
				cancel() {
				},
			}, {
				styleWindowWrap: {
					marginLeft: 'auto',
					marginRight: 'auto',
					maxWidth: '450px',
				},
				styleWindow: {
					backgroundColor: 'var(--ve-color-dark-background)',
					color: 'var(--ve-color-light-text)',
					borderRadius: '4px',
					border: '2px solid var(--ve-color-darker-background)',
					boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
				},
				styleContent: {
					padding: '0',
				},
				styleCloseButton: {
					display: 'none',
				},
			});
		});
		}
	}

	async function change_version(k_connection: Connection, g_version_new: ModelVersionDescriptor) {
		// show warning
		dm_warning.style.visibility = 'visible';
		dm_warning.innerText = 'Do not close this webpage until updates are complete.';
	
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

		// make new branch
		const newrefname = '/locks/' + g_version_new.dateTime.replace(/:/g, '_');
		const exists = await (k_connection as Mms5Connection).refExists(newrefname);
		if (!exists) {
			await (k_connection as Mms5Connection).makeLatest(newrefname);
		}
		// create new connection from existing
		const k_connection_new: Connection = await k_connection.clone({ref:newrefname});

		// save to document
		await k_connection_new.save();

		// each page
		const hm_tables = g_data.tables;
		for(const [g_page, h_odms] of hm_tables) { //don't use h_odms here, reinstantiate them, otherwise node replacement won't work because the anchor and doc aren't connected
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
			// started copy some lines from ConfluenceDocument.findPathTags
			let k_store_page = g_context.store;
			if(g_context.page.pageId !== g_page.id) {
				k_store_page = new ObjectStore({
					page: new ConfluencePage(g_page.id, g_page.title),
				});
			}
			const k_doc = new XHTMLDocument(sx_page);
			const sq_select = `//ac:parameter[@ac:name="id"][starts-with(text(),"page#elements.serialized.queryTable")]`;
			const a_parameters = k_doc.select(sq_select) as Node[];  // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
			// TODO do the same for transclusions

			for(const ym_param of a_parameters) { //tables
				const sp_element = ym_param.textContent!;

				const gc_serialized = await ('page' === ObjectStore.locationPart(sp_element)? k_store_page: g_context.store).resolve(sp_element);
				let k_odm = await VeOdm.createFromSerialized<Serialized, InstanceType>(MmsSparqlQueryTable, sp_element, gc_serialized as unknown as Serialized, g_context);
				let yn_anchor = ym_param.parentNode!;
				// clone page contents
				const {
					rows: a_rows,
					contents: k_contents_update,
				} = await (k_odm as unknown as QueryTable).exportResultsToCxhtml(k_connection_new, yn_anchor, k_doc);

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

			// prepare commit message //update
			const s_verb = Date.parse(g_version_current.dateTime) < Date.parse(g_version_new.dateTime)? 'Updated': 'Changed';
			const s_message = `
				${s_verb} dataset version of  ${k_connection.label} from ${g_version_current.dateTime} to ${g_version_new.dateTime}
				which affected ${c_tables_changed} tables
			`.replace(/\t/, '').trim();

			// post content
			const g_response = await k_page.postContent(k_contents, s_message);

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

		// hide warning
		dm_warning.style.visibility = 'hidden';
		dm_warning.innerHTML = '&nbsp;';
	}

	async function locate_tables(k_connection: Connection): Promise<PageMap<MmsSparqlQueryTable.Serialized, MmsSparqlQueryTable>> {
		const hm_tables = await g_context.document.findPathTags<MmsSparqlQueryTable.Serialized, MmsSparqlQueryTable>('page#elements.serialized.queryTable', g_context, MmsSparqlQueryTable);
		set_connection_properties(k_connection, {
			tables: hm_tables,
		});
		return hm_tables;
	}

	async function fetch_version_info(k_connection: Connection): Promise<[ModelVersionDescriptor, ModelVersionDescriptor, string, string, string]> {
		if(!connectionHasVersioning(k_connection)) {
			throw new Error(`Connection does not support versioning`);
		}
		const g_version_current_raw = await k_connection.fetchCurrentVersion();
		g_version_current = Object.assign({}, g_version_current_raw);
		const g_version_latest = await k_connection.fetchLatestVersion();
	
		set_connection_properties(k_connection, {
			status_mode: G_STATUS.CONNECTED,
		});

			// parse datetime string
		let dt_version = new Date(g_version_latest.dateTime);
		let dt_version_current = new Date(g_version_current_raw.dateTime);
			// update display version
		let s_latest_display = `${dt_version.toDateString()} @${dt_version.toLocaleTimeString()}`;
		let s_current_display = `${dt_version_current.toDateString()} @${dt_version_current.toLocaleTimeString()}`;
		return [
			g_version_current,
			g_version_latest,
			k_connection.hash(),
			s_current_display,
			s_latest_display,
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

						--disabledColor: var(--ve-color-medium-text);

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

	.warning {
		color: var(--ve-color-error-red);
		font-size: 14px;
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
							&nbsp; Loading...
						{:then [g_current_version, g_latest_version, s_hash, s_current_version, s_latest_version]}
						    &nbsp; {s_current_version} &nbsp; <button disabled={g_current_version.dateTime === g_latest_version.dateTime} on:click="{select_version_for(k_connection)}">Update to Latest</button> &nbsp;
						<!-- bind:this={h_selects['@'+s_hash]} -->
						{/await}

						<Modal>
							<ContextDummy on:acquire={modal_context_acquired} />
						</Modal>
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
												{g_data?.tables_touched_count}/{g_data?.tables.size} Updating Tables
											</span>
										</span>
									{:else if G_STATUS.UPDATED === xc_status_mode}
										<span class="status">
											<Fa icon={faCheckCircle} />
											<span class="text">
												{g_data?.tables_touched_count}/{g_data?.tables.size} Tables Updated
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

<div class="warning" style="visibility:hidden;" bind:this={dm_warning}>
	&nbsp;
</div>