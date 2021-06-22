import type {
    DotFragment,
    PrimitiveObject,
    PrimitiveValue,
    Labeled,
    TypedObject,
    KeyedObject,
} from '../common/types';

import type {
    QueryField,
    QueryParam,
    QueryType,
} from '../model/QueryTable';

import {
    build_select_query_from_params,
} from './helper/sparql-code';

import H_PREFIXES from './prefixes';

type HardcodedGroup<ValueType extends PrimitiveValue=PrimitiveValue> = Record<DotFragment, ValueType>;
type HardcodedObjectType<ValueType extends PrimitiveValue=PrimitiveValue> = Record<DotFragment, HardcodedGroup<ValueType>>;
type HardcodedObjectCategory<ValueType extends PrimitiveValue=PrimitiveValue> = Record<DotFragment, HardcodedObjectType<ValueType>>;

function auto_type(h_tree: Record<DotFragment, HardcodedObjectCategory>): Record<DotFragment, HardcodedObjectCategory<TypedObject | PrimitiveValue>> {
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
                            type: si_type[0].toUpperCase()+si_type.slice(1),
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
    HardcodedObjectType<
        Omit<ValueType, 'type'> & {key: string}
    >
>;

type NoTypeOrKey<ValueType extends PrimitiveObject> = Record<
    DotFragment,
    HardcodedObjectType<
        Omit<ValueType, 'type' | 'key'>
    >
>;

function auto_key<
    ValueType extends PrimitiveObject
>(h_subtree: NoTypeOrKey<ValueType>): AddsKey<ValueType> {
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


export const H_HARDCODED_OBJECTS: Record<DotFragment, HardcodedObjectCategory> = auto_type({
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
                    queryFieldGroupPath: 'hardcoded#queryFieldGroup.sparql.dng.basic',
                    queryBuilderPath: 'hardcoded#queryBuilder.sparql.dng.flightSystemRequirements',
                },
                asr: {
                    label: 'Appendix Subsystem Requirements',
                    queryParametersPaths: [
                        'hardcoded#queryParameter.sparql.dng.sysvac',
                        'hardcoded#queryParameter.sparql.dng.maturity',
                    ],
                    queryFieldGroupPath: 'hardcoded#queryFieldGroup.sparql.dng.basic',
                    queryBuilderPath: 'hardcoded#queryBuilder.sparql.dng.flightSystemRequirements',
                },
            },
        },
    }),

    queryFieldGroup: {
        sparql: {
            dng: {
                basic: {
                    queryFieldsPaths: [
                        'hardcoded#queryField.sparql.dng.id',
                        'hardcoded#queryField.sparql.dng.requirementName',
                        'hardcoded#queryField.sparql.dng.requirementText',
                        'hardcoded#queryField.sparql.dng.keyDriver',
                        'hardcoded#queryField.sparql.dng.affectedSystems',
                        'hardcoded#queryField.sparql.dng.maturity',
                    ],
                },
            },
        },
    },

    queryField: auto_key<QueryField.Serialized>({
        sparql: {
            dng: {
                id: {
                    label: 'ID',
                    source: 'native',
                    value: null,
                    hasMany: false,
                },
                requirementName: {
                    label: 'Requirement Name',
                    source: 'native',
                    value: null,
                    hasMany: false,
                },
                requirementText: {
                    label: 'Requirement Text',
                    source: 'native',
                    value: null,
                    hasMany: false,
                },
                keyDriver: {
                    label: 'Key/Driver Indicator',
                    source: 'attribute',
                    value: 'Key/Driver [S]',
                    hasMany: true,
                },
                affectedSystems: {
                    label: 'Affected Systems',
                    source: 'attribute',
                    value: null,
                    hasMany: true,
                },
                maturity: {
                    label: 'Maturity',
                    source: 'attribute',
                    value: null,
                    hasMany: false,
                },
            },
        },
    }),

    queryBuilder: {
        sparql: {
            dng: {
                basicParams: build_select_query_from_params,
            },
        },
    },

    queryContext: {
        sparql: {
            dng: {
                prefixes: H_PREFIXES,
            },
        },
    },

    utility: {
        function: {
            sort: {
                label_asc: (g_a: Labeled, g_b: Labeled) => g_a.label < g_b.label? -1: 1,
            },
        },
    },
});

// const SparqlPatterns = {
//     predicate: (st_predicate: string): string => `$thing ${st_predicate} ?this .`,
//     dng_labeled_attribute: (st_predicate: string): string => {
//         const sx_prop = `?_${si_attr}`;

//         return `
//             ${sx_prop} a rdf:Property ;
//                 rdfs:label ${terse_lit(s_key)} .

//             $thing ${sx_prop} [rdfs:label ?${si_attr}Value] .
//         `;  
//     },
// };
