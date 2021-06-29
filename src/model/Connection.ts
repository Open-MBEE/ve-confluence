import type {VePath} from '../class/object-store';

import type {
	UrlString,
	Hash,
	JSONObject,
	SparqlString,
	QueryRow,
} from '../common/types';

import SparqlEndpoint from '../util/sparql-endpoint';

import {
	Serializable,
	VeOdm,
	VeOrmClass,
} from './Serializable';

export interface ModelVersionDescriptor {
	id: string;
	label: string;
	dateTime: string;
}

export namespace Connection {
	export interface Serialized extends Serializable {
		type: `${'Mms' | 'Plain'}${'Sparql' | 'Vql'}Connection`;
		endpoint: UrlString;
	}
}

export abstract class Connection<
	Serialized extends Connection.Serialized = Connection.Serialized,
> extends VeOdm<Serialized> {
	get endpoint(): UrlString {
		return this._gc_serialized.endpoint;
	}

	abstract getVersion(): Promise<ModelVersionDescriptor>;

	abstract execute(sq_query: string): Promise<QueryRow[]>;
}

export interface SparqlQueryContext extends JSONObject {
	prefixes: Hash;
}

export namespace SparqlConnection {
	export interface Serialized extends Connection.Serialized {
		type: `${'Mms' | 'Plain'}SparqlConnection`;
		endpoint: UrlString;
		contextPath: VePath.SparqlQueryContext;
	}
}

export abstract class SparqlConnection<
	Serialized extends SparqlConnection.Serialized = SparqlConnection.Serialized,
> extends Connection<Serialized> {
	protected _k_endpoint: SparqlEndpoint = <SparqlEndpoint>(<unknown>null);

	protected _h_prefixes?: Hash;

	async init(): Promise<void> {
		await super.init();

		this._k_endpoint = new SparqlEndpoint({
			endpoint: this.endpoint,
			prefixes: this.prefixes,
		});
	}

	get context(): SparqlQueryContext {
		return this._k_store.resolveSync<SparqlQueryContext>(
			this._gc_serialized.contextPath
		);
	}

	get prefixes(): Hash {
		return this._h_prefixes || (this._h_prefixes = this.context.prefixes);
	}
}

export namespace MmsSparqlConnection {
	export interface Serialized extends SparqlConnection.Serialized {
		type: 'MmsSparqlConnection';
		endpoint: UrlString;
		modelGraph: UrlString;
		metadataGraph: UrlString;
		contextPath: VePath.SparqlQueryContext;
	}
}

export class MmsSparqlConnection extends SparqlConnection<MmsSparqlConnection.Serialized> {
	get modelGraph(): UrlString {
		return this._gc_serialized.modelGraph;
	}

	get metadataGraph(): UrlString {
		return this._gc_serialized.metadataGraph;
	}

	async getVersion(): Promise<ModelVersionDescriptor> {
		const a_rows = await this.execute(`
            select ?commit ?commitDateTime from <${this.metadataGraph}> {
                ?snapshot a mms:Snapshot ;
                    mms:graph <${this.modelGraph}> ;
                    mms:materializes/mms:commit ?commit ;
                    .
                
                ?commit a mms:Commit ;
                    mms:submitted ?dateTime ;
                    .
            }
        `);

		// failed to match pattern
		if (!a_rows.length) {
			// run diagnostic queries

			return {
				id: 'null',
				label: 'Unknown date/time',
				dateTime: 'Unknown date/time',
			};
		}
		// matched
		else {
			const {
				commit: {value: p_commit},
				commitDateTime: {value: s_datetime},
			} = a_rows[0];

			return {
				id: p_commit,
				label: new URL(p_commit).pathname.replace(/[^/]*\//g, ''),
				dateTime: s_datetime,
			};
		}
	}

	async execute(sq_query: SparqlString): Promise<QueryRow[]> {
		return await this._k_endpoint.select(sq_query);
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MmsSparqlConnection_Assertion: VeOrmClass<MmsSparqlConnection.Serialized> = MmsSparqlConnection;
