import type {
	JSONObject,
    SparqlString,
    Labeled,
    CompareFunction,
    DotFragment,
} from '../common/types';

import type {
    VePath,
} from '../class/meta';

import {
    Serializable,
    PresentationElement,
    PresentationElementClass,
} from './Serializable';

import {
    resolve_meta_object,
    resolve_meta_object_sync,
} from '../class/meta';

import {
    Connection,
    SparqlConnection,
    MmsSparqlConnection,
} from './Connection';


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

export namespace QueryTable {
    export interface Serialized extends Serializable {
        type: `${`${'Mms'}Sparql` | `${'Plain'}Vql`}QueryTable`;
        // connectionPath: VePath.Connection,
        // queryTypePath: VePath.QueryType,
        // parameterPaths: VePath.QueryParameter[],
        // headersPath: VePath.QueryHeaders[],
    }
}

export abstract class QueryTable<Serialized extends QueryTable.Serialized=QueryTable.Serialized> extends PresentationElement<Serialized> {
    abstract getConnection(): Promise<Connection>;

    abstract get queryType(): QueryType;

    abstract getParameters(): Promise<QueryParam[]>;

    abstract get headers(): Header[];
}



export namespace SparqlQueryTable {
    export interface Serialized<Group extends DotFragment=DotFragment> extends QueryTable.Serialized {
        type: `${'Mms'}SparqlQueryTable`;
        connectionPath: VePath.SparqlConnection,
        queryTypePath: VePath.SparqlQueryType<Group>,
        parameterPaths: VePath.SparqlQueryParameter<Group>[],
        headersPath: VePath.SparqlQueryHeaders<Group>,
    }
}

export abstract class SparqlQueryTable<Serialized extends SparqlQueryTable.Serialized> extends QueryTable<Serialized> {
    abstract getConnection(): Promise<SparqlConnection>;

    abstract get queryType(): QueryType;

    async getParameters(): Promise<QueryParam[]> {
        return Promise.all(this._gc_serialized.parameterPaths.map(async(sp_parameter) => {
            const gc_query_param = await resolve_meta_object<QueryParam.Serialized>(sp_parameter);
            return new QueryParam(gc_query_param, this._g_context);
        }));
    }

    get headers(): Header[] {
        return resolve_meta_object_sync<Header[]>(this._gc_serialized.headersPath);
    }
}



export namespace MmsSparqlQueryTable {
    export interface Serialized<Group extends DotFragment=DotFragment> extends SparqlQueryTable.Serialized<Group> {
        type: 'MmsSparqlQueryTable';
    }
}

export class MmsSparqlQueryTable<Group extends DotFragment=DotFragment> extends SparqlQueryTable<MmsSparqlQueryTable.Serialized<Group>> {
    async getConnection(): Promise<MmsSparqlConnection> {
        const g_serialized = await resolve_meta_object<MmsSparqlConnection.Serialized>(this._gc_serialized.connectionPath);
        return new MmsSparqlConnection(g_serialized, this._g_context);
    }

    get queryType(): QueryType {
        return resolve_meta_object_sync<QueryType>(this._gc_serialized.queryTypePath);
    }

    async getParameters(): Promise<QueryParam[]> {
        return Promise.all(this._gc_serialized.parameterPaths.map(async(sp_parameter) => {
            const gc_query_param = await resolve_meta_object<QueryParam.Serialized>(sp_parameter);
            return new QueryParam(gc_query_param, this._g_context);
        }));
    }

    get headers(): Header[] {
        return resolve_meta_object_sync<Header[]>(this._gc_serialized.headersPath);
    }
}

const MmsSparqlQueryTable_Assertion: PresentationElementClass<MmsSparqlQueryTable.Serialized> = MmsSparqlQueryTable;


