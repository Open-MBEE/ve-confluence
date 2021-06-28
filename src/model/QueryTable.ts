import type {
    SparqlString,
    Labeled,
    CompareFunction,
    DotFragment,
    TypedLabeledObject,
    TypedKeyedLabeledObject,
    TypedObject,
    QueryResult,
    QueryRow,
    ValuedObject,
    TypedKeyedLabeledPrimitive,
    TypedKeyedPrimitive,
    JSONObject,
    TypedPrimitive,
    LabeledValuedObject,
} from '../common/types';

import type {
    VePath,
} from '../class/object-store';

import {
    Serializable,
    VeOdm,
    VeOdmKeyed,
    VeOdmKeyedLabeled,
    VeOdmLabeled,
    VeOrmClass,
} from './Serializable';

import {
    Connection,
    SparqlConnection,
    MmsSparqlConnection,
} from './Connection';
import { SparqlSelectQuery } from '../util/sparql-endpoint';


export namespace QueryParamValue {
    export interface Serialized extends TypedLabeledObject<'QueryParamValue'> {
        value: string;
    }
}


export class ParamValuesList {
    private _a_values: ValuedObject[];

    constructor(a_values: ValuedObject[]) {
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

    has(k_value: ValuedObject): boolean {
        // ref value
        const si_value = k_value.value;

        // find value
        return -1 !== this._a_values.findIndex(k => si_value == k.value);
    }

    add(k_value: ValuedObject): boolean {
        // already in list, return false
        if(this.has(k_value)) return false;

        // not yet in list, add; return true
        this._a_values.push(k_value);
        return true;
    }

    delete(k_value: ValuedObject): boolean {
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
    export interface Serialized extends TypedKeyedPrimitive<'QueryParam'> {
        sortPath: VePath.SortFunction | null;
        value: string;
        label?: string;
    }
}

export class QueryParam extends VeOdmKeyed<QueryParam.Serialized> {
    get value(): string {
        return this._gc_serialized.value;
    }

    get label(): string {
        return this._gc_serialized.label || this.value || this.key;
    }

    get sort(): undefined | CompareFunction<Labeled> {
        if(this._gc_serialized.sortPath) {
            return this._k_store.resolveSync<CompareFunction<Labeled>>(this._gc_serialized.sortPath);
        }
    }
}

export namespace QueryFieldGroup {
    export interface Serialized extends TypedObject<'QueryFieldGroup'> {
        queryFieldsPaths: VePath.SparqlQueryField[];
    }
}

export class QueryFieldGroup extends VeOdm<QueryFieldGroup.Serialized> {
    get fields(): QueryField[] {
        return this._gc_serialized.queryFieldsPaths.map(sp => new QueryField(this._k_store.resolveSync(sp), this._g_context));
    }
}

export namespace QueryField {
    export interface Serialized extends TypedKeyedPrimitive<'QueryField'> {
        value: string;
        label?: string;
        source: 'native' | 'attribute';
        hasMany: boolean;
        cell: (g_row: QueryRow) => string;
    }
}

export class QueryField extends VeOdmKeyed<QueryField.Serialized> {
    get source(): string {
        return this._gc_serialized.source;
    }

    get value(): string {
        return this._gc_serialized.value;
    }

    get label(): string {
        return this._gc_serialized.label || this.key;
    }

    get hasMany(): boolean {
        return this._gc_serialized.hasMany;
    }

    get cell(): (g_row: QueryRow) => string {
        return this._gc_serialized.cell;
    }
}

export namespace QueryType {
    export interface Serialized extends TypedKeyedLabeledObject<'QueryType'> {
        queryBuilderPath: VePath.QueryBuilder;
    }
}

export class QueryType extends VeOdmKeyedLabeled<QueryType.Serialized> {
    get queryBuilder(): QueryBuilder {
        const gc_builder = this._k_store.resolveSync<QueryBuilder.Serialized>(this._gc_serialized.queryBuilderPath);
        return new QueryBuilder(gc_builder, this._g_context);
    }

    get value(): string {
        return this.key;
    }

    toItem(): LabeledValuedObject {
        return {
            value: this.value,
            label: this.label,
        };
    }
}

export namespace QueryTable {
    export interface Serialized<ConnectionType extends string=string> extends Serializable {
        type: `${`${'Mms'}Sparql` | `${'Plain'}Vql`}QueryTable`;
        connectionPath: VePath.Connection<ConnectionType>;
        parameterValues: Record<string, QueryParamValue.Serialized[]>;
        parameterPaths: VePath.QueryParameter<ConnectionType>[];
    }
}

export abstract class QueryTable<
    ConnectionType extends string=string,
    Serialized extends QueryTable.Serialized<ConnectionType>=QueryTable.Serialized<ConnectionType>
> extends VeOdm<Serialized> {
    protected _h_param_values_lists: Record<string, ParamValuesList> = {};

    async init() {
        await super.init();
        
        // build param values list
        const h_param_values = this._gc_serialized.parameterValues;
        const h_param_values_lists = this._h_param_values_lists;
        for(const k_param of await this.getParameters()) {
            h_param_values_lists[k_param.key] = new ParamValuesList(h_param_values[k_param.key]);
        }
    }

    abstract getConnection(): Promise<Connection>;

    abstract get queryType(): QueryType;

    abstract setQueryType(g_query_type: LabeledValuedObject): void;

    abstract get queryTypeOptions(): Record<string, QueryType>;

    abstract get fields(): QueryField[];

    async getParameters(): Promise<QueryParam[]> {
        return Promise.all(this._gc_serialized.parameterPaths.map(async(sp_parameter) => {
            const gc_query_param = await this._k_store.resolve<QueryParam.Serialized>(sp_parameter);
            return new QueryParam(gc_query_param, this._g_context);
        }));
    }

    get parameterValues(): Record<string, readonly QueryParamValue.Serialized[]> {
        return this._gc_serialized.parameterValues;
    }

    parameterValuesList(si_param: string): ParamValuesList {
        const h_param_values = this._h_param_values_lists;

        // no such param
        if(!this._gc_serialized.parameterPaths.map(p => this._k_store.idPartSync(p)).includes(si_param)) {
            throw new Error(`No such parameter has the id '${si_param}'`);
        }

        // param not found in values
        if(!(si_param in h_param_values)) {
            const a_values = this._gc_serialized.parameterValues[si_param] = [];
            return this._h_param_values_lists[si_param] = new ParamValuesList(a_values);
        }

        // return values list
        return this._h_param_values_lists[si_param];
    }

    fetchQueryBuilder(): Promise<ConnectionQuery> {
        return this.queryType.queryBuilder.function.call(this);
    }
}

export interface ConnectionQuery {
    paginate(n_limit: number, n_offset?: number): string;

    count(): string;
}

export namespace QueryBuilder {
    export interface Serialized extends TypedPrimitive<'QueryBuilder'> {
        function: (this: QueryTable) => Promise<ConnectionQuery>;
    }
}

export class QueryBuilder extends VeOdm<QueryBuilder.Serialized> {
    get function(): (this: QueryTable) => Promise<ConnectionQuery> {
        return this._gc_serialized.function;
    }
}

export namespace SparqlQueryTable {
    export interface Serialized<Group extends DotFragment=DotFragment> extends QueryTable.Serialized<'sparql'> {
        type: `${'Mms'}SparqlQueryTable`;
        connectionPath: VePath.SparqlConnection;
        queryTypePath: VePath.SparqlQueryType<Group>;
        parameterPaths: VePath.SparqlQueryParameter<Group>[];
        fieldGroupPath: VePath.SparqlQueryFieldGroup<Group>;
    }
}


export abstract class SparqlQueryTable<Serialized extends SparqlQueryTable.Serialized=SparqlQueryTable.Serialized> extends QueryTable<'sparql', Serialized> {
    protected _h_options!: Record<VePath.SparqlQueryType, QueryType>;
    protected _k_query_type!: QueryType;

    abstract getConnection(): Promise<SparqlConnection>;

    initSync(): void {
        const h_options: Record<string, QueryType> = this._h_options = this._k_store.optionsSync<QueryType.Serialized, QueryType>(`hardcoded#queryType.sparql.${this._gc_serialized.group}`, QueryType, this._g_context);
        this._k_query_type = h_options[this._gc_serialized.queryTypePath];
        return super.initSync();
    }

    get queryType(): QueryType {
        return this._k_query_type;
    }

    setQueryType(g_query_type: LabeledValuedObject) {
        const {
            value: si_value,
            label: s_label,
        } = g_query_type;

        const h_options: Record<string, QueryType> = this._h_options;
        for(const sp_test in h_options) {
            const k_test = h_options[sp_test];
            if(si_value === k_test.value && s_label === k_test.label) {
                this._gc_serialized.queryTypePath = sp_test as VePath.SparqlQueryType;
                return;
            }
        }

        throw new Error(`Unable to set .queryType property on QueryTable instance since ${JSON.stringify(g_query_type)} did not match any known queryType options`);
    }

    get queryTypeOptions(): Record<VePath.SparqlQueryType, QueryType> {
        return this._h_options;
    }
    
    get fields(): QueryField[] {
        const gc_field_group = this._k_store.resolveSync<QueryFieldGroup.Serialized>(this._gc_serialized.fieldGroupPath);
        return (new QueryFieldGroup(gc_field_group, this._g_context)).fields;
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
        const g_serialized = await this._k_store.resolve<MmsSparqlConnection.Serialized>(this._gc_serialized.connectionPath);
        return new MmsSparqlConnection(g_serialized, this._g_context);
    }
}

const MmsSparqlQueryTable_Assertion: VeOrmClass<MmsSparqlQueryTable.Serialized> = MmsSparqlQueryTable;


