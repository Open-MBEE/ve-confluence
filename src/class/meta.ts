import type {
	JSONValue,
    Labeled,
} from '../common/types';

export type DotFragment = string;

export namespace VePath {
    export type Location = 'document' | 'page' | 'hardcoded';

    export type Full<
        Storage extends Location=Location,
        Category extends DotFragment=DotFragment,
        Type extends DotFragment=DotFragment,
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = `${Storage}#${Category}.${Type}.${Group}.${Id}`;

    export type DocumentObject<
        Category extends DotFragment=DotFragment,
        Type extends DotFragment=DotFragment,
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = Full<'document', Category, Type, Group, Id>;

    export type Connection<
        Type extends DotFragment=DotFragment,
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = DocumentObject<'connection', Type, Group, Id>;
    
    export type SparqlConnection<
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = Connection<'sparql', Group, Id>;
    
    export type MmsSparqlConnection<
        Id extends DotFragment=DotFragment
    > = SparqlConnection<'mms', Id>;
    

    export type HardcodedObject<
        Category extends DotFragment=DotFragment,
        Type extends DotFragment=DotFragment,
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = Full<'hardcoded', Category, Type, Group, Id>;


    export type QueryHeaders<
        Type extends DotFragment=DotFragment,
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = HardcodedObject<'query_headers', Type, Group, Id>;
    
    export type SparqlQueryHeaders<
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = QueryHeaders<'sparql', Group, Id>;

    export type DngSparqlQueryHeaders<
        Id extends DotFragment=DotFragment
    > = SparqlQueryHeaders<'dng', Id>;


    export type QueryType<
        Type extends DotFragment=DotFragment,
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = HardcodedObject<'query_type', Type, Group, Id>;
    
    export type SparqlQueryType<
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = QueryType<'sparql', Group, Id>;

    export type DngSparqlQueryType<
        Id extends DotFragment=DotFragment
    > = SparqlQueryType<'dng', Id>;


    export type QueryParameter<
        Type extends DotFragment=DotFragment,
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = HardcodedObject<'query_parameter', Type, Group, Id>;
    
    export type SparqlQueryParameter<
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = QueryParameter<'sparql', Group, Id>;

    export type DngSparqlQueryParameter<
        Id extends DotFragment=DotFragment
    > = SparqlQueryParameter<'dng', Id>;


    export type QueryContext<
        Type extends DotFragment=DotFragment,
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = HardcodedObject<'query_context', Type, Group, Id>;
    
    export type SparqlQueryContext<
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = QueryParameter<'sparql', Group, Id>;

    export type DngSparqlQueryContext<
        Id extends DotFragment=DotFragment
    > = SparqlQueryParameter<'dng', Id>;


    export type Utility<
        Type extends DotFragment=DotFragment,
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = HardcodedObject<'utility', Type, Group, Id>;
    
    export type Function<
        Group extends DotFragment=DotFragment,
        Id extends DotFragment=DotFragment
    > = Utility<'function', Group, Id>;
    
    export type SortFunction<
        Id extends DotFragment=DotFragment
    > = Utility<'sort', Id>;

    
}


export interface PrimitiveObject {
	[k: string]: PrimitiveValue;
}

export type PrimitiveValue = JSONValue | Function | PrimitiveObject;

type HardcodedObjectType = Record<DotFragment, PrimitiveValue>;
type HardcodedObjectCategory = Record<DotFragment, HardcodedObjectType>;


const H_HARDCODED_OBJECTS: Record<DotFragment, HardcodedObjectCategory> = {
    query_parameter: {
        sparql: {
            dng: {
                level: {
                    key: 'Level',
                    sort: (g_a: Labeled, g_b: Labeled) => g_a.label < g_b.label? -1: 1,
                },
                sysvac: {
                    key: 'System VAC',
                },
                maturity: {
                    key: 'Maturity',
                },
            },
        },
    },

    query_type: {
        sparql: {
            dng: {
                afsr: {
                    label: 'Appendix Flight Systems Requirements',
                },
                asr: {
                    label: 'Appendix Subsystem Requirements',
                },
            },
        },
    },

    query_headers: {
        sparql: {
            dng: {
                basic: [
                    {
                        label: 'ID',
                    },
                    {
                        label: 'Requirement Name',
                    },
                    {
                        label: 'Requirement Text',
                    },
                    {
                        label: 'Key/Driver Indicator',
                    },
                    {
                        label: 'Affected Systems',
                    },
                    {
                        label: 'Maturity',
                    },
                ],
            },
        },
    },

    query_context: {
        sparql: {
            dng: {
                prefixes: {

                },
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
};


function describe_path_attempt(a_frags: string[], i_frag: number) {
    const nl_frags = a_frags.length;
    if(i_frag === nl_frags - 1) return a_frags.join('.');

    const s_current = a_frags.slice(0, i_frag+1).join('.');
    const s_rest = a_frags.slice(i_frag+1).join('.');

    return `${s_current}[.${s_rest}]`;
}

function access<Type extends PrimitiveValue>(h_map: PrimitiveObject, a_frags: string[]): Type {
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
        const b_terminal = i_frag === nl_frags-1;

        // access thing
        const z_thing = z_node[s_frag];

        // deduce type
        const s_type = typeof z_thing;
        switch(s_type) {
            // undefined
            case 'undefined': {
                throw new Error(`Cannot access thing '${describe_path_attempt(a_frags, i_frag)}' since it is undefined`);
            }

            // object
            case 'object': {
                // null
                if(null === z_thing) {
                    // not terminal
                    if(!b_terminal) {
                        throw new Error(`While accessing '${describe_path_attempt(a_frags, i_frag)}'; encountered null part-way thru`);
                    }
                    // terminal
                    else {
                        return z_thing as Type;
                    }
                }
                // array or dict; traverse
                else {
                    z_node = z_thing as PrimitiveObject;
                    continue;
                }
            }

            // primitive
            default: {
                if(!b_terminal) {
                    throw new Error(`While accessing '${describe_path_attempt(a_frags, i_frag)}'; encountered primitive value "${z_thing}" part-way thru`);
                }
                else {
                    return z_thing as Type;
                }
            }
        }
    }

    throw new Error(`Code route not reachable`);
}

export function resolve_meta_object_sync<
    ValueType extends PrimitiveValue,
    VePathType extends VePath.HardcodedObject=VePath.HardcodedObject
>(sp_path: string): ValueType {
    const a_parts = sp_path.split('#');

    if(2 !== a_parts.length) {
        throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
    }
    
    const [si_storage, s_frags] = a_parts as [VePath.Location, string];
    const a_frags = s_frags.split('.') as DotFragment[];

    if(si_storage !== 'hardcoded') {
        throw new Error(`Cannot synchronously access non-hardcoded storage type '${si_storage}'`);
    }

    return access<ValueType>(H_HARDCODED_OBJECTS, a_frags);
}

export async function resolve_meta_object<
    ValueType extends PrimitiveValue,
    VePathType extends VePath.Full=VePath.Full
>(sp_path: string): Promise<ValueType> {
    const a_parts = sp_path.split('#');
    if(2 !== a_parts.length) {
        throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
    }

    const [si_storage, s_frags] = a_parts as [VePath.Location, string];
    const a_frags = s_frags.split('.') as DotFragment[];

    switch(si_storage) {
        case 'document': {
            break;
        }

        case 'page': {
            break;
        }

        case 'hardcoded': {
            return access<ValueType>(H_HARDCODED_OBJECTS, a_frags);
        }

        default: {
            throw new Error(`Unmapped VePath storage parameter '${si_storage}'`);
        }
    }

    throw new Error(`Code route not reachable`);
}
