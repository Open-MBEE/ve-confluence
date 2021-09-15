import { H_HARDCODED_OBJECTS } from '#/common/hardcoded';
import { SearcherMask } from '#/common/helper/sparql-code';
import type {QueryRow} from '#/common/types';

import type {VeoPathTarget} from '#/common/veo';

import {ConnectionQuery, QueryField} from '#/element/QueryTable/model/QueryTable';

import {Connection,
	MmsSparqlConnection} from '#/model/Connection';

import {
	Context,
	VeOdm,
	VeOdmConstructor,
} from '#/model/Serializable';

import {ode} from '#/util/belt';

export interface ChannelConfig {
	label: string;
	search: (s_input: string, xm_types?: SearcherMask) => ConnectionQuery;
}

export interface Channel {
	connection_path: VeoPathTarget,
	connection: Connection;
	types: SearcherMask;
	limit?: number;
	hash: string;
}

export interface SessionConfig {
	g_context: Context;
	channels?: ChannelConfig[];
	ready?: (h_channels: Record<string, Channel>) => void;
}

export class AutocompleteSession {
	protected _g_context: Context;
	protected _h_channels: Record<string, Channel> = {};
	protected _a_channels_enabled: Channel[] = [];
	protected _as_controllers: Set<AbortController> = new Set();

	constructor(gc_session: SessionConfig) {
		const {
			g_context,
		} = gc_session;

		this._g_context = g_context;

		void this.init(gc_session.ready);
	}


	protected _add_channel(sp_connection: VeoPathTarget, k_connection: Connection, h_features: {types: SearcherMask; limit: number}): void {
		const si_channel = [
			k_connection.hash(),
			JSON.stringify(h_features),
		].join('\n');

		this._h_channels[si_channel] = {
			connection_path: sp_connection,
			connection: k_connection,
			hash: si_channel,
			...h_features,
		};
	}


	setChannelUse(f_each: (g_channel: Channel) => boolean): void {
		const a_enabled = [];

		for(const g_channel of Object.values(this._h_channels)) {
			if(f_each(g_channel)) {
				a_enabled.push(g_channel);
			}
		}

		this._a_channels_enabled = a_enabled;
	}


	async init(fk_ready: SessionConfig['ready']): Promise<void> {
		const g_context = this._g_context;
		const k_store = g_context.store;
		const h_connections = await k_store.options('document#connection.**', g_context);

		const h_channels = this._h_channels;

		for(const [sp_connection, gc_connection] of ode(h_connections)) {
			switch(gc_connection.type) {
				case 'MmsSparqlConnection': {
					const k_connection = await VeOdm.createFromSerialized(MmsSparqlConnection, sp_connection, gc_connection, g_context);

					// push as separate channels
					this._add_channel(sp_connection, k_connection, {
						types: SearcherMask.ID_EXACT | SearcherMask.ID_START,
						limit: 20,
					});

					this._add_channel(sp_connection, k_connection, {
						types: SearcherMask.NAME_START | SearcherMask.NAME_CONTAINS,
						limit: 50,
					});
					break;
				}

				default: {
					break;
				}
			}
		}

		// enable all channels by default
		this.setChannelUse(() => true);

		if(fk_ready) {
			fk_ready(h_channels);
		}
	}


	async update(s_input: string, fk_rows: (g_channel: Channel, a_rows: QueryRow[]) => void, b_cache=false): Promise<void> {
		const a_queries: Promise<void>[] = [];

		// each channel
		for(const g_channel of this._a_channels_enabled) {
			// construct local storage key
			const si_storage = `ve-autocomplete#${g_channel.hash}:${s_input}`;

			// exists in local storage
			const sx_cache = localStorage.getItem(si_storage);
			if(sx_cache && 'string' === typeof sx_cache) {
				try {
					fk_rows(g_channel, JSON.parse(sx_cache));
					return;
				}
				catch(e_parse) {}
			}

			// ref connection
			const k_connection = g_channel.connection;

			// gen searcher query
			const k_query = k_connection.search(s_input, g_channel.types);

			// paginate
			const sq_query = k_query.paginate(g_channel.limit || 50);

			// no query; skip gracefully
			if(!sq_query) continue;

			// queue a promise for each
			a_queries.push((async() => {
				let d_controller!: AbortController;
				let a_rows!: QueryRow[];
				let b_exit = false;

				// attempt to execute query
				try {
					// and fetch query rows
					a_rows = await k_connection.execute(sq_query, (_d_controller) => {
						// set locally scoped ref to AbortController
						d_controller = _d_controller;

						// add it to instance field
						this._as_controllers.add(d_controller);
					});
				}
				// execution error
				catch(e_execute) {
					// do not throw on abort
					if(e_execute && 'AbortError' !== (e_execute as Error).name) {
						throw e_execute;
					}

					// flag for exit
					b_exit = true;
				}
				// no matter what happens
				finally {
					// delete abort controller
					this._as_controllers.delete(d_controller);
				}

				// exit
				if(b_exit) return;

				// cache
				if(b_cache) {
					localStorage.setItem(si_storage, JSON.stringify(a_rows));
				}

				// callback with new rows
				fk_rows(g_channel, a_rows);
			})());
		}

		await Promise.all(a_queries);
	}

	getChannel(si_channel: string) {
		return this._h_channels[si_channel];
	}

	async fetchItemDetails(si_channel: string, p_item: string) {
		// get connection
		const k_connection = this._h_channels[si_channel].connection;

		// build detailer query
		const k_query = k_connection.detail(p_item);

		// execute query (should only be 1 row)
		const a_rows = await k_connection.execute(k_query.paginate(2));

		const g_item = a_rows[0];

		return {
			idValue: {
				label: 'Requirement ID',
				value: g_item.idValue.value,
			},
			requirementNameValue: {
				label: 'Requirement Name',
				value: g_item.requirementNameValue.value,
			},
			requirementTextValue: {
				label: 'Requirement Text',
				value: g_item.requirementTextValue.value,
			},
		};

		// this._g_context.store.optionsSync('hardcoded#queryField.sparql.dng.**', this._g_context, QueryField);

	}

	abortAll(): number {
		const as_controllers = this._as_controllers;
		const nl_aborted = as_controllers.size;
		for(const d_controller of as_controllers) {
			d_controller.abort();
		}

		as_controllers.clear();
		return nl_aborted;
	}

}
