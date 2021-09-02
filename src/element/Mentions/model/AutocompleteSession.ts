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
	search: (s_input: string) => ConnectionQuery;
}

export interface SessionConfig {
	g_context: Context;
	channels?: ChannelConfig[];
}

export class AutocompleteSession {
	protected _g_context: Context;
	protected _a_channels: Connection[] = [];

	constructor(gc_session: SessionConfig) {
		const {
			g_context,
		} = gc_session;

		this._g_context = g_context;

		void this.init();
	}

	async init() {
		const g_context = this._g_context;
		const k_store = g_context.store;
		const h_connections = await k_store.options('document#connection.**', g_context);

		const a_channels = this._a_channels;
		for(const [sp_connection, gc_connection] of ode(h_connections)) {
			switch(gc_connection.type) {
				case 'MmsSparqlConnection': {
					const k_connection = await VeOdm.createFromSerialized(MmsSparqlConnection, sp_connection, gc_connection, g_context);

					a_channels.push(k_connection);
					break;
				}

				default: {
					break;
				}
			}
		}
	}

	async update(s_input: string, fk_rows: (k_connection: Connection, a_rows: QueryRow[]) => void) {
		const a_queries: Promise<void>[] = [];

		for(const k_connection of this._a_channels) {
			const k_query = k_connection.search(s_input);
			const sq_query = k_query.paginate(50);
			a_queries.push((async() => {
				const a_rows = await k_connection.execute(sq_query);
				fk_rows(k_connection, a_rows);
			})());
		}

		await Promise.all(a_queries);
	}
}
