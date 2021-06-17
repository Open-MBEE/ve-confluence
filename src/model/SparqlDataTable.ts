import type {
	JSONObject,
    SparqlString,
    Labeled,
    CompareFunction,
} from '../common/types';

import type {
    PresentationElementClass,
    SerializedDataTable,
    DataTable,
} from './DataTable';

import {
    MmsSparqlConnection,
} from './Connection';

import {
    DotFragment,
    resolve_meta_object,
    resolve_meta_object_sync,
} from '../class/meta';

import type { VePath } from '../class/meta';
import { PresentationElement } from './Serializable';

export interface CQueryValue extends JSONObject {
    label: string;
    value: string;
    count: number;
    state: number;
}

export namespace QueryParam {
    export interface Serialized extends JSONObject {
        type: 'QueryParam';
        key: string;
        label: string | null;
        sortPath: VePath.SortFunction | null;
        filter: string | null;
        values: CQueryValue[];
        selected: string[];
    }
}

export class QueryParam extends PresentationElement<QueryParam.Serialized> {
    get sort(): undefined | CompareFunction<Labeled> {
        if(this._gc_serialized.sortPath) {
            return resolve_meta_object_sync<CompareFunction<Labeled>>(this._gc_serialized.sortPath);
        }
    }
}

export interface Header extends JSONObject {
    label: string;
}

export interface QueryType extends JSONObject {
    label: string;
    code: SparqlString;
}

export namespace SparqlDataTable {
    export interface Serialized<Group extends DotFragment=DotFragment> extends SerializedDataTable {
        type: 'SPARQL';
        connectionPath: VePath.SparqlConnection,
        queryTypePath: VePath.SparqlQueryType<Group>,
        parameterPaths: VePath.SparqlQueryParameter<Group>[],
        headersPath: VePath.SparqlQueryHeaders<Group>,
    }
}

export class SparqlDataTable<Group extends DotFragment> extends PresentationElement<SparqlDataTable.Serialized> {
    async getConnection(): Promise<MmsSparqlConnection> {
        const g_serialized = await resolve_meta_object<MmsSparqlConnection.Serialized>(this._gc_serialized.connectionPath);
        return new MmsSparqlConnection(g_serialized);
    }

    get queryType(): QueryType {
        return resolve_meta_object_sync<QueryType>(this._gc_serialized.queryTypePath);
    }

    async getParameters(): Promise<QueryParam[]> {
        return Promise.all(this._gc_serialized.parameterPaths.map(async(sp_parameter) => {
            const gc_query_param = await resolve_meta_object<QueryParam.Serialized>(sp_parameter);
            return new QueryParam(gc_query_param);
        }));
    }

    get headers(): Header[] {
        return resolve_meta_object_sync<Header[]>(this._gc_serialized.headersPath);
    }
}

const SparqlDataTable_Assertion: PresentationElementClass<SparqlDataTable.Serialized> = SparqlDataTable;


