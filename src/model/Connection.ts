import type {
	VeoPathTarget,
} from '#/common/veo';

import type {
	UrlString,
	Hash,
	JsonObject,
	SparqlString,
	QueryRow,
	TypedLabeledObject,
} from '#/common/types';

import SparqlEndpoint, {
	SparqlSelectQuery,
} from '../util/sparql-endpoint';

import {
	VeOdmLabeled,
    VeOrmClass,
} from './Serializable';

import type {ConnectionQuery} from '#/element/QueryTable/model/QueryTable';

import type {SearcherMask} from '#/common/helper/sparql-code';

import {
	process,
} from '#/common/static';

import * as jose from 'jose';
export interface ModelVersionDescriptor {
	id: string;
	label: string;
	dateTime: string;
	data?: Record<string, boolean | number | string>;
	modify?: Partial<Mms5Connection.Serialized>;
}

export namespace Connection {
	type DefaultType = `${'Mms' | 'Plain'}${'Sparql' | 'Vql' | '5'}Connection`;

	export interface Serialized<TypeString extends DefaultType=DefaultType> extends TypedLabeledObject<TypeString> {
		endpoint: UrlString;
		alias?: string;
	}
}

export abstract class Connection<
	Serialized extends Connection.Serialized=Connection.Serialized,
> extends VeOdmLabeled<Serialized> {
	get endpoint(): UrlString {
		return this._gc_serialized.endpoint;
	}

	get alias(): string {
		return this._gc_serialized.alias || this.label;
	}

	abstract execute(sq_query: string, fk_controller?: (d_controller: AbortController) => void): Promise<QueryRow[]>;

	abstract search(s_input: string, xm_types?: SearcherMask): ConnectionQuery;

	abstract detail(p_item: string): ConnectionQuery;
}


export interface SparqlQueryContext extends JsonObject {
	prefixes: Hash;
}

export namespace SparqlConnection {
	type DefaultType = `${'Mms5' | 'MmsSparql' | 'PlainSparql'}Connection`;

	export interface Serialized<TypeString extends DefaultType=DefaultType> extends Connection.Serialized<TypeString> {
		endpoint: UrlString;
		contextPath: VeoPathTarget;
		searchPath: VeoPathTarget;
		detailPath: VeoPathTarget;
	}
}

export interface VersionedConnection extends Connection {
	fetchCurrentVersion(): Promise<ModelVersionDescriptor>;

	fetchVersions(): Promise<ModelVersionDescriptor[]>;
}

export function connectionHasVersioning(k_connection: Connection): k_connection is VersionedConnection {
	return !!(k_connection as VersionedConnection).fetchVersions;
}

export type SparqlSearcher = (this: SparqlConnection, s_input: string, xm_types?: SearcherMask) => SparqlSelectQuery;

export type SparqlDetailer = (this: SparqlConnection, p_item: string) => SparqlSelectQuery;

export abstract class SparqlConnection<
	Serialized extends SparqlConnection.Serialized=SparqlConnection.Serialized,
> extends Connection<Serialized> {
	protected _k_endpoint!: SparqlEndpoint;
	protected _f_searcher!: SparqlSearcher;
	protected _f_detailer!: SparqlDetailer;

	protected _h_prefixes?: Hash;

	initSync(): void {
		this._k_endpoint = new SparqlEndpoint({
			endpoint: this.endpoint,
			prefixes: this.prefixes,
		});

		this._f_searcher = this._k_store.resolveSync(this._gc_serialized.searchPath) as unknown as SparqlSearcher;
		this._f_detailer = this._k_store.resolveSync(this._gc_serialized.detailPath) as unknown as SparqlDetailer;

		return super.initSync();
	}

	get context(): SparqlQueryContext {
		return this._k_store.resolveSync(this._gc_serialized.contextPath) as unknown as SparqlQueryContext;
	}

	get prefixes(): Hash {
		return this._h_prefixes || (this._h_prefixes = this.context.prefixes);
	}

	search(s_input: string, xm_types?: SearcherMask): SparqlSelectQuery {
		return this._f_searcher(s_input, xm_types);
	}

	detail(p_item: string): SparqlSelectQuery {
		return this._f_detailer(p_item);
	}
}

export namespace PlainSparqlConnection {
	export interface Serialized extends SparqlConnection.Serialized<'PlainSparqlConnection'> {
		endpoint: UrlString;
		graph: UrlString;
		contextPath: VeoPathTarget;
	}
}

export namespace MmsSparqlConnection {
	export interface Serialized extends SparqlConnection.Serialized<'MmsSparqlConnection'> {
		endpoint: UrlString;
		modelGraph: UrlString;
		metadataGraph: UrlString;
		contextPath: VeoPathTarget;
	}
}

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

	async execute(sq_query: SparqlString, fk_controller?: (d_controller: AbortController) => void): Promise<QueryRow[]> {
		return await this._k_endpoint.select(sq_query, fk_controller);
	}
}

export class MmsSparqlConnection extends SparqlConnection<MmsSparqlConnection.Serialized> implements VersionedConnection {
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

	async execute(sq_query: SparqlString, fk_controller?: (d_controller: AbortController) => void): Promise<QueryRow[]> {
		return await this._k_endpoint.select(sq_query, fk_controller);
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MmsSparqlConnection_Assertion: VeOrmClass<MmsSparqlConnection.Serialized> = MmsSparqlConnection;

export namespace Mms5Connection {
	export interface Serialized extends SparqlConnection.Serialized<'Mms5Connection'> {
		org: string;
        repo: string;
        ref: string;
	}
}
export class Mms5Connection extends SparqlConnection<Mms5Connection.Serialized> implements VersionedConnection {
    protected _token = '';
	initSync(): void {
		this._k_endpoint = new SparqlEndpoint({
			endpoint: `${this.endpoint}/orgs/${this._gc_serialized.org}/repos/${this._gc_serialized.repo}/branches/${this._gc_serialized.ref}/query`,
			prefixes: this.prefixes,
		});

		this._f_searcher = this._k_store.resolveSync(this._gc_serialized.searchPath) as unknown as SparqlSearcher;
		this._f_detailer = this._k_store.resolveSync(this._gc_serialized.detailPath) as unknown as SparqlDetailer;
        if (!this._token) {
            this._token = '';
        }
	}

    async init(): Promise<void> {
        if (this._token !== '') {
            this._k_endpoint.setAuth(this._token);
            return;
        }
		if (window.sessionStorage.getItem('ve4-mms5token')) {
			this._token = window.sessionStorage.getItem('ve4-mms5token');
			const claims = jose.decodeJwt(this._token);
			//check if token expired
			if (claims.exp && claims.exp > Date.now()/1000) {
				this._k_endpoint.setAuth(this._token);
            	return;
			}
			console.log('mms5 token expired');
		}
		const res = await fetch(`${this.endpoint}/login`, {
            method: 'GET',
            mode: 'cors',
            headers: {Authorization:`Basic ${process.env.MMS5BASIC}`},
        });
        const token: string = (await res.json()).token;
        this._token = token;
        this._k_endpoint.setAuth(token);
		window.sessionStorage.setItem('ve4-mms5token', this._token);
    }

	async execute(sq_query: SparqlString, fk_controller?: (d_controller: AbortController) => void): Promise<QueryRow[]> {
		return await this._k_endpoint.select(sq_query, fk_controller);
	}

	async fetchVersionForRef(ref: string): Promise<ModelVersionDescriptor> {
		const d_res = await fetch(`${this.endpoint}/orgs/${this._gc_serialized.org}/repos/${this._gc_serialized.repo}/query`, {
			method: 'POST',
			mode: 'cors',
			headers: {
				'Content-Type': 'application/sparql-query',
				'Accept': 'application/sparql-results+json',
				'Authorization': `Bearer ${this._token}`,
			},
			body: `select  ?time  where {
				?branch mms:id "${ref}" .
				?branch mms:commit ?commit .
				?commit mms:submitted  ?time
			} 
			`,
		});
		
		// response not ok
		if(!d_res.ok) {
			throw new Error(
				`MMS Metadata query response not OK: '''\n${await d_res.text()}\n'''`
			);
		}

		// parse results as JSON
		const g_res = (await d_res.json()) as {
			results: {
				bindings: SparqlBindings;
			};
		};
		return {
            id: ref,
            label: `${this._gc_serialized.label}`,
            dateTime: `${g_res.results.bindings[0].time.value}`,
            modify: {
                ref: ref,
            },
        };
	}
    async fetchCurrentVersion(): Promise<ModelVersionDescriptor> {
		return this.fetchVersionForRef(this._gc_serialized.ref);
	}

	async fetchLatestVersion(): Promise<ModelVersionDescriptor> {
		return this.fetchVersionForRef('main');
	}
	async fetchVersions(): Promise<ModelVersionDescriptor[]> {
        await fetch('');
		return [{
            id: this._gc_serialized.ref,
            label: 's_label',
            dateTime: 's_datetime',
            modify: {
                ref: this._gc_serialized.ref,
            },
        }];
	}

    async makeLatest(ref: string): Promise<ModelVersionDescriptor> {
        await fetch(`${this.endpoint}/orgs/${this._gc_serialized.org}/repos/${this._gc_serialized.repo}/branches/${ref}`, {
			method: 'PUT',
			mode: 'cors',
			headers: {Authorization:`Bearer ${this._token}`},
            body: `
                <>
                    mms:ref <./main> ;
                    dct:title "latest"@en ;
                    .
            `,
		});
        return {
            id: ref,
            label: 's_label',
            dateTime: 's_datetime',
            modify: {
                ref: ref,
            },
        };
    }

}