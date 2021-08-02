import type {
	Labeled,
	CompareFunction,
	DotFragment,
	TypedLabeledObject,
	TypedKeyedLabeledObject,
	TypedObject,
	QueryRow,
	TypedKeyedPrimitive,
	TypedPrimitive,
	ValuedLabeledObject,
	TypedKeyedUuidedObject,
	Instantiable,
} from '#/common/types';

import type {VeoPath} from '#/common/veo';

import {
	VeOdm,
	VeOdmKeyed,
	VeOdmKeyedLabeled,
	VeOdmPageElement,
	VeOrmClass,
} from '#/model/Serializable';

import {
	Connection,
	SparqlConnection,
	MmsSparqlConnection,
} from '#/model/Connection';

import type {TypedString} from '#/util/strings';

export namespace QueryParamValue {
	export interface Serialized extends TypedLabeledObject<'QueryParamValue'> {
		value: string;
	}
}

export class ParamValuesList {
	private _a_values: ValuedLabeledObject[];

	constructor(a_values: ValuedLabeledObject[]) {
		this._a_values = a_values;
	}

	get size(): number {
		return this._a_values.length;
	}

	* [Symbol.iterator](): Generator<ValuedLabeledObject> {
		for(const g_value of this._a_values) {
			yield g_value;
		}
	}

	has(k_value: ValuedLabeledObject): boolean {
		// ref value
		const si_value = k_value.value;

		// find value
		return -1 !== this._a_values.findIndex(k => si_value === k.value);
	}

	add(k_value: ValuedLabeledObject): boolean {
		// already in list, return false
		if(this.has(k_value)) return false;

		// not yet in list, add; return true
		this._a_values.push(k_value);
		return true;
	}

	delete(k_value: ValuedLabeledObject): boolean {
		const si_value = k_value.value;

		// find value
		const i_value = this._a_values.findIndex(k => si_value === k.value);

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
		sortPath: VeoPath.SortFunction | null;
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
			return this._k_store.resolveSync<CompareFunction<Labeled>>(
				this._gc_serialized.sortPath
			);
		}
		return;
	}
}


export namespace QueryField {
	export interface Serialized extends TypedKeyedPrimitive<'QueryField'> {
		value: string;
		label?: string;
		source: 'native' | 'attribute';
		hasMany: boolean;
		cell: (g_row: QueryRow) => TypedString;
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
		return this._gc_serialized.label || this.value;
	}

	get hasMany(): boolean {
		return this._gc_serialized.hasMany;
	}

	get cell(): (g_row: QueryRow) => TypedString {
		return this._gc_serialized.cell;
	}
}


export namespace QueryFieldGroup {
	export interface Serialized extends TypedObject<'QueryFieldGroup'> {
		queryFieldsPaths: VeoPath.SparqlQueryField[];
	}
}

export class QueryFieldGroup extends VeOdm<QueryFieldGroup.Serialized> {
	get fields(): QueryField[] {
		return this._gc_serialized.queryFieldsPaths.map(sp => new QueryField(sp, this._k_store.resolveSync(sp), this._g_context));
	}
}


export namespace QueryBuilder {
	export interface Serialized extends TypedPrimitive<'QueryBuilder'> {
		function: (this: QueryTable, param?: QueryParam) => Promise<ConnectionQuery>;
	}
}

export class QueryBuilder extends VeOdm<QueryBuilder.Serialized> {
	get function(): (this: QueryTable, param?: QueryParam) => Promise<ConnectionQuery> {
		return this._gc_serialized.function;
	}
}

export namespace QueryType {
	export interface Serialized<
		ConnectionType extends string=string,
	>extends TypedKeyedLabeledObject<'QueryType'> {
		queryParametersPaths: VeoPath.QueryParameter<ConnectionType>[];
		queryFieldGroupPath: VeoPath.QueryFieldGroup;
		queryBuilderPath: VeoPath.QueryBuilder;
		paramQueryBuilderPath: VeoPath.QueryBuilder;
	}
}

export class QueryType<ConnectionType extends DotFragment=DotFragment> extends VeOdmKeyedLabeled<QueryType.Serialized<ConnectionType>> {
	get queryBuilder(): QueryBuilder {
		const sp_builder = this._gc_serialized.queryBuilderPath;
		const gc_builder = this._k_store.resolveSync<QueryBuilder.Serialized>(sp_builder);
		return new QueryBuilder(sp_builder, gc_builder, this._g_context);
	}

	get paramQueryBuilder(): QueryBuilder {
		const sp_builder = this._gc_serialized.paramQueryBuilderPath;
		const gc_builder = this._k_store.resolveSync<QueryBuilder.Serialized>(
			this._gc_serialized.paramQueryBuilderPath
		);
		return new QueryBuilder(sp_builder, gc_builder, this._g_context);
	}

	get value(): string {
		return this.key;
	}

	toItem(): ValuedLabeledObject {
		return {
			value: this.value,
			label: this.label,
		};
	}

	async fetchParameters(): Promise<QueryParam[]> {
		await this.ready();

		return await Promise.all(this._gc_serialized.queryParametersPaths.map(async(sp_parameter) => {
			const gc_query_param = await this._k_store.resolve<QueryParam.Serialized>(sp_parameter);
			return new QueryParam(sp_parameter, gc_query_param, this._g_context);
		}));
	}

	get queryParametersPaths(): VeoPath.QueryParameter[] {
		return this._gc_serialized.queryParametersPaths;
	}

	get fields(): QueryField[] {
		const sp_group = this._gc_serialized.queryFieldGroupPath;
		const gc_field_group = this._k_store.resolveSync<QueryFieldGroup.Serialized>(sp_group);
		return new QueryFieldGroup(sp_group, gc_field_group, this._g_context).fields;
	}
}

export namespace QueryTable {
	type DefaultType = `${`${'Mms'}Sparql` | `${'Plain'}Vql`}QueryTable`;

	export interface Serialized<
		ConnectionType extends string=string,
		TypeString extends DefaultType=DefaultType,
	> extends TypedKeyedUuidedObject<TypeString> {
		connectionPath: VeoPath.Connection<ConnectionType>;
		parameterValues: Record<string, QueryParamValue.Serialized[]>;
	}
}


const N_QUERY_TABLE_BUILD_RESULTS_LIMIT = 1 << 10;

export abstract class QueryTable<
	ConnectionType extends string=string,
	Serialized extends QueryTable.Serialized<ConnectionType>=QueryTable.Serialized<ConnectionType>,
	LocalQueryType extends QueryType<ConnectionType>=QueryType<ConnectionType>,
> extends VeOdmPageElement<Serialized> {
	protected _h_param_values_lists: Record<string, ParamValuesList> = {};

	abstract fetchConnection(): Promise<Connection>;

	abstract get queryType(): QueryType<ConnectionType>;

	abstract setQueryType(g_query_type: ValuedLabeledObject): void;

	abstract get queryTypeOptions(): Record<VeoPath.QueryType, LocalQueryType>;

	async init(): Promise<void> {
		await super.init();

		// build param values list
		{
			// deep clone param values so list mutation does not affect original hash
			const h_param_values = this._gc_serialized.parameterValues;
			const h_param_values_lists = this._h_param_values_lists;

			const a_params = await this.queryType.fetchParameters();

			for(const k_param of a_params) {
				const a_list = h_param_values[k_param.key] = h_param_values[k_param.key] || [];
				h_param_values_lists[k_param.key] = new ParamValuesList(a_list);
			}
		}
	}

	get parameterValues(): Record<string, readonly QueryParamValue.Serialized[]> {
		return this._gc_serialized.parameterValues;
	}

	parameterValuesList(si_param: string): ParamValuesList {
		const h_param_values = this._h_param_values_lists;

		// no such param
		if(!this.queryType.queryParametersPaths.map(sp => this._k_store.idPartSync(sp)).includes(si_param)) {
			throw new Error(`No such parameter has the id '${si_param}'`);
		}

		// param not found in values
		if(!(si_param in h_param_values)) {
			const a_values = this._gc_serialized.parameterValues[si_param] = [];
			return (this._h_param_values_lists[si_param] = new ParamValuesList(a_values));
		}

		// return values list
		return this._h_param_values_lists[si_param];
	}



	fetchQueryBuilder(): Promise<ConnectionQuery> {
		return this.queryType.queryBuilder.function.call(this);
	}

	fetchParamQueryBuilder(param: QueryParam): Promise<ConnectionQuery> {
		return this.queryType.paramQueryBuilder.function.call(this, param);
	}
}

export interface ConnectionQuery {
	stringify(): string;

	paginate(n_limit: number, n_offset?: number): string;

	count(): string;

	all(): string;
}

export namespace SparqlQueryTable {
	type DefaultType = `${'Mms'}SparqlQueryTable`;

	export interface Serialized<
		Group extends DotFragment=DotFragment,
		TypeString extends DefaultType=DefaultType,
	> extends QueryTable.Serialized<'sparql', TypeString> {
		connectionPath: VeoPath.SparqlConnection;
		queryTypePath: VeoPath.SparqlQueryType<Group>;
	}
}

export abstract class SparqlQueryTable<
	Serialized extends SparqlQueryTable.Serialized=SparqlQueryTable.Serialized,
	LocalQueryType extends QueryType<'sparql'>=QueryType<'sparql'>,
> extends QueryTable<'sparql', Serialized, LocalQueryType> {
	protected _h_options!: Record<VeoPath.SparqlQueryType, LocalQueryType>;

	// @ts-expect-error weired serialized unions
	abstract fetchConnection(): Promise<SparqlConnection>;

	initSync(): void {
		this._h_options = this._k_store.optionsSync<QueryType.Serialized, LocalQueryType>(this._gc_serialized.queryTypePath, this._g_context, QueryType as unknown as Instantiable<QueryType.Serialized, LocalQueryType>);
		return super.initSync();
	}

	get queryType(): LocalQueryType {
		return this._h_options[this._gc_serialized.queryTypePath];
	}

	setQueryType(g_query_type: ValuedLabeledObject): void {
		const {
			value: si_value,
			label: s_label,
		} = g_query_type;

		const h_options = this._h_options as Record<string, LocalQueryType>;
		for(const sp_test in h_options) {
			const k_test = h_options[sp_test];

			if(si_value === k_test.value && s_label === k_test.label) {
				this._assign({
					queryTypePath: sp_test as VeoPath.SparqlQueryType,
				});

				return;
			}
		}
		throw new Error(`Unable to set .queryType property on QueryTable instance since ${JSON.stringify(g_query_type)} did not match any known queryType options`);
	}

	get queryTypeOptions(): Record<VeoPath.SparqlQueryType, LocalQueryType> {
		return this._h_options;
	}
}

export namespace MmsSparqlQueryTable {
	export interface Serialized<Group extends DotFragment=DotFragment> extends SparqlQueryTable.Serialized<Group, 'MmsSparqlQueryTable'> {
		group: 'dng';
	}
}

export class MmsSparqlQueryTable<
	Group extends DotFragment=DotFragment,
> extends SparqlQueryTable<MmsSparqlQueryTable.Serialized<Group>> {
	async fetchConnection(): Promise<MmsSparqlConnection> {
		const sp_connection = this._gc_serialized.connectionPath;
		const gc_serialized = await this._k_store.resolve<MmsSparqlConnection.Serialized>(sp_connection);
		return new MmsSparqlConnection(sp_connection, gc_serialized, this._g_context);
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MmsSparqlQueryTable_Assertion: VeOrmClass<MmsSparqlQueryTable.Serialized> = MmsSparqlQueryTable;
