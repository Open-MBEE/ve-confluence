import type {
	Labeled,
	CompareFunction,
	DotFragment,
	TypedLabeledObject,
	TypedKeyedLabeledObject,
	TypedObject,
	QueryRow,
	ValuedObject,
	TypedKeyedPrimitive,
	TypedPrimitive,
	ValuedLabeledObject, Hash,
} from '#/common/types';

import type {VeoPath} from '#/common/veo';

import {
	VeOdm,
	VeOdmKeyed,
	VeOdmKeyedLabeled,
	VeOrmClass,
} from '#/model/Serializable';

import {
	Connection,
	SparqlConnection,
	MmsSparqlConnection,
} from '#/model/Connection';
import Serialized = MmsSparqlQueryTable.Serialized;

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

	get size(): number {
		return this._a_values.length;
	}

	* [Symbol.iterator](): Generator<ValuedObject> {
		for(const g_value of this._a_values) {
			yield g_value;
		}
	}

	has(k_value: ValuedObject): boolean {
		// ref value
		const si_value = k_value.value;

		// find value
		return -1 !== this._a_values.findIndex(k => si_value === k.value);
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
		return this._gc_serialized.label || this.value;
	}

	get hasMany(): boolean {
		return this._gc_serialized.hasMany;
	}

	get cell(): (g_row: QueryRow) => string {
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
		return this._gc_serialized.queryFieldsPaths.map(sp => new QueryField(this._k_store.resolveSync(sp), this._g_context));
	}
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


export namespace QueryType {
	export interface Serialized<
		ConnectionType extends string=string,
	>extends TypedKeyedLabeledObject<'QueryType'> {
		queryParametersPaths: VeoPath.QueryParameter<ConnectionType>[];
		queryFieldGroupPath: VeoPath.QueryFieldGroup;
		queryBuilderPath: VeoPath.QueryBuilder;
	}
}

export class QueryType<ConnectionType extends DotFragment=DotFragment> extends VeOdmKeyedLabeled<QueryType.Serialized<ConnectionType>> {
	get queryBuilder(): QueryBuilder {
		const gc_builder = this._k_store.resolveSync<QueryBuilder.Serialized>(
			this._gc_serialized.queryBuilderPath
		);
		return new QueryBuilder(gc_builder, this._g_context);
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

	fetchParameters(): Promise<QueryParam[]> {
		return Promise.all(this._gc_serialized.queryParametersPaths.map(async(sp_parameter) => {
			const gc_query_param = await this._k_store.resolve<QueryParam.Serialized>(sp_parameter);
			return new QueryParam(gc_query_param, this._g_context);
		}));
	}

	get queryParametersPaths(): VeoPath.QueryParameter[] {
		return this._gc_serialized.queryParametersPaths;
	}

	get fields(): QueryField[] {
		const gc_field_group = this._k_store.resolveSync<QueryFieldGroup.Serialized>(this._gc_serialized.queryFieldGroupPath);
		return new QueryFieldGroup(gc_field_group, this._g_context).fields;
	}
}

export namespace QueryTable {
	type DefaultType = `${`${'Mms'}Sparql` | `${'Plain'}Vql`}QueryTable`;

	export interface Serialized<
		ConnectionType extends string=string,
		TypeString extends DefaultType=DefaultType,
	> extends TypedObject<TypeString> {
		connectionPath: VeoPath.Connection<ConnectionType>;
		parameterValues: Record<string, QueryParamValue.Serialized[]>;
	}
}

export abstract class QueryTable<
	ConnectionType extends string=string,
	Serialized extends QueryTable.Serialized<ConnectionType>=QueryTable.Serialized<ConnectionType>,
> extends VeOdm<Serialized> {
	protected _h_param_values_lists: Record<string, ParamValuesList> = {};

	abstract isPublished(): Promise<boolean>;

	abstract publish(publish: Node): Promise<boolean>;

	abstract fetchConnection(): Promise<Connection>;

	abstract get queryType(): QueryType<ConnectionType>;

	abstract setQueryType(g_query_type: ValuedLabeledObject): void;

	abstract get queryTypeOptions(): Record<string, QueryType>;

	async init(): Promise<void> {
		await super.init();

		// build param values list
		const h_param_values = this._gc_serialized.parameterValues;
		const h_param_values_lists = this._h_param_values_lists;
		for(const k_param of await this.queryType.fetchParameters()) {
			h_param_values_lists[k_param.key] = new ParamValuesList(
				h_param_values[k_param.key]
			);
		}
	}

	get parameterValues(): Record<string, readonly QueryParamValue.Serialized[]> {
		return this._gc_serialized.parameterValues;
	}

	parameterValuesList(si_param: string): ParamValuesList {
		const h_param_values = this._h_param_values_lists;

		// no such param
		if(!this.queryType.queryParametersPaths.map(p => this._k_store.idPartSync(p)).includes(si_param)) {
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

	async fromSerialized(serialized: Serialized): Promise<void> {
		super.fromSerialized(serialized);
		await this.init();
	}

	async getAllRows(): Promise<View> {
		let g_view: View = {
			rows: [],
		};
		const k_connection = await this.fetchConnection();
		const k_query = await this.fetchQueryBuilder();
		let nl_rows_total = 0;
		let limit = 2000;
		await k_connection.execute(k_query.count()).then((a_counts) => {
			nl_rows_total = +a_counts[0].count.value;
		});

		let a_rows = await k_connection.execute(k_query.paginate(limit));
		if (nl_rows_total > limit) {
			let offset = 0;
			while (offset + limit <= nl_rows_total) {
				offset += limit;
				a_rows.concat(await k_connection.execute(k_query.paginate(limit, offset)));
			}
		}

		g_view.rows = a_rows.map((g_row) => {
			const h_out: Record<string, string> = {};

			for (const k_field of this.queryType.fields) {
				h_out[k_field.key] = k_field.cell(g_row);
			}

			return h_out;
		});

		return g_view;
	}
}

export interface View {
	rows: Array<Hash>;
}

export interface ConnectionQuery {
	paginate(n_limit: number, n_offset?: number): string;

	count(): string;
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
> extends QueryTable<'sparql', Serialized> {
	protected _h_options!: Record<string, LocalQueryType>;

	abstract fetchConnection(): Promise<SparqlConnection>;

	initSync(): void {
		this._h_options = this._k_store.optionsSync<QueryType.Serialized, QueryType>(this._gc_serialized.queryTypePath, QueryType, this._g_context);
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

		const h_options: Record<string, QueryType> = this._h_options;
		for(const sp_test in h_options) {
			const k_test = h_options[sp_test];
			if(si_value === k_test.value && s_label === k_test.label) {
				this._gc_serialized.queryTypePath = sp_test as VeoPath.SparqlQueryType;
				return;
			}
		}

		throw new Error(`Unable to set .queryType property on QueryTable instance since ${JSON.stringify(g_query_type)} did not match any known queryType options`);
	}

	get queryTypeOptions(): Record<VeoPath.SparqlQueryType, QueryType> {
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
		const g_serialized = await this._k_store.resolve<MmsSparqlConnection.Serialized>(this._gc_serialized.connectionPath);
		return new MmsSparqlConnection(g_serialized, this._g_context);
	}

	isPublished(): Promise<boolean> {
		return Promise.resolve(this._k_store.isPublished());
	}

	publish(node: Node): Promise<boolean> {
		return Promise.resolve(this._k_store.publish(node));
	}

	async save(): Promise<boolean> {
		return Promise.resolve(this._k_store.update(this.toSerialized()));
	}

}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MmsSparqlQueryTable_Assertion: VeOrmClass<MmsSparqlQueryTable.Serialized> = MmsSparqlQueryTable;
