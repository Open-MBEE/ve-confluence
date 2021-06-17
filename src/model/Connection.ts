import {
    resolve_meta_object,
    resolve_meta_object_sync,
    VePath,
} from '../class/meta';

import type {
    UrlString,
    Hash,
    JSONObject,
    SparqlString,
    SparqlBindings,
} from '../common/types';

import SparqlEndpoint from '../util/sparql-endpoint';

import {
    Serializable,
    PresentationElement,
    PresentationElementClass,
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

export abstract class Connection<Serialized extends Connection.Serialized=Connection.Serialized> extends PresentationElement<Serialized> {
    get endpoint(): UrlString {
        return this._gc_serialized.endpoint;
    }

    abstract getVersion(): Promise<ModelVersionDescriptor>;
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

export abstract class SparqlConnection<Serialized extends SparqlConnection.Serialized=SparqlConnection.Serialized> extends Connection<Serialized> {
    protected _k_endpoint: SparqlEndpoint = <SparqlEndpoint><unknown>null;
    protected _h_prefixes?: Hash;

    init() {
        this._k_endpoint = new SparqlEndpoint({
            endpoint: this.endpoint,
            prefixes: this.prefixes,
        });
    }

    get context(): SparqlQueryContext {
        return resolve_meta_object_sync<SparqlQueryContext>(this._gc_serialized.contextPath);
    }

    get prefixes(): Hash {
        return this._h_prefixes || (this._h_prefixes = this.context.prefixes);
    }
}


export namespace MmsSparqlConnection {
    export interface Serialized extends Connection.Serialized {
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
                    mms:graph <${this.modelGraph}>
                    mms:materializes/mms:commit ?commit ;
                    .
                
                ?commit a mms:Commit ;
                    mms:submitted ?dateTime ;
                    .
            }
        `);

        // failed to match pattern
        if(!a_rows.length) {
            // run diagnostic queries

            return null;
        }
        // matched
        else {
            const {
                commit: {value: p_commit},
                commitDateTime: {value: s_datetime},
            } = a_rows[0];

            return {
                id: p_commit,
                label: (new URL(p_commit)).pathname.replace(/[^/]*\//g, ''),
                dateTime: s_datetime,
            };
        }
    }


    async execute(sq_query: SparqlString): Promise<SparqlBindings> {
        return await this._k_endpoint.select(sq_query);
    }
}

const MmsSparqlConnection_Assertion: PresentationElementClass<MmsSparqlConnection.Serialized> = MmsSparqlConnection;

