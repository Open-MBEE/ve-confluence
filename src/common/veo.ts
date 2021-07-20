import type {
	DotFragment,
} from '#/common/types';
import type { Connection, MmsSparqlConnection, SparqlConnection } from '#/model/Connection';

export const NL_PATH_FRAGMENTS = 5;

export namespace ReVeoPath {
	type Impossible<Key extends keyof any> = {
		[w_key in Key]: never;
	};

	type Exclusively<Type, Subtype extends Type=Type> = Subtype & Impossible<Exclude<keyof Subtype, keyof Type>>;

	export type RootMap = Exclusively<{
		document: Exclusively<{
			connection: Exclusively<{
				sparql: Exclusively<{
					mms: {
						[si: string]: MmsSparqlConnection.Serialized;
					};
				}>;
			}>;
		}>;
	}>;

	export type AsString<Type> = Extract<Type, string>;


	export type ValidLocation = keyof RootMap;

	export type Locatable = `${ValidLocation}#${string}`;

	export type MapLocation<Location extends ValidLocation> = RootMap[Location];

	export type InferLocation<Input extends Locatable> = Input extends `${infer Location}#${infer After}`? Location & ValidLocation: never;

	export type ProveLocation<Input extends Locatable> = MapLocation<InferLocation<Input>>;

	TEST_LOCATION: {
		/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
		const TestLocatable: Locatable = 'document#';
		let TestMapLocation!: MapLocation<'document'>;
		const TestInferLocation: InferLocation<'document#'> = 'document';
		let TestProveLocation!: ProveLocation<'document#connection'>;
		/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
	}


	export type ValidCategory<
		Location extends ValidLocation=ValidLocation,
	> = keyof RootMap[Location];

	export type Categorical<
		Location extends ValidLocation=ValidLocation,
	> = `${Location}#${ValidCategory}.${string}` & Locatable;

	export type MapCategory<
		Category extends ValidCategory<Location>,
		Location extends ValidLocation=ValidLocation,
	> = RootMap[Location][Category];

	export type InferCategory<
		Input extends Categorical<Location>,
		Location extends ValidLocation=ValidLocation,
	> = Input extends `${Location}#${infer Category}.${infer After}`? Category & ValidCategory: never;

	// type ProveCategory<
	// 	Input extends Categorical<Location>,
	// 	Location extends ValidLocation=ValidLocation,
	// > = MapCategory<InferCategory<Input, InferLocation<Input>>, InferLocation<Input>>;

	export type ProveCategory<Input extends Categorical> = MapCategory<InferCategory<Input>, InferLocation<Input>>;

	TEST_CATEGORY: {
		/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
		const TestCategorical: Categorical = 'document#connection.';
		let TestMapCategory!: MapCategory<'connection'>;
		let TestMapCategoryLocatable!: MapCategory<'connection', 'document'>;
		const TestInferCategory: InferCategory<'document#connection.'> = 'connection';
		let TestProveLocation!: ProveLocation<'document#connection.'>;
		/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
	}


	export type ValidType<
		Category extends ValidCategory<Location>=ValidCategory,
		Location extends ValidLocation=ValidLocation,
	> = keyof RootMap[Location][Category];

	export type Typical<
		Category extends ValidCategory<Location>=ValidCategory,
		Location extends ValidLocation=ValidLocation,
	> = `${Location}#${AsString<Category>}.${ValidType}.${string}` & Categorical<Location>;

	export type MapType<
		Type extends keyof MapCategory<Category, Location>,
		Category extends keyof MapLocation<Location>=keyof MapLocation<ValidLocation>,
		Location extends ValidLocation=ValidLocation,
	> = RootMap[Location][Category][Type];

	export type InferType<
		Input extends Typical<Category, Location>,
		Category extends ValidCategory<Location>=ValidCategory,
		Location extends ValidLocation=ValidLocation,
	> = Input extends `${Location}#${AsString<Category>}.${infer Type}.${infer After}`? Type & ValidType: never;

	export type ProveType<Input extends Typical> = MapType<InferType<Input>, InferCategory<Input>, InferLocation<Input>>;

	TEST_TYPE: {
		/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
		const TestTypical: Typical = 'document#connection.sparql.';
		let TestMapType!: MapType<'sparql'>;
		let TestMapTypeCategorical!: MapType<'sparql', 'connection'>;
		let TestMapTypeCategoricalLocatable!: MapType<'sparql', 'connection', 'document'>;
		const TestInferType: InferType<'document#connection.sparql.'> = 'sparql';
		let TestProveType!: ProveType<'document#connection.sparql.'>;
		/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
	}


	// export type ValidGroup<
	// 	// Type extends ValidType<ValidCategory<Location>, Location>=ValidType,
	// 	Type extends ValidType<Category, Location>=ValidType,
	// 	Category extends ValidCategory<Location>=ValidCategory,
	// 	Location extends ValidLocation=ValidLocation,
	// > = keyof RootMap[Location][Category][Type];

	export type ValidGroup<
		Location extends ValidLocation=ValidLocation,
		Category extends ValidCategory<Location>=ValidCategory,
		Type extends ValidType<Category, Location>=ValidType<Category, Location>,
	> = keyof RootMap[Location][Category][Type];

	export type Groupical<
		Type extends ValidType=ValidType,
		Category extends ValidCategory=ValidCategory,
		Location extends ValidLocation=ValidLocation,
	> = `${Location}#${Category}.${Type}.${ValidGroup}.${string}` & Typical;

	export type MapGroup<
		Group extends keyof MapType<Type, Category, Location> & string,
		Type extends keyof MapCategory<Category, Location> & string=keyof MapCategory<Category, Location>,
		Category extends keyof MapLocation<Location> & string=keyof MapLocation<ValidLocation>,
		Location extends ValidLocation=ValidLocation,
	> = RootMap[Location][Category][Type][Group];

	export type InferGroup<
		Input extends Groupical<Type, Category, Location>,
		Type extends ValidType=ValidType,
		Category extends ValidCategory=ValidCategory,
		Location extends ValidLocation=ValidLocation,
	> = Input extends `${Location}#${Category}.${Type}.${infer Group}.${infer After}`? Group & ValidGroup: never;

	export type ProveGroup<Input extends Groupical> = MapGroup<InferGroup<Input>, InferType<Input>, InferCategory<Input>, InferLocation<Input>>;

	TEST_GROUP: {
		/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
		const TestGroupical: Groupical = 'document#connection.sparql.mms.';
		// let TestMapGroup!: MapGroup<'mms'>;
		let TestMapGroupTypical!: MapGroup<'mms', 'sparql'>;
		let TestMapGroupTypicalCategorical!: MapGroup<'mms', 'sparql', 'connection'>;
		let TestMapGroupTypicalCategoricalLocatable!: MapGroup<'mms', 'sparql', 'connection', 'document'>;
		const TestInferGroup: InferGroup<'document#connection.sparql.mms.'> = 'mms';
		let TestProveGroup!: ProveGroup<'document#connection.sparql.mms.'>;
		/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
	}


	export type ValidId = DotFragment;

	export type Idical<
		Group extends ValidGroup=ValidGroup,
		Type extends ValidType=ValidType,
		Category extends ValidCategory=ValidCategory,
		Location extends ValidLocation=ValidLocation,
	> = `${Location}#${Category}.${Type}.${Group}.${ValidId}` & Groupical;

	export type MapId<
		Id extends keyof MapGroup<Group, Type, Category, Location> & string,
		Group extends keyof MapType<Type, Category, Location> & string,  //=keyof MapType<ValidType>,
		Type extends keyof MapCategory<Category, Location> & string,  //=keyof MapCategory<ValidCategory>,
		Category extends keyof MapLocation<Location> & string=keyof MapLocation<ValidLocation>,
		Location extends ValidLocation=ValidLocation,
	> = RootMap[Location][Category][Type][Group][Id];

	export type InferId<
		Input extends Idical<Group, Type, Category, Location>,
		Group extends ValidGroup=ValidGroup,
		Type extends ValidType=ValidType,
		Category extends ValidCategory=ValidCategory,
		Location extends ValidLocation=ValidLocation,
	> = Input extends `${Location}#${Category}.${Type}.${Group}.${infer Id}`? Id & ValidId: never;

	export type ProveId<Input extends Idical> = MapId<InferId<Input>, InferGroup<Input>, InferType<Input>, InferCategory<Input>, InferLocation<Input>>;

	TEST_ID: {
		/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
		const TestIdical: Idical = 'document#connection.sparql.mms.123';
		// let TestMapId!: MapGroup<'123'>;
		// let TestMapIdGroupical!: MapGroup<'123', 'mms'>;
		let TestMapIdGroupicalTypical!: MapId<'123', 'mms', 'sparql'>;
		let TestMapIdGroupicalTypicalCategorical!: MapId<'123', 'mms', 'sparql', 'connection'>;
		let TestMapIdGroupicalTypicalCategoricalLocatable!: MapId<'123', 'mms', 'sparql', 'connection', 'document'>;
		const TestInferGroup: InferGroup<'document#connection.sparql.mms.'> = 'mms';
		let TestProveGroup!: ProveGroup<'document#connection.sparql.mms.'>;
		/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
	}

}

export namespace VeoPath {
	export type Location = 'document' | 'page' | 'hardcoded';

	export type Locatable = `${Location}#${string}`;

	export type Frags = `${DotFragment}.${DotFragment}.${DotFragment}.${DotFragment}`;

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

