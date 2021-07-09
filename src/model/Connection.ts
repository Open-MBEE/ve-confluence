import type {VeoPath} from '#/common/veo';

import type {
	UrlString,
	Hash,
	JsonObject,
	SparqlString,
	QueryRow,
	TypedLabeledObject,
} from '#/common/types';

import SparqlEndpoint from '../util/sparql-endpoint';

import {
	Serializable,
	VeOdm,
	VeOdmLabeled,
	VeOrmClass,
} from './Serializable';

export interface ModelVersionDescriptor {
	id: string;
	label: string;
	dateTime: string;
}

export namespace Connection {
	type DefaultType = `${'Mms' | 'Plain'}${'Sparql' | 'Vql'}Connection`;

	export interface Serialized<TypeString extends DefaultType=DefaultType> extends TypedLabeledObject<TypeString> {
		endpoint: UrlString;
	}
}

export abstract class Connection<
	Serialized extends Connection.Serialized=Connection.Serialized,
> extends VeOdmLabeled<Serialized> {
	get endpoint(): UrlString {
		return this._gc_serialized.endpoint;
	}

	abstract fetchCurrentVersion(): Promise<ModelVersionDescriptor>;

	abstract fetchVersions(): Promise<ModelVersionDescriptor[]>;

	abstract execute(sq_query: string): Promise<QueryRow[]>;
}


export interface SparqlQueryContext extends JsonObject {
	prefixes: Hash;
}

export namespace SparqlConnection {
	type DefaultType = `${'Mms' | 'Plain'}SparqlConnection`;

	export interface Serialized<TypeString extends DefaultType=DefaultType> extends Connection.Serialized<TypeString> {
		endpoint: UrlString;
		contextPath: VeoPath.SparqlQueryContext;
	}
}

export abstract class SparqlConnection<
	Serialized extends SparqlConnection.Serialized=SparqlConnection.Serialized,
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
		return this._k_store.resolveSync<SparqlQueryContext>(this._gc_serialized.contextPath);
	}

	get prefixes(): Hash {
		return this._h_prefixes || (this._h_prefixes = this.context.prefixes);
	}
}

export namespace MmsSparqlConnection {
	export interface Serialized extends SparqlConnection.Serialized<'MmsSparqlConnection'> {
		endpoint: UrlString;
		modelGraph: UrlString;
		metadataGraph: UrlString;
		contextPath: VeoPath.SparqlQueryContext;
	}
}

export class MmsSparqlConnection extends SparqlConnection<MmsSparqlConnection.Serialized> {
	get modelGraph(): UrlString {
		return this._gc_serialized.modelGraph;
	}

	get metadataGraph(): UrlString {
		return this._gc_serialized.metadataGraph;
	}

	async fetchCurrentVersion(): Promise<ModelVersionDescriptor> {
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
		if(!a_rows.length) {
			// TODO: run diagnostic queries
			return {
				id: 'null',
				label: 'Unknown date/time',
				dateTime: 'Unknown date/time',
			};
		}
		// matched
		else {
			const {
				commit: {value:p_commit},
				commitDateTime: {value:s_datetime},
			} = a_rows[0];

			return {
				id: p_commit,
				label: new URL(p_commit).pathname.replace(/[^/]*\//g, ''),
				dateTime: s_datetime,
			};
		}
	}

	async fetchVersions(): Promise<ModelVersionDescriptor[]> {
		const a_rows = await this.execute(`
			select ?commit ?commitDateTime from <${this.metadataGraph}> {
				?snapshot a mms:Snapshot ;
					mms:materializes/mms:commit ?commit ;
					mms:graph ?modelGraph ;
					.

				?commit a mms:Commit ;
					mms:submitted ?dateTime ;
					.
			}
		`);

		// failed to match pattern
		if(!a_rows.length) {
			// TODO: run diagnostic queries
			return [];
		}
		// matched
		else {
			return a_rows.map((g_row) => {
				const {
					commit: {value:p_commit},
					commitDateTime: {value:s_datetime},
				} = g_row;

				return {
					id: g_row.commit.value,
					label: new URL(p_commit).pathname.replace(/[^/]*\//g, ''),
					dateTime: s_datetime,
				};
			});
		}
	}

	async execute(sq_query: SparqlString): Promise<QueryRow[]> {
		return await this._k_endpoint.select(sq_query);
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MmsSparqlConnection_Assertion: VeOrmClass<MmsSparqlConnection.Serialized> = MmsSparqlConnection;
