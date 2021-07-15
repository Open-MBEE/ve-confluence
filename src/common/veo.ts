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

