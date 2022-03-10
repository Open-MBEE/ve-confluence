import type {
	DotFragment,
	PrimitiveObject,
	PrimitiveValue,
	Labeled,
	TypedObject,
	KeyedObject,
	QueryRow,
} from '#/common/types';

import type {
	MmsSparqlQueryTable,
	QueryField,
	QueryParam,
	QueryType,
} from '#/element/QueryTable/model/QueryTable';

import {
	MetadataBundle,
	MetadataShape,
	ReadonlySynchronousSerializationLocation,
} from '#/model/Serializable';

import type {SparqlSelectQuery} from '#/util/sparql-endpoint';

import {
	plain,
	html,
	xhtml,
	escape_html,
	XhtmlString,
} from '#/util/strings';

import {
	build_dng_select_param_query,
	build_dng_select_query_from_params,
	dng_detailer_query,
	dng_searcher_query,
} from './helper/sparql-code';

import H_PREFIXES from './prefixes';

export interface HardcodedGroup<ValueType extends PrimitiveValue=PrimitiveValue> extends PrimitiveObject {
	[si_frag: string]: ValueType;
}

export interface HardcodedObjectType<ValueType extends PrimitiveValue=PrimitiveValue> extends PrimitiveObject {
	[si_frag: string]: HardcodedGroup<ValueType>;
}

export interface HardcodedObjectCategory<ValueType extends PrimitiveValue=PrimitiveValue> extends PrimitiveObject {
	[si_frag: string]: HardcodedObjectType<ValueType>;
}

export interface HardcodedObjectRoot<ValueType extends PrimitiveValue=PrimitiveValue> extends PrimitiveObject {
	[si_frag: string]: HardcodedObjectCategory<ValueType>;
}

export interface HardcodedShape extends MetadataShape<'Hardcoded'> {
	schema: '1.0';
	paths: HardcodedObjectRoot;
}

export class HardcodedLocation extends ReadonlySynchronousSerializationLocation<HardcodedShape> {
	// eslint-disable-next-line class-methods-use-this
	getMetadataBundle(): MetadataBundle<HardcodedShape> {
		return {
			schema: '1.0',
			version: {
				number: 0,
				message: 'Static hardcoded version',
			},
			storage: {},
			data: {
				type: 'Hardcoded',
				schema: '1.0',
				paths: H_HARDCODED_OBJECTS,
			},
		};
	}
}

export const K_HARDCODED = new HardcodedLocation();

function auto_type(h_tree: Record<DotFragment, HardcodedObjectCategory>): HardcodedObjectRoot<TypedObject | PrimitiveValue> {
	for(const si_category in h_tree) {
		const h_types = h_tree[si_category];

		for(const si_type in h_types) {
			const h_groups = h_types[si_type];

			for(const si_group in h_groups) {
				const h_ids = h_groups[si_group];

				for(const si_id in h_ids) {
					const z_value = h_ids[si_id];

					if('object' === typeof z_value && !Array.isArray(z_value)) {
						h_ids[si_id] = {
							type: si_category[0].toUpperCase()+si_category.slice(1),
							...z_value,
						};
					}
				}
			}
		}
	}

	return h_tree;
}

type AddsKey<ValueType extends PrimitiveValue> = Record<
	DotFragment,
	HardcodedObjectType<Omit<ValueType, 'type'> & {key: string}>
>;

type NoTypeOrKey<ValueType extends PrimitiveObject> = Record<
	DotFragment,
	HardcodedObjectType<Omit<ValueType, 'type' | 'key'>>
>;

function auto_key<ValueType extends PrimitiveObject>(
	h_subtree: NoTypeOrKey<ValueType>
): AddsKey<ValueType> {
	for(const si_type in h_subtree) {
		const h_group = h_subtree[si_type];

		for(const si_group in h_group) {
			const h_ids = h_group[si_group];

			for(const si_key in h_ids) {
				const g_value = h_ids[si_key];

				(g_value as unknown as KeyedObject).key = si_key;
			}
		}
	}

	return h_subtree as unknown as AddsKey<ValueType>;
}


const unordered_list = (si_key: string) => (g: QueryRow): XhtmlString => xhtml`
	<ul>${(g[si_key]?.value || '')
		.split('\0')
		.map(s => `<li>${escape_html(s) || '&nbsp;'}</li>`)
		.join('')}</ul>
`;

const A_QUERY_FIELD_PATHS_BASIC = [
	'hardcoded#queryField.sparql.dng.id',
	'hardcoded#queryField.sparql.dng.requirementName',
	'hardcoded#queryField.sparql.dng.requirementText',
	'hardcoded#queryField.sparql.dng.keyDriver',
	'hardcoded#queryField.sparql.dng.affectedSystems',
	'hardcoded#queryField.sparql.dng.maturity',
];

/* eslint-disable object-curly-newline */
export const H_HARDCODED_OBJECTS: HardcodedObjectRoot = auto_type({
	queryParameter: auto_key<QueryParam.Serialized>({
		sparql: {
			dng: {
				level: {
					value: 'Level',
					sortPath: 'hardcoded#utility.function.sort.label_asc',
				},
				sysvac: {
					value: 'System VAC',
					// sortPath: null,
				},
				maturity: {
					value: 'Maturity',
					sortPath: null,
				},
				capturingDocument: {
					value: 'Capturing Document',
					sortPath: 'hardcoded#utility.function.sort.iri_asc',
				},
				requirementWorkflow: {
					label: 'Workflow',
					value: 'State (Requirement Workflow)',
					sortPath: 'hardcoded#utility.function.sort.iri_asc',
				},
				id: {
					value: 'Identifier',
					sortPath: null,
				},
			},
		},
	}),

	queryType: auto_key<QueryType.Serialized>({
		sparql: {
			dng: {
				afsr: {
					label: 'Appendix Flight Systems Requirements',
					queryParametersPaths: [
						'hardcoded#queryParameter.sparql.dng.sysvac',
						'hardcoded#queryParameter.sparql.dng.maturity',
					],
					queryFieldGroupPath: 'hardcoded#queryFieldGroup.sparql.dng.basicWithChildren',
					queryBuilderPath: 'hardcoded#queryBuilder.sparql.dng.table.basicParamsL3',
					paramQueryBuilderPath: 'hardcoded#paramQueryBuilder.sparql.dng.default',
				},
				asr: {
					label: 'Appendix Subsystem Requirements',
					queryParametersPaths: [
						'hardcoded#queryParameter.sparql.dng.sysvac',
						'hardcoded#queryParameter.sparql.dng.maturity',
					],
					queryFieldGroupPath: 'hardcoded#queryFieldGroup.sparql.dng.basic',
					queryBuilderPath: 'hardcoded#queryBuilder.sparql.dng.table.basicParamsL3ChildrenAndL4s',
					paramQueryBuilderPath: 'hardcoded#paramQueryBuilder.sparql.dng.default',
				},
				msrasr: {
					label: 'MSR Appendix Subsystem Requirements',
					queryParametersPaths: [
						'hardcoded#queryParameter.sparql.dng.capturingDocument',
						'hardcoded#queryParameter.sparql.dng.requirementWorkflow',
					],
					queryFieldGroupPath: 'hardcoded#queryFieldGroup.sparql.dng.basic',
					queryBuilderPath: 'hardcoded#queryBuilder.sparql.dng.table.basicParamsL3ChildrenAndL4s',
					paramQueryBuilderPath: 'hardcoded#paramQueryBuilder.sparql.dng.default',
				},
				// bid: {
				// 	label: 'By Requirement ID',
				// 	queryParametersPaths: [
				// 		'hardcoded#queryParameter.sparql.dng.id',
				// 	],
				// 	queryFieldGroupPath: 'hardcoded#queryFieldGroup.sparql.dng.simple',
				// 	queryBuilderPath: 'hardcoded#queryBuilder.sparql.dng.table.basicParams',
				// 	paramQueryBuilderPath: 'hardcoded#paramQueryBuilder.sparql.dng.default',
				// },
			},
		},
	}),

	queryFieldGroup: {
		sparql: {
			dng: {
				basic: {
					queryFieldsPaths: A_QUERY_FIELD_PATHS_BASIC,
				},
				basicWithChildren: {
					queryFieldsPaths: [
						...A_QUERY_FIELD_PATHS_BASIC,
						'hardcoded#queryField.sparql.dng.children',
					],
				},
				simple: {
					queryFieldsPaths: [
						'hardcoded#queryField.sparql.dng.id',
						'hardcoded#queryField.sparql.dng.requirementName',
						'hardcoded#queryField.sparql.dng.requirementText',
					],
				},
			},
		},
	},

	queryField: auto_key<QueryField.Serialized>({
		sparql: {
			dng: {
				id: {
					value: 'ID',
					label: null, // inherit from value
					source: 'native',
					hasMany: false,
					cell: (g: QueryRow) => plain`${escape_html(g.idValue.value)}`,
				},
				requirementName: {
					value: 'Requirement Name',
					label: null, // inherit from value
					source: 'native',
					hasMany: false,
					cell: (g: QueryRow) => xhtml`<a href="${g.artifact.value}">${escape_html(g.requirementNameValue.value)}</a>`,
				},
				requirementText: {
					value: 'Requirement Text',
					label: null, // inherit from value
					source: 'native',
					hasMany: false,
					cell: (g: QueryRow) => html`${g.requirementTextValue.value}`,
				},
				keyDriver: {
					value: 'Key/Driver [S]',
					label: 'Key/Driver Indicator',
					source: 'attribute',
					hasMany: true,
					cell: unordered_list('keydriverValue'),
				},
				affectedSystems: {
					value: 'Affected Systems',
					label: null, // inherit from value
					source: 'attribute',
					hasMany: true,
					cell: (g: QueryRow) => plain`${escape_html(g.affectedSystemsValue?.value || '')}`,
				},
				maturity: {
					value: 'Maturity',
					label: null, // inherit from value
					source: 'attribute',
					hasMany: false,
					cell: (g: QueryRow) => plain`${escape_html(g.maturityValue?.value || '')}`,
				},
				children: {
					value: 'Child Requirements',
					label: null,  // inherit from value
					source: 'native',
					hasMany: true,
					cell: (g: QueryRow) => xhtml`<ul>${
						g.childrenValue.value
							.split(/\0/g)
							.map((s, i) => /* syntax: html*/ `<li><a href="${g.children.value.split(/\0/g)[i]}">${escape_html(s)}</a></li>`)
							.join('')
					}</ul>`,
				},
			},
		},
	}),

	paramQueryBuilder: {
		sparql: {
			dng: {
				default: build_dng_select_param_query,
			},
		},
	},

	queryContext: {
		sparql: {
			dng: {
				common: {
					prefixes: H_PREFIXES,
				},
			},
		},
	},

	queryBuilder: {
		sparql: {
			dng: {
				search: {
					basic: dng_searcher_query,
				},
				detail: {
					basic: dng_detailer_query,
				},
				table: {
					basicParams: build_dng_select_query_from_params,
					basicParamsL3(this: MmsSparqlQueryTable): Promise<SparqlSelectQuery> {
						return build_dng_select_query_from_params.call(this, {
							bgp: /* syntax: js */ `
								?_level a rdf:Property ;
									rdfs:label "Level" ;
									.

								?artifact ?_level [rdfs:label "L3"] .
							`,
						});
					},
					basicParamsL3ChildrenAndL4s(this: MmsSparqlQueryTable): Promise<SparqlSelectQuery> {
						return build_dng_select_query_from_params.call(this, {
							bgp: /* syntax: js */ `
								?_level a rdf:Property ;
									rdfs:label "Level" ;
									.

								{
									?artifact ?_level [rdfs:label "L4"] .
								} union {
									?artifact a oslc_rm:Requirement ;
										ibm_type:Decomposition ?parent ;
										.

									?parent ?_level [rdfs:label "L3"] .
								}
							`,
						});
					},
				},
			},
		},
	},

	utility: {
		function: {
			sort: {
				label_asc: (g_a: Labeled, g_b: Labeled) => g_a.label < g_b.label ? -1 : 1,
				iri_asc: (g_a: Labeled, g_b: Labeled) => {
					debugger;
					return g_a.label < g_b.label ? -1 : 1;
				},
			},
		},
	},
});
/* eslint-enable object-curly-newline */
