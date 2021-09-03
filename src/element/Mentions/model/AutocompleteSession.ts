import { SearcherMask } from '#/common/helper/sparql-code';
import type {QueryRow} from '#/common/types';

import type {VeoPathTarget} from '#/common/veo';

import type {ConnectionQuery} from '#/element/QueryTable/model/QueryTable';

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
	index: number;
	connection: Connection;
	types: SearcherMask;
	limit?: number;
}

export interface SessionConfig {
	g_context: Context;
	channels?: ChannelConfig[];
	ready?: (a_channels: Channel[]) => void;
}

export class AutocompleteSession {
	protected _g_context: Context;
	protected _a_channels: Channel[] = [];
	protected _as_controllers: Set<AbortController> = new Set();

	constructor(gc_session: SessionConfig) {
		const {
			g_context,
		} = gc_session;

		this._g_context = g_context;

		void this.init(gc_session.ready);
	}

	async init(fk_ready: SessionConfig['ready']) {
		const g_context = this._g_context;
		const k_store = g_context.store;
		const h_connections = await k_store.options('document#connection.**', g_context);

		const a_channels = this._a_channels;
		for(const [sp_connection, gc_connection] of ode(h_connections)) {
			switch(gc_connection.type) {
				case 'MmsSparqlConnection': {
					const k_connection = await VeOdm.createFromSerialized(MmsSparqlConnection, sp_connection, gc_connection, g_context);

					// push as separate channels
					a_channels.push({
						index: a_channels.length,
						connection: k_connection,
						types: SearcherMask.ID_EXACT | SearcherMask.ID_START,
						limit: 20,
					});

					a_channels.push({
						index: a_channels.length,
						connection: k_connection,
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

		if(fk_ready) {
			fk_ready(a_channels);
		}
	}

	async update(s_input: string, fk_rows: (g_channel: Channel, a_rows: QueryRow[]) => void): Promise<void> {
		const a_queries: Promise<void>[] = [];

		// each channel
		for(const g_channel of this._a_channels) {
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

				// callback with new rows
				fk_rows(g_channel, a_rows);
			})());
		}

		await Promise.all(a_queries);
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
