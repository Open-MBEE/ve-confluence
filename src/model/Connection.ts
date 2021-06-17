import {
    resolve_meta_object,
    resolve_meta_object_sync,
    VePath,
} from '../class/meta';

import type {
    UrlString,
    Hash,
    JSONObject,
} from '../common/types';

import {
    Serializable,
    PresentationElement,
    PresentationElementClass,
} from './Serializable';

export interface SparqlQueryContext extends JSONObject {
    prefixes: Hash;
}

export namespace MmsSparqlConnection {
    export interface Serialized extends Serializable {
        type: 'SparqlConnection';
        endpoint: UrlString;
        modelGraph: UrlString;
        metadataGraph: UrlString;
        contextPath: VePath.SparqlQueryContext;
    }
}

export class MmsSparqlConnection extends PresentationElement<MmsSparqlConnection.Serialized> {
    private _h_prefixes?: Hash;

    get endpoint(): UrlString {
        return this._gc_serialized.endpoint;
    }

    get modelGraph(): UrlString {
        return this._gc_serialized.modelGraph;
    }

    get metadataGraph(): UrlString {
        return this._gc_serialized.metadataGraph;
    }

    get context(): SparqlQueryContext {
        return resolve_meta_object_sync<SparqlQueryContext>(this._gc_serialized.contextPath);
    }

    get prefixes(): Hash {
        return this._h_prefixes || (this._h_prefixes = this.context.prefixes);
    }
}

const MmsSparqlConnection_Assertion: PresentationElementClass<MmsSparqlConnection.Serialized> = MmsSparqlConnection;

