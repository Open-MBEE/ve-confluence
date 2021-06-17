export type SourceKey = 'dng' | 'helix';

import type {
    UrlString,
    SparqlString,
} from '../common/types';

export interface ModelVersionDescriptor {
    id: string;
    label: string;
    dateTime: string;
}

export class Source {
    
}

export interface DataConnection {
    getVersion(): Promise<ModelVersionDescriptor>;
}

export interface SparqlQueryResult {

}

export interface SerializedSparqlDataConnection {
    endpoint: UrlString;
    modelGraph: UrlString;
    metadataGraph: string;
}

export class SparqlDataConnection implements DataConnection {
    private _p_endpoint: UrlString;
    private _p_model_graph: UrlString;
    private _p_metadata_graph: string;

    static fromSerialized(g_serialized: SerializedSparqlDataConnection) {
        return new SparqlDataConnection(g_serialized.endpoint, g_serialized.modelGraph, g_serialized.metadataGraph);
    }

    constructor(p_endpoint: UrlString, p_model_graph: UrlString, p_metadata_graph: UrlString|string|null=null) {
        this._p_endpoint = p_endpoint;
        this._p_model_graph = p_model_graph;

        // metadata graph specified
        if(p_metadata_graph) {
            this._p_metadata_graph = p_metadata_graph;
        }
        // derive from model graph
        else {
            const du_model_graph = new URL(this._p_model_graph);
            const s_project = /\/rdf\/graph\/(Model|Project)\.()(?:\.|$)/.exec(this._p_model_graph);
            this._p_metadata_graph = du_model_graph.origin+`/rdf/graph/Metadata.${s_project}`;
        }
    }

    toSerialized(): SerializedSparqlDataConnection {
        return {
            endpoint: this._p_endpoint,
            modelGraph: this._p_model_graph,
            metadataGraph: this._p_metadata_graph,
        };
    }

    async getVersion(): Promise<ModelVersionDescriptor> {
        const a_rows = await this.execute(`
            select ?commit ?commitDateTime from <${this._p_metadata_graph}> {
                ?snapshot a mms:Snapshot ;
                    mms:graph <${this._p_model_graph}>
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

    async execute(sq_query: SparqlString): SparqlQueryResult {

    }

}
