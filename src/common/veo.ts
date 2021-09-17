import type {
	DotFragment,
	Labeled,
	PrimitiveValue,
	TypedLabeledObject,
	TypedLabeledPrimitive,
} from '#/common/types';

import type {
	QueryField,
	QueryFieldGroup,
	QueryParam,
	QueryTable,
	QueryType,
	TableQueryBuilder} from '#/element/QueryTable/model/QueryTable';

import type {
	MmsSparqlConnection,
	PlainSparqlConnection,
	SparqlQueryContext,
	SparqlSearcher,
} from '#/model/Connection';

import type {
	Split,
} from 'ts-toolbelt/out/String/_api';

export const NL_PATH_FRAGMENTS = 5;

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
				dng: TableQueryBuilder;
			};
		};
		queryContext: {
			sparql: {
				dng: SparqlQueryContext;
			};
		};
		searcher: {
			sparql: {
				dng: SparqlSearcher;
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
