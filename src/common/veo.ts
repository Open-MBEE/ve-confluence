import type {
	DotFragment,
	PrimitiveValue,
	PrimitiveObject,
} from '#/common/types';

export const NL_PATH_FRAGMENTS = 5;

export namespace VeoPath {
	export type Location = 'document' | 'page' | 'hardcoded';

	export type Locatable = `${Location}#${string}`;

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


function describe_path_attempt(a_frags: string[], i_frag: number): string {
	const nl_frags = a_frags.length;
	if(i_frag === nl_frags - 1) return a_frags.join('.');

	const s_current = a_frags.slice(0, i_frag + 1).join('.');
	const s_rest = a_frags.slice(i_frag + 1).join('.');

	return `${s_current}[.${s_rest}]`;
}

export function access<Type extends PrimitiveValue>(h_map: PrimitiveObject, a_frags: string[]): Type {
	const nl_frags = a_frags.length;

	// empty path
	if(!nl_frags) {
		throw new TypeError(`Cannot access object using empty path frags`);
	}

	// node for traversing
	let z_node = h_map;

	// each frag
	for(let i_frag=0; i_frag<nl_frags; i_frag++) {
		const s_frag = a_frags[i_frag];

		// wildcard
		if('*' === s_frag) {
			const sp_parent = a_frags.slice(0, i_frag).join('.');

			return Object.entries(z_node).reduce((h_out, [si_key, w_value]) => ({
				...h_out,
				[`${sp_parent}.${si_key}`]: w_value,
			}), {}) as Type;
		}
		// recursive wildcard
		else if('**' === s_frag) {
			const sp_parent = a_frags.slice(0, i_frag).join('.');

			for(; i_frag<NL_PATH_FRAGMENTS; i_frag++) {
				debugger;
				for(const si_part in z_node) {
					const z_child = z_node[si_part];
					debugger;
				}
			}

			return Object.entries(z_node).reduce((h_out, [si_key, w_value]) => ({
				...h_out,
				[`${sp_parent}.${si_key}`]: w_value,
			}), {}) as Type;
		}

		// access thing
		const z_thing = z_node[s_frag];

		// terminal
		if(i_frag === nl_frags-1) {
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
