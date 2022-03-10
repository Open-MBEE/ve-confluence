import type {
	Labeled,
	CompareFunction,
	DotFragment,
	TypedLabeledObject,
	TypedKeyedLabeledObject,
	TypedObject,
	QueryRow,
	TypedKeyedPrimitive,
	ValuedLabeledObject,
	TypedKeyedUuidedObject,
	Instantiable,
} from '#/common/types';

import type {VeoPathTarget} from '#/common/veo';

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
	PlainSparqlConnection,
} from '#/model/Connection';

import type {TypedString} from '#/util/strings';

import {
	autoCursorMutate,
	ConfluencePage,
	wrapCellInHtmlMacro,
} from '#/vendor/confluence/module/confluence';

import XHTMLDocument from '#/vendor/confluence/module/xhtml-document';

import {process} from '#/common/static';

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
		queryFieldsPaths: VeoPathTarget[];
	}
}

export class QueryFieldGroup extends VeOdm<QueryFieldGroup.Serialized> {
	get fields(): QueryField[] {
		return this._gc_serialized.queryFieldsPaths.map(sp => new QueryField(sp, this._k_store.resolveSync(sp), this._g_context));
	}
}

export type TableQueryBuilder = (this: QueryTable) => Promise<ConnectionQuery>;

export namespace QueryType {
	export interface Serialized<
		ConnectionType extends string=string,
	>extends TypedKeyedLabeledObject<'QueryType'> {
		queryParametersPaths: VeoPathTarget[];
		queryFieldGroupPath: VeoPathTarget;
		queryBuilderPath: VeoPathTarget;
	}
}

export class QueryType<ConnectionType extends DotFragment=DotFragment> extends VeOdmKeyedLabeled<QueryType.Serialized<ConnectionType>> {
	get queryBuilder(): TableQueryBuilder {
		const sp_builder = this._gc_serialized.queryBuilderPath;
		return this._k_store.resolveSync(sp_builder) as unknown as TableQueryBuilder;
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
			const gc_query_param = await this._k_store.resolve(sp_parameter);
			return new QueryParam(sp_parameter, gc_query_param as QueryParam.Serialized, this._g_context);
		}));
	}

	get queryParametersPaths(): VeoPathTarget[] {
		return this._gc_serialized.queryParametersPaths;
	}

	get fields(): QueryField[] {
		const sp_group = this._gc_serialized.queryFieldGroupPath;
		const gc_field_group = this._k_store.resolveSync(sp_group);
		return new QueryFieldGroup(sp_group, gc_field_group as unknown as QueryFieldGroup.Serialized, this._g_context).fields;
	}
}

export namespace QueryTable {
	type DefaultType = `${`${'Mms' | 'Plain'}Sparql` | `${'Plain'}Vql`}QueryTable`;

	export interface Serialized<
		ConnectionType extends string=string,
		TypeString extends DefaultType=DefaultType,
	> extends TypedKeyedUuidedObject<TypeString> {
		connectionPath: VeoPathTarget;
		parameterValues: Record<string, QueryParamValue.Serialized[]>;
	}
}


const N_QUERY_TABLE_BUILD_RESULTS_LIMIT = 1 << 10;


function sanitize_false_directives(sx_html: string): string {
	const d_parser = new DOMParser();
	const d_doc = d_parser.parseFromString(sx_html, 'text/html');
	const a_links = d_doc.querySelectorAll(`a[href^="${process.env.DOORS_NG_PREFIX || ''}"]`);
	a_links.forEach(yn_link => yn_link.setAttribute('data-ve4', '{}'));
	return d_doc.body.innerHTML;
}

export abstract class QueryTable<
	ConnectionType extends string=string,
	Serialized extends QueryTable.Serialized<ConnectionType>=QueryTable.Serialized<ConnectionType>,
	LocalQueryType extends QueryType<ConnectionType>=QueryType<ConnectionType>,
> extends VeOdmPageElement<Serialized> {
	static cellRenderer(k_query_table: QueryTable): (g_row: QueryRow) => Record<string, TypedString> {
		return (g_row: QueryRow): Record<string, TypedString> => {
			const h_out: Record<string, TypedString> = {};

			for(const k_field of k_query_table.queryType.fields) {
				h_out[k_field.key] = k_field.cell(g_row);
			}

			return h_out;
		};
	}

	protected _h_param_values_lists: Record<string, ParamValuesList> = {};

	abstract fetchConnection(): Promise<Connection>;

	abstract get queryType(): QueryType<ConnectionType>;

	abstract setQueryType(g_query_type: ValuedLabeledObject): void;

	abstract get queryTypeOptions(): Record<VeoPathTarget, LocalQueryType>;

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
		if(!this.queryType.queryParametersPaths.map(sp => this._k_store.idPartSync(sp).join('.')).includes(si_param)) {
			// create param values list ad-hoc
			this._h_param_values_lists[si_param] = new ParamValuesList([]);
			// throw new Error(`No such parameter has the id '${si_param}'`);
		}

		// param not found in values
		if(!(si_param in h_param_values)) {
			const a_values = this._gc_serialized.parameterValues[si_param] = [];
			return (this._h_param_values_lists[si_param] = new ParamValuesList(a_values));
		}

		// return values list
		return this._h_param_values_lists[si_param];
	}

	fetchQueryBuilder(this: QueryTable): Promise<ConnectionQuery> {
		return this.queryType.queryBuilder.call(this);
	}


	async exportResultsToCxhtml(this: QueryTable, k_connection: Connection, yn_anchor: Node, k_contents=this.getContext().source): Promise<{rows: QueryRow[]; contents: XHTMLDocument}> {
		// fetch query builder
		const k_query = await this.fetchQueryBuilder();

		// execute query and download all rows
		const a_rows = await k_connection.execute(k_query.all());

		// build XHTML table
		const a_fields = this.queryType.fields;
		const f_builder = k_contents.builder();
		const yn_table = f_builder('table', {}, [
			f_builder('colgroup', {}, a_fields.map(() => f_builder('col'))),
			f_builder('tbody', {}, [
				f_builder('tr', {}, a_fields.map(g_field => f_builder('th', {}, [
					g_field.label,
				]))),
				...a_rows.map(QueryTable.cellRenderer(this)).map(h_row => f_builder('tr', {}, [
					...Object.values(h_row).map((ksx_cell) => {
						const a_nodes: Array<Node | string> = [];
						const sx_cell = ksx_cell.toString().trim();

						// rich content type
						if('text/plain' !== ksx_cell.contentType) {
							// sanitize false directives
							const sx_sanitize = sanitize_false_directives(sx_cell);

							// sanitization changed string (making it HTML) or it already was HTML; wrap in HTML macro
							if(sx_sanitize !== sx_cell || 'text/html' === ksx_cell.contentType) {
								a_nodes.push(wrapCellInHtmlMacro(sx_sanitize, k_contents));
							}
							// update cell
							else {
								a_nodes.push(...XHTMLDocument.xhtmlToNodes(sx_sanitize));
							}
						}
						else {
							a_nodes.push(sx_cell);
						}

						// build cell using node or string
						return f_builder('td', {}, a_nodes);
					}),
				])),
			]),
		]);

		// wrap in confluence macro
		const yn_macro = ConfluencePage.annotatedSpan({
			params: {
				id: this.path,
			},
			body: [
				ConfluencePage.annotatedSpan({
					params: {
						style: 'display:none',
						class: 've-cql-search-tag',
					},
					body: f_builder('p', {}, [this.path]),
				}, k_contents),
				yn_table,
			],
			autoCursor: true,
		}, k_contents);

		// use anchor
		if(yn_anchor) {
			// replace node
			let yn_replace: Node = yn_anchor;

			// not structured macro
			if('structured-macro' !== (yn_anchor as unknown as {localName: string}).localName) {
				// crawl out of p tags
				yn_replace = yn_anchor.parentNode as Node;
				while('p' === yn_replace.parentNode?.nodeName) {
					yn_replace = yn_replace.parentNode;
				}
			}

			// replace node
			yn_replace.parentNode?.replaceChild(yn_macro, yn_replace);

			// auto cusor mutate
			autoCursorMutate(yn_macro, k_contents);
		}
		// no directive
		else {
			throw new Error(`No directive node was given`);
		}

		return {
			rows: a_rows,
			contents: k_contents,
		};
	}
}

export interface ConnectionQuery {
	paginate(n_limit: number, n_offset?: number): string;

	count(): string;

	all(): string;
}

export namespace SparqlQueryTable {
	type DefaultType = `${'Mms' | 'Plain'}SparqlQueryTable`;

	export interface Serialized<
		Group extends DotFragment=DotFragment,
		TypeString extends DefaultType=DefaultType,
	> extends QueryTable.Serialized<'sparql', TypeString> {
		connectionPath: VeoPathTarget;
		queryTypePath: VeoPathTarget;
	}
}

export abstract class SparqlQueryTable<
	Serialized extends SparqlQueryTable.Serialized=SparqlQueryTable.Serialized,
	LocalQueryType extends QueryType<'sparql'>=QueryType<'sparql'>,
> extends QueryTable<'sparql', Serialized, LocalQueryType> {
	protected _h_options!: Record<string, LocalQueryType>;

	abstract fetchConnection(): Promise<SparqlConnection>;

	initSync(): void {
		this._h_options = this._k_store.optionsSync(this._gc_serialized.queryTypePath, this._g_context, QueryType as unknown as Instantiable<QueryType.Serialized, LocalQueryType>);
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

		const h_options = this._h_options;
		for(const sp_test in h_options) {
			const k_test = h_options[sp_test];
			if(si_value === k_test.value && s_label === k_test.label) {
				this._assign({
					queryTypePath: sp_test,
				});
				return;
			}
		}

		throw new Error(`Unable to set .queryType property on QueryTable instance since ${JSON.stringify(g_query_type)} did not match any known queryType options`);
	}

	get queryTypeOptions(): Record<VeoPathTarget, LocalQueryType> {
		return this._h_options;
	}
}


export namespace PlainSparqlQueryTable {
	export interface Serialized<Group extends DotFragment=DotFragment> extends SparqlQueryTable.Serialized<Group, 'PlainSparqlQueryTable'> {
		group: 'plain';
	}
}

export class PlainSparqlQueryTable<
	Group extends DotFragment=DotFragment,
> extends SparqlQueryTable<PlainSparqlQueryTable.Serialized<Group>> {
	async fetchConnection(): Promise<PlainSparqlConnection> {
		const sp_connection = this._gc_serialized.connectionPath;
		const gc_serialized = await this._k_store.resolve(sp_connection);
		return new PlainSparqlConnection(sp_connection, gc_serialized as PlainSparqlConnection.Serialized, this._g_context);
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
		const gc_serialized = await this._k_store.resolve(sp_connection);
		return new MmsSparqlConnection(sp_connection, gc_serialized as MmsSparqlConnection.Serialized, this._g_context);
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MmsSparqlQueryTable_Assertion: VeOrmClass<MmsSparqlQueryTable.Serialized> = MmsSparqlQueryTable;