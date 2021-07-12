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
import type { SparqlSelectQuery } from '#/util/sparql-endpoint';

import {build_dng_select_query_from_params} from './helper/sparql-code';

import H_PREFIXES from './prefixes';

export type HardcodedGroup<ValueType extends PrimitiveValue = PrimitiveValue> = Record<DotFragment, ValueType>;
export type HardcodedObjectType<ValueType extends PrimitiveValue = PrimitiveValue> = Record<DotFragment, HardcodedGroup<ValueType>>;
export type HardcodedObjectCategory<ValueType extends PrimitiveValue = PrimitiveValue> = Record<DotFragment, HardcodedObjectType<ValueType>>;
export type HardcodedObjectRoot<ValueType extends PrimitiveValue = PrimitiveValue> = Record<DotFragment, HardcodedObjectCategory<ValueType>>;

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
	HardcodedObjectType<Omit<ValueType, 'type'> & {key: string;}>
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

const escape_html = (s: string) => s.replace(/</g, '&lt;');

const unordered_list = (si_key: string) => (g: QueryRow) => /* syntax: html */ `
	<ul>${(g[si_key]?.value || '')
		.split('\0')
		.map(s => `<li>${escape_html(s)}</li>`)
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
					queryBuilderPath: 'hardcoded#queryBuilder.sparql.dng.basicParamsL3',
				},
				asr: {
					label: 'Appendix Subsystem Requirements',
					queryParametersPaths: [
						'hardcoded#queryParameter.sparql.dng.sysvac',
						'hardcoded#queryParameter.sparql.dng.maturity',
					],
					queryFieldGroupPath: 'hardcoded#queryFieldGroup.sparql.dng.basic',
					queryBuilderPath: 'hardcoded#queryBuilder.sparql.dng.basicParamsL3ChildrenAndL4s',
				},
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
					cell: (g: QueryRow) => escape_html(g.idValue.value),
				},
				requirementName: {
					value: 'Requirement Name',
					label: null, // inherit from value
					source: 'native',
					hasMany: false,
					cell: (g: QueryRow) => /* syntax: html */ `<a href="${g.artifact.value}">${escape_html(g.requirementNameValue.value)}</a>`,
				},
				requirementText: {
					value: 'Requirement Text',
					label: null, // inherit from value
					source: 'native',
					hasMany: false,
					cell: (g: QueryRow) => g.requirementTextValue.value,
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
					cell: (g: QueryRow) => escape_html(g.affectedSystemsValue?.value || ''),
				},
				maturity: {
					value: 'Maturity',
					label: null, // inherit from value
					source: 'attribute',
					hasMany: false,
					cell: (g: QueryRow) => g.maturityValue?.value || '',
				},
				children: {
					value: 'Child Requirements',
					label: null,  // inherit from value
					source: 'native',
					hasMany: true,
					cell: (g: QueryRow) => `<ul>${
						g.childrenValue.value
							.split(/\0/g)
							.map((s, i) => /* syntax: html*/ `<li><a href="${g.children.value.split(/\0/g)[i]}">${escape_html(s)}</a></li>`)
							.join('')
					}</ul>`,
				},
			},
		},
	}),

	queryBuilder: {
		sparql: {
			dng: {
				basicParams: {
					function: build_dng_select_query_from_params,
				},
				basicParamsL3: {
					function(this: MmsSparqlQueryTable): Promise<SparqlSelectQuery> {
						return build_dng_select_query_from_params.call(this, {
							bgp: /* syntax: js */ `
								?_level a rdf:Property ;
									rdfs:label "Level" ;
									.

								?artifact ?_level [rdfs:label "L3"] .
							`,
						});
					},
				},
				basicParamsL3ChildrenAndL4s: {
					function(this: MmsSparqlQueryTable): Promise<SparqlSelectQuery> {
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

	queryContext: {
		sparql: {
			dng: {
				common: {
					prefixes: H_PREFIXES,
				},
			},
		},
	},

	utility: {
		function: {
			sort: {
				label_asc:(g_a: Labeled, g_b: Labeled) => g_a.label < g_b.label ? -1 : 1,
			},
		},
	},
});
/* eslint-enable object-curly-newline */
