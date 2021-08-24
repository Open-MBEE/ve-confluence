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
	VeOdmLabeled,
	VeOrmClass,
} from './Serializable';

export interface ModelVersionDescriptor {
	id: string;
	label: string;
	dateTime: string;
	data?: Record<string, boolean | number | string>;
	modify?: Partial<MmsSparqlConnection.Serialized>;
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

	// abstract fetchVersions(): Promise<ModelVersionDescriptor[]>;

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
	protected _k_endpoint!: SparqlEndpoint;

	protected _h_prefixes?: Hash;

	initSync(): void {
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

export namespace PlainSparqlConnection {
	export interface Serialized extends SparqlConnection.Serialized<'PlainSparqlConnection'> {
		endpoint: UrlString;
		graph: UrlString;
		contextPath: VeoPath.SparqlQueryContext;
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

const dt_now = new Date();
const dt_old = new Date(dt_now.getTime() - (48*60*60*1e3));
const date_format = (dt: Date): string => dt.toDateString().replace(/^\w+\s+/, '').replace(/(\d+)\s+/, '$1, ');

const G_DUMMY_VERSION_LATEST = {
	id: 'dummy-latest-commit-id',
	label: date_format(dt_now),
	dateTime: dt_now.toISOString(),
};

const G_DUMMY_VERSION_CURRENT = {
	id: 'dummy-current-commit-id',
	label: date_format(dt_old),
	dateTime: dt_old.toISOString(),
};

interface CommitResult {
	modelGraph: {
		value: `https://${string}`;
	};
	commit: {
		value: string;
	};
	commitDateTime: {
		value: string;
	};
}

function commit_result_to_model_version(g_result: CommitResult): ModelVersionDescriptor {
	const {
		modelGraph: {value:p_model},
		commit: {value:p_commit},
		commitDateTime: {value:s_datetime},
	} = g_result;

	const dt_commit = new Date(s_datetime);

	// format datetime
	const s_label = Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		weekday: 'short',
		month: 'short',
		day: '2-digit',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
		formatMatcher: 'basic',
	}).format(dt_commit);

	return {
		id: p_commit,
		label: s_label,
		dateTime: s_datetime,
		modify: {
			modelGraph: p_model,
		},
	};
}

export class PlainSparqlConnection extends SparqlConnection<PlainSparqlConnection.Serialized> {
	get graph(): UrlString {
		return this._gc_serialized.graph;
	}

	async execute(sq_query: SparqlString): Promise<QueryRow[]> {
		return await this._k_endpoint.select(sq_query);
	}

	fetchCurrentVersion(): Promise<ModelVersionDescriptor> {
		return Promise.resolve({
			id: 'null',
			label: 'Unknown date/time',
			dateTime: 'Unknown date/time',
		});
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
			select ?modelGraph ?commit ?commitDateTime from <${this.metadataGraph}> {
				?snapshot a mms:Snapshot ;
					mms:modelGraph ?modelGraph ;
					mms:materializes ?commit ;
					.

				?commit a mms:Commit ;
					mms:submitted ?commitDateTime ;
					.

				values ?modelGraph {
					<${this.modelGraph}>
				}
			}
		`) as unknown as CommitResult[];

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
			return commit_result_to_model_version(a_rows[0]);
		}
	}

	async fetchVersions(): Promise<ModelVersionDescriptor[]> {
		const a_rows = await this.execute(`
			select ?modelGraph ?commit ?commitDateTime from <${this.metadataGraph}> {
				?snapshot a mms:Snapshot ;
					mms:materializes ?commit ;
					mms:modelGraph ?modelGraph ;
					.

				?commit a mms:Commit ;
					mms:submitted ?commitDateTime ;
					.
			}
		`) as unknown as CommitResult[];

		// failed to match pattern
		if(!a_rows.length) {
			// TODO: run diagnostic queries
			return [];
		}
		// matched
		else {
			return a_rows.map(commit_result_to_model_version);
		}
	}

	async execute(sq_query: SparqlString): Promise<QueryRow[]> {
		return await this._k_endpoint.select(sq_query);
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MmsSparqlConnection_Assertion: VeOrmClass<MmsSparqlConnection.Serialized> = MmsSparqlConnection;
