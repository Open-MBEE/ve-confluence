import type {
	JSONObject,
    SparqlString,
    Labeled,
    CompareFunction,
    DotFragment,
    KeyedLabeledObject,
    TypedKeyedObject,
    TypedLabeledObject,
    TypedKeyedLabeledObject,
    LabeledObject,
    TypedObject,
    QueryResult,
} from '../common/types';

import type {
    VePath,
} from '../class/meta';

import {
    Serializable,
    VeOrm,
    VeOrmClass,
} from './Serializable';

import {
    meta_object_options_sync,
    resolve_meta_object,
    resolve_meta_object_sync,
} from '../class/meta';

import {
    Connection,
    SparqlConnection,
    MmsSparqlConnection,
} from './Connection';
import { H_HARDCODED_OBJECTS } from '../common/hardcoded';


export namespace QueryParamValue {
    export interface Serialized extends TypedLabeledObject<'QueryParamValue'> {
        value: string;
    }
}


export class ParamValuesList {
    private _a_values: QueryParamValue.Serialized[];

    constructor(a_values: QueryParamValue.Serialized[]) {
        this._a_values = a_values;
    }

    get size() {
        return this._a_values.length;
    }

    *[Symbol.iterator]() {
        for(let g_value of this._a_values) {
            yield g_value;
        }
    }

    has(k_value: QueryParamValue.Serialized): boolean {
        // ref value
        const si_value = k_value.value;

        // find value
        return -1 !== this._a_values.findIndex(k => si_value == k.value);
    }

    add(k_value: QueryParamValue.Serialized): boolean {
        // already in list, return false
        if(this.has(k_value)) return false;

        // not yet in list, add; return true
        this._a_values.push(k_value);
        return true;
    }

    delete(k_value: QueryParamValue.Serialized): boolean {
        const si_value = k_value.value;

        // find value
        const i_value = this._a_values.findIndex(k => si_value == k.value)

        // not in list, return false
        if(-1 === i_value) return false;

        // found in list, delete; return true
        this._a_values.splice(i_value, 1);
        return true;
    }

    clear(): boolean {
        // nothing to clear
        if(!this._a_values.length) return false;

        // non-empty; clear and return true
        this._a_values.length = 0;
        return true;
    }
}


export namespace QueryParam {
    export interface Serialized extends TypedKeyedLabeledObject<'QueryParam'> {
        sortPath: VePath.SortFunction | null;
        // filter: string | null;
    }
}

export class QueryParam extends VeOrm<QueryParam.Serialized> {
    get key(): string {
        return this._gc_serialized.key;
    }

    get label(): string {
        return this._gc_serialized.label || this.key;
    }

    get sort(): undefined | CompareFunction<Labeled> {
        if(this._gc_serialized.sortPath) {
            return resolve_meta_object_sync<CompareFunction<Labeled>>(this._gc_serialized.sortPath);
        }
    }
}

export namespace QueryField {
    export interface Serialized extends TypedKeyedLabeledObject<'QueryField'> {
        value: string;
        source: 'native' | 'attribute';
        hasMany: boolean;
    }
}


export namespace QueryType {
    export interface Serialized extends TypedLabeledObject<'QueryType'> {
        code: SparqlString;
    }
}

export namespace QueryTable {
    export interface Serialized<ConnectionType extends string=string> extends Serializable {
        type: `${`${'Mms'}Sparql` | `${'Plain'}Vql`}QueryTable`;
        connectionPath: VePath.Connection<ConnectionType>,
        parameterValues: Record<string, QueryParamValue.Serialized[]>;
        parameterPaths: VePath.QueryParameter<ConnectionType>[],
        codePath: VePath.QueryCode<ConnectionType>,
        // queryTypePath: VePath.QueryType,
        // fieldsPath: VePath.QueryFields[],
    }
}

export abstract class QueryTable<
    ConnectionType extends string=string,
    Serialized extends QueryTable.Serialized<ConnectionType>=QueryTable.Serialized<ConnectionType>
> extends VeOrm<Serialized> {
    protected _h_param_values_lists: Record<string, ParamValuesList> = {};

    abstract getConnection(): Promise<Connection>;

    abstract get queryType(): QueryType.Serialized;

    abstract get fields(): QueryField.Serialized[];

    get parameterValues(): Record<string, readonly QueryParamValue.Serialized[]> {
        return this._gc_serialized.parameterValues;
    }

    async getParameters(): Promise<QueryParam[]> {
        return Promise.all(this._gc_serialized.parameterPaths.map(async(sp_parameter) => {
            const gc_query_param = await resolve_meta_object<QueryParam.Serialized>(sp_parameter);
            return new QueryParam(gc_query_param, this._g_context);
        }));
    }

    parameterValuesList(si_param: string): ParamValuesList {
        return this._h_param_values_lists[si_param];
    }

    get queryBuilder(): () => ConnectionQuery {
        return resolve_meta_object_sync<() => ConnectionQuery>(this._gc_serialized.codePath);
    }
}

export type ConnectionQueryStringBuilder = (k_helper: any) => string;

export interface ConnectionQuery {
    paginate(n_limit: number, n_offset?: number): ConnectionQueryStringBuilder;

    count(): ConnectionQueryStringBuilder;
}

export namespace SparqlQueryTable {
    export interface Serialized<Group extends DotFragment=DotFragment> extends QueryTable.Serialized<'sparql'> {
        type: `${'Mms'}SparqlQueryTable`;
        connectionPath: VePath.SparqlConnection;
        queryTypePath: VePath.SparqlQueryType<Group>;
        parameterPaths: VePath.SparqlQueryParameter<Group>[];
        fieldsPath: VePath.SparqlQueryField<Group>;
    }
}

export abstract class SparqlQueryTable<Serialized extends SparqlQueryTable.Serialized=SparqlQueryTable.Serialized> extends QueryTable<'sparql', Serialized> {
    async init() {
        await super.init();
        
        // build param values list
        const h_param_values = this._gc_serialized.parameterValues;
        const h_param_values_lists = this._h_param_values_lists;
        for(const k_param of await this.getParameters()) {
            h_param_values_lists[k_param.key] = new ParamValuesList(h_param_values[k_param.key]);
        }
    }

    abstract getConnection(): Promise<SparqlConnection>;

    get queryType(): QueryType.Serialized {
        return resolve_meta_object_sync<QueryType.Serialized>(this._gc_serialized.queryTypePath);
    }

    get queryTypeOptions(): Record<string, QueryType.Serialized> {
        return meta_object_options_sync<QueryType.Serialized>(`hardcoded#.query_type.sparql.${this._gc_serialized.group}`);
    }
    
    get fields(): QueryField.Serialized[] {
        return resolve_meta_object_sync<QueryField.Serialized[]>(this._gc_serialized.fieldsPath);
    }
}



export namespace MmsSparqlQueryTable {
    export interface Serialized<Group extends DotFragment=DotFragment> extends SparqlQueryTable.Serialized<Group>, TypedObject {
        type: 'MmsSparqlQueryTable';
        group: 'dng';
    }
}

export class MmsSparqlQueryTable<Group extends DotFragment=DotFragment> extends SparqlQueryTable<MmsSparqlQueryTable.Serialized<Group>> {

    async getConnection(): Promise<MmsSparqlConnection> {
        const g_serialized = await resolve_meta_object<MmsSparqlConnection.Serialized>(this._gc_serialized.connectionPath);
        return new MmsSparqlConnection(g_serialized, this._g_context);
    }
}

const MmsSparqlQueryTable_Assertion: VeOrmClass<MmsSparqlQueryTable.Serialized> = MmsSparqlQueryTable;


