import type {
    DotFragment,
    PrimitiveObject,
    PrimitiveValue,
    Labeled,
} from '../common/types';

import {

} from '../class/meta';
import H_PREFIXES from './prefixes';

type HardcodedObjectType = Record<DotFragment, PrimitiveValue>;
type HardcodedObjectCategory = Record<DotFragment, HardcodedObjectType>;


export const H_HARDCODED_OBJECTS: Record<DotFragment, HardcodedObjectCategory> = {
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
};
