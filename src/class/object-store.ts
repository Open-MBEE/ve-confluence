import type {
	DotFragment,
	PrimitiveValue,
	PrimitiveObject,
} from '../common/types';

import type {
	HardcodedObjectRoot,
} from '../common/hardcoded';

import type {
	ConfluenceDocument,
	ConfluencePage,
} from './confluence';

import type {
	Context,
	Primitive,
	Serializable,
	VeOdm,
} from '../model/Serializable';

const G_SHAPE = {
	document: [
		'DocumentObject',
		{
			connection: [
				'Connection',
				{
					sparql: [
						'SparqlConnection',
						{mms:['MmsSparqlConnection']},
					],
				},
			],
		},
	],
	page: [
		'PageObject',
		{
			element: [
				'PageElement',
				{
					query_table: [
						'QueryTable',
						{sparql:['SparqlQueryTable']},
					],
				},
			],
		},
	],
	hardcoded: [
		'HardcodedObject',
		{
			queryField: [
				'QueryField',
				{
					sparql: [
						'SparqlQueryFieeld',
						{dng:['DngSparqlQueryField']},
					],
				},
			],
			queryType: [
				'QueryType',
				{
					sparql: [
						'SparqlQueryType',
						{dng:['DngSparqlQueryType']},
					],
				},
			],
			queryParameter: [
				'QueryParameter',
				{
					sparql: [
						'SparqlQueryParameter',
						{dng:['DngSparqlQueryParameter']},
					],
				},
			],
			queryContext: [
				'QueryContext',
				{
					sparql: [
						'SparqlQueryContext',
						{dng:['DngSparqlQueryContext']},
					],
				},
			],
			utility: [
				'Utility',
				{
					function: [
						'Function',
						{sort:['SortFunction']},
					],
				},
			],
		},
	],
} as const;

export namespace VePath {
	export type Location = 'document' | 'page' | 'hardcoded';

	export type Full<
		Storage extends Location = Location,
		Category extends DotFragment = DotFragment,
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = `${Storage}#${Category}.${Type}.${Group}.${Id}`;

	export type DocumentObject<
		Category extends DotFragment = DotFragment,
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = Full<'document', Category, Type, Group, Id>;

	export type Connection<
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = DocumentObject<'connection', Type, Group, Id>;

	export type SparqlConnection<
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = Connection<'sparql', Group, Id>;

	export type MmsSparqlConnection<Id extends DotFragment = DotFragment> =
		SparqlConnection<'mms', Id>;

	export type HardcodedObject<
		Category extends DotFragment = DotFragment,
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = Full<'hardcoded', Category, Type, Group, Id>;

	export type QueryFieldGroup<
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = HardcodedObject<'queryFieldGroup', Type, Group, Id>;

	export type SparqlQueryFieldGroup<
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = QueryFieldGroup<'sparql', Group, Id>;

	export type DngSparqlQueryFieldGroup<Id extends DotFragment = DotFragment> =
		SparqlQueryFieldGroup<'dng', Id>;

	export type QueryField<
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = HardcodedObject<'queryField', Type, Group, Id>;

	export type SparqlQueryField<
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = QueryField<'sparql', Group, Id>;

	export type DngSparqlQueryField<Id extends DotFragment = DotFragment> =
		SparqlQueryField<'dng', Id>;

	export type QueryType<
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = HardcodedObject<'queryType', Type, Group, Id>;

	export type SparqlQueryType<
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = QueryType<'sparql', Group, Id>;

	export type DngSparqlQueryType<Id extends DotFragment = DotFragment> =
		SparqlQueryType<'dng', Id>;

	export type QueryParameter<
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = HardcodedObject<'queryParameter', Type, Group, Id>;

	export type SparqlQueryParameter<
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = QueryParameter<'sparql', Group, Id>;

	export type DngSparqlQueryParameter<Id extends DotFragment = DotFragment> =
		SparqlQueryParameter<'dng', Id>;

	export type QueryBuilder<
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = HardcodedObject<'queryBuilder', Type, Group, Id>;

	export type SparqlQueryBuilder<
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = QueryBuilder<'sparql', Group, Id>;

	export type DngSparqlQueryBuilder<Id extends DotFragment = DotFragment> =
		SparqlQueryBuilder<'dng', Id>;

	export type QueryContext<
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = HardcodedObject<'queryContext', Type, Group, Id>;

	export type SparqlQueryContext<
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = QueryContext<'sparql', Group, Id>;

	export type DngSparqlQueryContext<Id extends DotFragment = DotFragment> =
		SparqlQueryContext<'dng', Id>;

	export type Utility<
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = HardcodedObject<'utility', Type, Group, Id>;

	export type Function<
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = Utility<'function', Group, Id>;

	export type SortFunction<Id extends DotFragment = DotFragment> = Function<'sort', Id>;  // eslint-disable-line @typescript-eslint/ban-types
}

function describe_path_attempt(a_frags: string[], i_frag: number) {
	const nl_frags = a_frags.length;
	if(i_frag === nl_frags - 1) return a_frags.join('.');

	const s_current = a_frags.slice(0, i_frag + 1).join('.');
	const s_rest = a_frags.slice(i_frag + 1).join('.');

	return `${s_current}[.${s_rest}]`;
}

function access<Type extends PrimitiveValue>(
	h_map: PrimitiveObject,
	a_frags: string[]
): Type {
	const nl_frags = a_frags.length;

	// empty path
	if(!nl_frags) {
		throw new TypeError(`Cannot access object using empty path frags`);
	}

	// node for traversing
	let z_node = h_map;

	// each frag
	for(let i_frag = 0; i_frag < nl_frags; i_frag++) {
		const s_frag = a_frags[i_frag];

		// access thing
		const z_thing = z_node[s_frag];

		// terminal
		if(i_frag === nl_frags - 1) {
			return z_thing as Type;
		}

		// deduce type
		const s_type = typeof z_thing;
		switch(s_type) {
			// undefined
			case 'undefined': {
				debugger;
				throw new Error(`Cannot access thing '${describe_path_attempt(a_frags, i_frag)}' since it is undefined`);
			}

			// object
			case 'object': {
				// null
				if(null === z_thing) {
					throw new Error(`While accessing '${describe_path_attempt(a_frags, i_frag)}'; encountered null part-way thru`);
				}
				// array or dict; traverse
				else {
					z_node = z_thing as PrimitiveObject;
					continue;
				}
			}

			// primitive
			default: {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				throw new Error(`While accessing '${describe_path_attempt(a_frags, i_frag)}'; encountered primitive value "${z_thing}" part-way thru`);
			}
		}
	}

	throw new Error(`Code route not reachable`);
}

export class ObjectStore {
	protected _k_page: ConfluencePage;
	protected _k_document: ConfluenceDocument;
	protected _h_hardcoded: HardcodedObjectRoot;

	constructor(
		k_page: ConfluencePage,
		k_document: ConfluenceDocument,
		h_hardcoded: HardcodedObjectRoot
	) {
		this._k_page = k_page;
		this._k_document = k_document;
		this._h_hardcoded = h_hardcoded;
	}


	// eslint-disable-next-line class-methods-use-this
	idPartSync(sp_path: string): string {
		const a_parts = sp_path.split('#');

		if(2 !== a_parts.length) {
			throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
		}

		const [, s_frags] = a_parts as [VePath.Location, string];
		const a_frags = s_frags.split('.');

		return a_frags[3];
	}

	optionsSync<
		ValueType extends Serializable | Primitive,
		ClassType extends VeOdm<ValueType>,
	>(
		sp_path: string,
		dc_class: {new (gc: ValueType, g: Context): ClassType;},
		g_context: Context
	): Record<VePath.Full, ClassType> {
		const h_options = this.resolveSync<Record<string, ValueType>>(sp_path);
		return Object.entries(h_options).reduce(
			(h_out, [si_key, w_value]) => ({
				...h_out,
				[`${sp_path}.${si_key}`]: new dc_class(w_value, g_context),
			}),
			{}
		);
	}

	resolveSync<
		ValueType extends PrimitiveValue,
		VePathType extends VePath.HardcodedObject = VePath.HardcodedObject,
	>(sp_path: string): ValueType {
		const a_parts = sp_path.split('#');

		if(2 !== a_parts.length) {
			throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
		}

		const [si_storage, s_frags] = a_parts as [VePath.Location, string];
		const a_frags = s_frags.split('.');

		if('hardcoded' !== si_storage) {
			throw new Error(`Cannot synchronously access non-hardcoded storage type '${si_storage}'`);
		}

		return access<ValueType>(this._h_hardcoded, a_frags);
	}

	async resolve<
		ValueType extends PrimitiveValue,
		VePathType extends VePath.Full = VePath.Full,
	>(sp_path: string): Promise<ValueType> {
		const a_parts = sp_path.split('#');
		if(2 !== a_parts.length) {
			throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
		}

		const [si_storage, s_frags] = a_parts as [VePath.Location, string];
		const a_frags = s_frags.split('.');

		let k_target: ConfluencePage | ConfluenceDocument;

		switch(si_storage) {
			case 'page': {
				k_target = this._k_page;
				break;
			}

			case 'document': {
				k_target = this._k_document;
				break;
			}

			case 'hardcoded': {
				return access<ValueType>(this._h_hardcoded, a_frags);
			}

			default: {
				throw new Error(`Unmapped VePath storage parameter '${si_storage}'`);  // eslint-disable-line @typescript-eslint/restrict-template-expressions
			}
		}

		// fetch ve4 data
		const g_ve4 = await k_target.getMetadata();

		// no metadata; error
		if(!g_ve4) {
			throw new Error(`${si_storage[0].toUpperCase() + si_storage.slice(1)} exists but no metadata`);
		}

		// fetch metadata
		const g_metadata = g_ve4.value || null;

		if(!g_metadata) {
			throw new Error(`Cannot access ${si_storage} metadata`);
		}

		return access<ValueType>(g_metadata, a_frags);
	}
}
