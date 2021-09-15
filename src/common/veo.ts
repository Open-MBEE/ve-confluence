import type {
	DotFragment,
	Labeled,
	PrimitiveValue,
	TypedLabeledObject,
	TypedLabeledPrimitive,
} from '#/common/types';

import type {MmsSparqlQueryTable,
	PlainSparqlQueryTable,
	QueryBuilder,
	QueryField,
	QueryFieldGroup,
	QueryParam,
	QueryTable,
	QueryType} from '#/element/QueryTable/model/QueryTable';

import type {Connection,
	MmsSparqlConnection,
	PlainSparqlConnection,
	SparqlConnection,
	SparqlQueryContext} from '#/model/Connection';

import type {Serializable} from '#/model/Serializable';

import type {
	Split,
	Join,
} from 'ts-toolbelt/out/String/_api';

export const NL_PATH_FRAGMENTS = 5;

type Impossible<Key extends keyof any> = {
	[w_key in Key]: never;
};

type Exclusively<Type, Subtype extends Type=Type> = Subtype & Impossible<Exclude<keyof Subtype, keyof Type>>;

type KeysOfUnion<Type> = Type extends Type? keyof Type: never;

export type VeoPathStruct = {
	document: {
		connection: {
			sparql: {
				mms: {
					dng: MmsSparqlConnection.Serialized;
				};
				plain: {
					helix: PlainSparqlConnection.Serialized;
				};
			};
		};
	};
	page: {
		elements: {
			serialized: {
				queryTable: QueryTable.Serialized;
			};
		};
	};
	hardcoded: {
		queryParameter: {
			sparql: {
				dng: QueryParam.Serialized;
			};
		};
		queryType: {
			sparql: {
				dng: QueryType.Serialized;
			};
		};
		queryFieldGroup: {
			sparql: {
				dng: QueryFieldGroup.Serialized;
			};
		};
		queryField: {
			sparql: {
				dng: QueryField.Serialized;
			};
		};
		queryBuilder: {
			sparql: {
				dng: QueryBuilder.Serialized;
			};
		};
		queryContext: {
			sparql: {
				dng: SparqlQueryContext;
			};
		};
		searcher: {
			sparql: {
				dng: Searcher.Serialized;
			};
		};
		utility: {
			function: {
				label_asc(g_a: Labeled, g_b: Labeled): -1 | 1;
			};
		};
	};
};

export type Location = keyof VeoPathStruct;

export type Locatable = `${Location}#${string}`;

export type VeoPathTarget = string;

export type ScopedVeoPath<
	s_location extends Location,
	s_category extends string=string,
	s_type extends string=string,
	s_group extends string=string,
	s_id extends string=string,
> = `${s_location}#${s_category}.${s_type}.${s_group}.${s_id}`;

// export type ScopedVeoPath_QueryField = ScopedVeoPath<'hardcoded', ''>;

export type ResolvePath<
	Path extends string,
	FallbackType extends PrimitiveValue=TypedLabeledObject|TypedLabeledPrimitive,
> = string extends Path
	? FallbackType
	: (Path extends `${infer s_location}#${infer s_rest}`
		? (s_location extends Location
			? (VeoPathStruct[s_location] extends infer h_location
				? (Split<s_rest, '.'> extends infer a_rest
					? (a_rest extends string[]
						? (a_rest[0] extends `${infer s_category}`
							? (s_category extends keyof h_location
								? (h_location[s_category] extends infer h_type
									? (a_rest[1] extends `${infer s_type}`
										? (s_type extends keyof h_type
											? (h_type[s_type] extends infer h_group
												? (a_rest[2] extends `${infer s_group}`
													? (s_group extends keyof h_group
														? (h_group[s_group] extends infer w_thing
															? (a_rest['length'] extends 3
																? w_thing
																: (a_rest[3] extends `${infer s_id}`
																	? (s_id extends keyof w_thing
																		? w_thing[s_id]
																		: never
																	): never
																)
															): never
														): never
													): never
												): never
											): never
										): never
									): never
								): never
							): never
						): never
					): never
				): never
			): never
		): never
	);

type DEMO = ResolvePath<'document#connection.sparql.mms.dng'>;

// export namespace Dot {
// 	/* eslint-disable @typescript-eslint/no-explicit-any */
// 	type PathImpl<Thing, Key extends keyof Thing> = Key extends string
// 		? Thing[Key] extends Record<string, any>
// 			? (`${Key}.${PathImpl<Thing[Key], Exclude<keyof Thing[Key], keyof any[]>> & string}`
// 				| `${Key}.${Exclude<keyof Thing[Key], keyof any[]> & string}`)
// 			: never
// 		: never;
// 	/* eslint-enable @typescript-eslint/no-explicit-any */

// 	type PathImpl2<Thing> = PathImpl<Thing, keyof Thing> | keyof Thing;

// 	type Path<Thing> = PathImpl2<Thing> extends string | keyof Thing? PathImpl2<Thing>: keyof Thing;

// 	type ThingValue<Thing, P extends Path<Thing>> = P extends `${infer Key}.${infer Rest}`
// 		? Key extends keyof Thing
// 			? Rest extends Path<Thing[Key]>
// 				? ThingValue<Thing[Key], Rest>
// 				: never
// 			: never
// 		: P extends keyof Thing
// 			? Thing[P]
// 			: never;

// 	type VeoPath = Path<ReVeoPath.RootMap>;

// 	declare function get2<Thing>(path: Path<Thing>): ThingValue<Thing, Path<Thing>>;
// }

// export namespace Dot2 {
// 	type Nestable = Record<string, Record<string, any>>;

// 	/* eslint-disable @typescript-eslint/no-explicit-any */
// 	type PathImpl<Thing, Key extends keyof Thing> = Key extends string
// 		? Thing[Key] extends Nestable
// 			? (`${Key}.${PathImpl<Thing[Key], Exclude<keyof Thing[Key], keyof any[]>> & string}`
// 				| `${Key}.${Exclude<keyof Thing[Key], keyof any[]> & string}`)
// 			: never
// 		: never;
// 	/* eslint-enable @typescript-eslint/no-explicit-any */

// 	type PathImpl2<Thing> = PathImpl<Thing, keyof Thing> | keyof Thing;

// 	type Path<Thing> = PathImpl2<Thing> extends string | keyof Thing? PathImpl2<Thing>: keyof Thing;

// 	type VeoPath = PathImpl<ReVeoPath.RootMap, keyof ReVeoPath.RootMap>;
// }

// // export namespace VeoPath2 {
// // 	export type Full<Storage extends >

// // 	export type InferFull<Input extends string> = Input extends `${infer Location}#${infer Category}.${infer Type}.${infer Group}.${infer Id}`
// // 		? Full<Location, Category, Type, Group, Id>
// // 		: never;
// // }

// export namespace ReVeoPath {
// 	// export type RootMap = {
// 	// 	page: Exclusively<{
// 	// 		elements: Exclusively<{
// 	// 			serialized: Exclusively<{
// 	// 				queryTable: Exclusively<{
// 	// 					[si: string]: any;
// 	// 				}>;
// 	// 			}>;
// 	// 		}>;
// 	// 	}>;
// 	// 	document: Exclusively<{
// 	// 		connection: Exclusively<{
// 	// 			sparql: Exclusively<{
// 	// 				mms: Exclusively<{
// 	// 					[si: string]: MmsSparqlConnection.Serialized;
// 	// 				}>;
// 	// 			}>;
// 	// 		}>;
// 	// 	}>;
// 	// 	hardcoded: Exclusively<{
// 	// 		queryFieldGroup: Exclusively<{
// 	// 			sparql: Exclusively<{
// 	// 				dng: Exclusively<{
// 	// 					[si: string]: MmsSparqlConnection.Serialized;
// 	// 				}>;
// 	// 			}>;
// 	// 		}>;
// 	// 	}>;
// 	// };

// 	export type RootMap = {
// 		page: {
// 			elements: {
// 				serialized: {
// 					queryTable: {
// 						[si: string]: any;
// 					};
// 				};
// 			};
// 		};
// 		document: {
// 			connection: {
// 				sparql: {
// 					mms: {
// 						[si: string]: MmsSparqlConnection.Serialized;
// 					};
// 					plain: {
// 						[si: string]: PlainSparqlConnection.Serialized;
// 					};
// 				};
// 			};
// 		};
// 		hardcoded: {
// 			queryFieldGroup: {
// 				sparql: {
// 					dng: {
// 						[si: string]: MmsSparqlConnection.Serialized;
// 					};
// 				};
// 			};
// 		};
// 	};


// 	export type Full<
// 		Location extends ValidLocation,
// 		Category extends ExplicitValidCategory<Location>,
// 		Type extends ExplicitValidType<Location, Category>,
// 		Group extends ExplicitValidGroup<Location, Category, Type>,
// 		Id extends ValidId & keyof RootMap[Location][Category][Type][Group],
// 	> = RootMap[Location][Category][Type][Group][Id];

// 	export type InferFull<Input extends string> = Input extends `${infer Location}#${infer Category}.${infer Type}.${infer Group}.${infer Id}`
// 		? Location extends ValidLocation
// 			? Category extends ExplicitValidCategory<Location>
// 				? Type extends ExplicitValidType<Location, Category>
// 					? Group extends ExplicitValidGroup<Location, Category, Type>
// 						? Id extends ValidId
// 							? Full<Location, Category, Type, Group, Id & keyof RootMap[Location][Category][Type][Group]>
// 							: never
// 						: never
// 					: never
// 				: never
// 			: never
// 		: never;


// 	export type AsString<Type> = Extract<Type, string>;


// 	export type ValidLocation = keyof RootMap;

// 	export type Locatable = `${ValidLocation}#${string}`;

// 	export type MapLocation<Location extends ValidLocation> = RootMap[Location];

// 	export type InferLocation<Input extends Locatable> = Input extends `${infer Location}#${infer After}`? Location & ValidLocation: never;

// 	export type LooselyInferLocation<Input extends Locatable> = Input extends `${infer Location}#${infer After}`? Location: never;

// 	export type ProveLocation<Input extends Locatable> = MapLocation<InferLocation<Input>>;

// 	TEST_LOCATION: {
// 		/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
// 		const AllLocations: ValidLocation[] = [
// 			'document',
// 			'page',
// 			'hardcoded',
// 		];
// 		const TestLocatable: Locatable = 'document#';
// 		let TestMapLocation!: MapLocation<'document'>;
// 		const TestInferLocation: InferLocation<'document#'> = 'document';
// 		let TestProveLocation!: ProveLocation<'document#connection'>;
// 		/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
// 	}


// 	export type ExplicitValidCategory<
// 		Location extends ValidLocation,
// 	> = keyof RootMap[Location];


// 	export type ValidCategory<
// 		Location extends ValidLocation=ValidLocation,
// 	> = KeysOfUnion<RootMap[Location]>;

// 	export type Categorical<
// 		Location extends ValidLocation=ValidLocation,
// 	> = `${Location}#${ValidCategory<Location>}.${string}`;

// 	export type MapCategory<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ValidCategory<Location>=ValidCategory<Location>,
// 	> = RootMap[Location][Category];

// 	export type MapCategory2<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ExplicitValidCategory<Location>=ExplicitValidCategory<Location>,
// 	> = RootMap[Location][Category];

// 	export type InferCategory<
// 		Input extends Categorical<Location>,
// 		Location extends ValidLocation=ValidLocation,
// 	> = Input extends `${Location}#${infer Category}.${infer After}`? Category & ValidCategory<Location>: never;

// 	export type LooselyInferCategory<
// 		Input extends Categorical<Location>,
// 		Location extends ValidLocation=ValidLocation,
// 	> = Input extends `${Location}#${infer Category}.${infer After}`? Category: never;

// 	export type InferLocationCategory<
// 		Input extends Categorical,
// 	> = Input extends `${infer Location}#${infer Category}.${infer After}`? Category & ValidCategory<Location & ValidLocation>: never;

// 	type ProveCategory<
// 		Input extends Categorical<Location>,
// 		Location extends ValidLocation=ValidLocation,
// 	> = MapCategory<
// 		InferLocation<Input>,
// 		InferCategory<Input & Categorical<InferLocation<Input>>, InferLocation<Input>>
// 	>;

// 	TEST_CATEGORY: {
// 		/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
// 		const AllCategories: ValidCategory[] = [
// 			'elements',
// 			'connection',
// 			'queryFieldGroup',
// 		];
// 		const Categories: ValidCategory<'document'>[] = [
// 			'connection',
// 		];
// 		const TestCategoricalAny: Categorical = 'document#connection.';
// 		const TestCategorical: Categorical<'document'> = 'document#connection.';
// 		let TestMapCategoryLocatable!: MapCategory<'document'>;
// 		let TestMapCategoryLocatableCategorical!: MapCategory<'document', 'connection'>;
// 		const TestInferCategory: InferCategory<'document#connection.'> = 'connection';
// 		let TestProveCategory!: ProveCategory<'document#connection.'>;
// 		/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
// 	}

// 	export type ExplicitValidType<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ExplicitValidCategory<Location>=ExplicitValidCategory<Location>,
// 	> = keyof RootMap[Location][Category];

// 	export type ValidType<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ValidCategory<Location>=ValidCategory<Location>,
// 	> = KeysOfUnion<RootMap[Location][Category]>;

// 	// export type Typical<
// 	// 	Location extends ValidLocation=ValidLocation,
// 	// 	Category extends ValidCategory<Location>=ValidCategory<Location>,
// 	// > = `${Location}#${Category}.${ValidType<Location, Category>}.${string}` & Categorical<Location>;

// 	export type Typical<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ExplicitValidCategory<Location>=ExplicitValidCategory<Location>,
// 	> = `${Location}#${ValidCategory<Location>}.${AsString<ExplicitValidType<Location, Category>>}.${string}` & Categorical<Location>;

// 	export type MapType<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends KeysOfUnion<MapLocation<Location>>=KeysOfUnion<MapLocation<Location>>,
// 		Type extends keyof MapCategory<Location, Category>=keyof MapCategory<Location, Category>,
// 	> = RootMap[Location][Category][Type];

// 	export type MapType2<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends keyof MapLocation<Location>=keyof MapLocation<Location>,
// 		Type extends keyof MapCategory2<Location, Category>=keyof MapCategory2<Location, Category>,
// 	> = RootMap[Location][Category][Type];

// 	export type InferType<
// 		Input extends Typical<Location, Category>,
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ExplicitValidCategory<Location>=ExplicitValidCategory<Location>,
// 	> = Input extends `${Location}#${ValidCategory<Location>}.${infer Type}.${infer After}`? Type & ExplicitValidType<Location, Category>: never;

// 	// type ProveType<
// 	// 	Input extends Typical<Location, Category>,
// 	// 	Location extends ValidLocation=ValidLocation,
// 	// 	Category extends AsString<ExplicitValidCategory<Location>>=AsString<ExplicitValidCategory<Location>>,
// 	// > = MapType<
// 	// 	InferLocation<Input>,
// 	// 	InferCategory<Input & Categorical<InferLocation<Input>>, InferLocation<Input>>,
// 	// 	InferType<
// 	// 		Input & Typical<InferLocation<Input>, InferCategory<Input, InferLocation<Input>>>,
// 	// 		InferLocation<Input>,
// 	// 		InferCategory<Input, InferLocation<Input>>
// 	// 	>
// 	// >;

// 	type ProveType2<
// 		Input extends Typical<Location, Category>,
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ValidCategory<Location>=ValidCategory<Location>
// 		// Category extends ExplicitValidCategory<Location>=ExplicitValidCategory<Location>,
// 	> = Location extends InferLocation<Input>
// 		? Category extends InferCategory<Input, Location>
// 			? 'success'
// 			: never
// 		: never;

// 		// InferCategory<Input & Categorical<InferLocation<Input>>, InferLocation<Input>>
// 		// MapType<
// 		// 		Location,
// 		// 		Category,
// 		// 		InferType<Input, Location, Category>
// 		// 	>

// 	// export type ProveType<Input extends Typical> = MapType<InferLocation<Input>, InferCategory<Input>, InferType<Input>>;

// 	type ProveType3<
// 		// Input extends Typical<Location, Category>,
// 		Input extends Typical<Location, ExplicitValidCategory<Location>>,
// 		// Location extends ValidLocation=ValidLocation,
// 		Location extends ValidLocation=ValidLocation,
// 		// Category extends ExplicitValidCategory<Location>=ExplicitValidCategory<Location>,
// 		Category extends ValidCategory<Location>=ValidCategory<Location>,
// 		// Category extends InferCategory<Input, Location>=InferCategory<Input, Location>,
// 		// Type extends ExplicitValidType<Location, ExplicitValidCategory<Location>>=ExplicitValidType<Location, ExplicitValidCategory<Location>>,
// 		// Type extends InferType<Input, Location, Category>=InferType<Input, Location, Category>,
// 		// Type extends InferType<Input, InferLocation<Input>, InferCategory<Input, InferLocation<Input>>>=InferType<Input, InferLocation<Input>, InferCategory<Input, InferLocation<Input>>>,
// 		Type extends InferType<
// 			Input & Typical<InferLocation<Input>, InferCategory<Input & Categorical<InferLocation<Input>>, InferLocation<Input>>>,
// 			InferLocation<Input>,
// 			InferCategory<Input, InferLocation<Input>>
// 		>=InferType<
// 			Input,
// 			InferLocation<Input>,
// 			InferCategory<Input, InferLocation<Input>>
// 		>,
// 		// Type extends ValidType<Location, Category>=ValidType<Location, Category>,
// 	> = Location extends InferLocation<Input>
// 		? Category extends InferCategory<Input, Location>
// 			? Input extends Typical<Location, Category>
// 				? Type extends InferType<Input, Location, Category>
// 					? MapType<Location, Category, Type>
// 					: never
// 				// ? Type extends InferType<Input, Location, Category>
// 				// 	? 'yes'
// 				// 	: never
// 				: never
// 			: never
// 		// MapType2<
// 		// 	Location,
// 		// 	Category,
// 		// 	Type
// 		// >
// 		: never;


// 	TEST_TYPE: {
// 		/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
// 		const TestTypical: Typical = 'document#connection.sparql.';
// 		const TestTypicalLocatable: Typical<'document'> = 'document#connection.sparql.';
// 		const TestTypicalLocatableCategorical: Typical<'document', 'connection'> = 'document#connection.sparql.';
// 		let TestMapTypeLocatable!: MapType<'document'>;
// 		let TestMapTypeLocatableCategorical!: MapType<'document', 'connection'>;
// 		let TestMapTypeLocatableCategoricalTypical!: MapType<'document', 'connection', 'sparql'>;
// 		const TestInferType: InferType<'document#connection.sparql.'> = 'sparql';
// 		let TestProveType!: ProveType<'document#connection.sparql.'>;
// 		let TestProveType2!: ProveType2<'document#connection.sparql.'>;
// 		let TestProveType3!: ProveType3<'document#connection.sparql.'>;
// 		/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
// 	}


// 	export type ExplicitValidGroup<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ExplicitValidCategory<Location>=ExplicitValidCategory<Location>,
// 		Type extends ExplicitValidType<Location, Category>=ExplicitValidType<Location, Category>,
// 	> = keyof RootMap[Location][Category][Type];

// 	export type ValidGroup<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ValidCategory<Location>=ValidCategory<Location>,
// 		Type extends ValidType<Location, Category>=ValidType<Location, Category>,
// 	> = KeysOfUnion<RootMap[Location][Category][Type]>;

// 	export type Groupical<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ValidCategory<Location>=ValidCategory<Location>,
// 		Type extends ValidType<Location, Category>=ValidType<Location, Category>,
// 	> = `${Location}#${AsString<Category>}.${AsString<Type>}.${ValidGroup}.${string}` & Typical;

// 	export type MapGroup<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends keyof MapLocation<Location>=keyof MapLocation<Location>,
// 		Type extends keyof MapCategory<Location, Category>=keyof MapCategory<Location, Category>,
// 		Group extends keyof MapType<Location, Category, Type>=keyof MapType<Location, Category, Type>,
// 	> = RootMap[Location][Category][Type][Group];

// 	export type InferGroup<
// 		Input extends Groupical<Location, Category, Type>,
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ValidCategory<Location>=ValidCategory<Location>,
// 		Type extends ValidType<Location, Category>=ValidType<Location, Category>,
// 	> = Input extends `${Location}#${AsString<Category>}.${AsString<Type>}.${infer Group}.${infer After}`? Group & ValidGroup: never;

// 	export type ProveGroup<Input extends Groupical> = MapGroup<InferLocation<Input>, InferCategory<Input>, InferType<Input>, InferGroup<Input>>;

// 	TEST_GROUP: {
// 		/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
// 		const TestGroupical: Groupical = 'document#connection.sparql.mms.';
// 		// let TestMapGroup!: MapGroup<'mms'>;
// 		let TestMapGroupLocatable!: MapGroup<'document'>;
// 		let TestMapGroupLocatableCategorical!: MapGroup<'document', 'connection'>;
// 		let TestMapGroupLocatableCategoricalTypical!: MapGroup<'document', 'connection', 'sparql'>;
// 		let TestMapGroupLocatableCategoricalTypicalGroupical!: MapGroup<'document', 'connection', 'sparql', 'mms'>;
// 		const TestInferGroup: InferGroup<'document#connection.sparql.mms.'> = 'mms';
// 		let TestProveGroup!: ProveGroup<'document#connection.sparql.mms.'>;
// 		/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
// 	}


// 	export type ValidId = DotFragment;

// 	export type Idical<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ValidCategory<Location>=ValidCategory<Location>,
// 		Type extends ValidType<Location, Category>=ValidType<Location, Category>,
// 		Group extends ValidGroup<Location, Category, Type>=ValidGroup<Location, Category, Type>,
// 	> = `${Location}#${AsString<Category>}.${AsString<Type>}.${AsString<Group>}.${ValidId}` & Groupical;

// 	export type MapId<
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends keyof MapLocation<Location>=keyof MapLocation<Location>,
// 		Type extends keyof MapCategory<Location, Category>=keyof MapCategory<Location, Category>,
// 		Group extends keyof MapType<Location, Category, Type>=keyof MapType<Location, Category, Type>,
// 		Id extends keyof MapGroup<Location, Category, Type, Group>=MapGroup<Location, Category, Type, Group>,
// 	> = RootMap[Location][Category][Type][Group][Id];

// 	export type InferId<
// 		Input extends Groupical<Location, Category, Type>,
// 		Location extends ValidLocation=ValidLocation,
// 		Category extends ValidCategory<Location>=ValidCategory<Location>,
// 		Type extends ValidType<Location, Category>=ValidType<Location, Category>,
// 		Group extends ValidGroup<Location, Category, Type>=ValidGroup<Location, Category, Type>,
// 	> = Input extends `${Location}#${AsString<Category>}.${AsString<Type>}.${AsString<Group>}.${infer Id}`? Id & ValidId: never;

// 	export type ProveId<Input extends Idical> = MapId<InferLocation<Input>, InferCategory<Input>, InferType<Input>, InferGroup<Input>, InferId<Input>>;

// 	TEST_ID: {
// 		/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
// 		const TestIdical: Idical = 'document#connection.sparql.mms.123';
// 		let TestMapIdLocatable!: MapId<'document'>;
// 		let TestMapIdLocatableCategorical!: MapId<'document', 'connection'>;
// 		let TestMapIdLocatableCategoricalTypical!: MapId<'document', 'connection', 'sparql'>;
// 		let TestMapIdLocatableCategoricalTypicalGroupical!: MapId<'document', 'connection', 'sparql', 'mms'>;
// 		let TestMapIdLocatableCategoricalTypicalGroupicalIdical!: MapId<'document', 'connection', 'sparql', 'mms', '123'>;
// 		const TestInferId: InferId<'document#connection.sparql.mms.123'> = '123';
// 		let TestProveId!: ProveId<'document#connection.sparql.mms.123'>;
// 		/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */
// 	}

// }

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

	export type ParamQueryBuilder<
		Type extends DotFragment = DotFragment,
		Group extends DotFragment = DotFragment,
		Id extends DotFragment = DotFragment,
	> = HardcodedObject<'paramQueryBuilder', Type, Group, Id>;
	
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

