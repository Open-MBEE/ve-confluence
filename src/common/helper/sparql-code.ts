import type {
	MmsSparqlQueryTable,
} from '#/element/QueryTable/model/QueryTable';

import type {Mms5Connection} from '#/model/Connection';

import {
	ode,
} from '#/util/belt';

import {
	NoOpSparqlSelectQuery,
	SparqlSelectQuery,
} from '../../util/sparql-endpoint';

import type {
	Hash,
	SparqlString,
} from '../types';

const terse_lit = (s: string) => `"${s.replace(/[\r\n]+/g, '').replace(/"/g, '\\"')}"`;

function attr(h_props: Hash, si_attr: string, s_attr_key: string, p_edge: string, has_many: boolean) {
	const sx_prop = h_props[si_attr] = `?_${si_attr}`;

	const sx_value = `?${si_attr}Value${has_many ? 's' : ''}`;

	return p_edge
		? `?itemFields <${p_edge}>/:name ${sx_value} .`
		: /* syntax: sparql */ `
			${sx_prop}_decl a def:PickListOption ;
				:pickList/:name ${terse_lit(s_attr_key)} ;
				:name ${sx_value} ;
				.

			?itemFields ${sx_prop} ${sx_prop}_decl .
		`;
}

const H_NATIVE_DNG_PATTERNS: Record<string, string> = {
	id: /* syntax: sparql */ `
		?item :documentKey ?idValue .
	`,
	requirementName: /* syntax: sparql */ `
		?itemFields :name ?requirementNameValue .
	`,
	requirementText: /* syntax: sparql */ `
		?itemFields :description ?requirementTextValue .
	`,
	children: /* syntax: sparql */ `
		optional {
			?relationship
				:relationshipType/:name "Decomposition" ;
				:fromItem ?item ;
				:toItem ?children ;
				.
			
			?children :fields/:name ?childrenValues .
		}
	`,
};

interface BuildConfig {
	bgp?: SparqlString;
}

export async function build_dng_select_query_from_params(this: MmsSparqlQueryTable, gc_build?: BuildConfig): Promise<SparqlSelectQuery> {
	const a_bgp: string[] = [];
	const h_props = {};

	const {
		bgp: sq_bgp='',
	} = gc_build || {};

	const a_selects = [
		'?item',
	];

	const a_aggregates: string[] = [];
	const a_values: string[] = [];

	// each param
	for(const {
		key: si_param,
		label: s_label,
		value: s_value,
		edge: p_edge,
	} of await this.queryType.fetchParameters()) {
		// fetch values list
		const k_list = this.parameterValuesList(si_param);

		// nothing selected for this param; skip it
		if(!k_list?.size) continue;

		// insert value filter
		a_values.push(/* syntax: sparql */ `
			values ?${si_param}Value {
				${[...this.parameterValuesList(si_param)].map(k => terse_lit(k.value)).join(' ')}
			}
		`);
		
		if(!(si_param in H_NATIVE_DNG_PATTERNS)) {
			a_bgp.push(attr(h_props, si_param, s_value, p_edge, false));
		}
	}

	// each field
	for(const {
		key: si_param,
		label: s_header,
		edge: p_edge,
		source: s_source,
		value: s_value,
		hasMany: b_many,
	} of this.queryType.fields) {
		// attr already captured from filter; select value variable and skip it
		if(si_param in h_props) {
			a_selects.push(`?${si_param}Value`);
			continue;
		}

		// many cardinality; group concat variable
		if(b_many) {
			a_aggregates.push(/* syntax: sparql */ `
				(group_concat(distinct ?${si_param}Values; separator='\\u0000') as ?${si_param}Value)
			`);
		}
		// select the value variable
		else {
			a_selects.push(`?${si_param}Value`);
		}

		// attribute source
		if('attribute' === s_source) {
			// insert binding pattern fragment
			a_bgp.push(/* syntax: sparql */ `
				optional {
					${attr(h_props, si_param, s_value, p_edge, b_many)}
				}
			`);
		}
		// native source
		else if('native' === s_source) {
			if(si_param in H_NATIVE_DNG_PATTERNS) {
				a_bgp.push(H_NATIVE_DNG_PATTERNS[si_param]);
				if ('children' === si_param) {
					a_aggregates.push(`
						(group_concat(distinct ?children; separator='\\u0000') as ?childrenArtifact)
					`)
				}
			}
		}
	}

	const sx_query = /* syntax: sparql */ `
		hint:Query hint:joinOrder "Ordered" .
		#hint:Query hint:useDFE true .
		
		?item a def:Item ;
			:itemType/:display "MSR_Requirement" ;
			:fields ?itemFields ;
			.

		# # exclude requirements that are part of a requirement document
		#filter exists {
		#	?artifact jazz_nav:parent ?parent .
		#}
		${sq_bgp || ''}
		${a_bgp.join('\n')}
		${a_values.join('\n')}
	`;

	return new SparqlSelectQuery({
		count: '?item',
		select: [...a_selects, ...a_aggregates],
		bgp: sx_query,
		group: a_aggregates.length ? a_selects.join(' ') : null,
		sort: [
			...a_selects.includes('?idValue')? ['asc(?idValue)']: [],
		],
	});
}

export enum SearcherMask {
	DEFAULT = 0,
	ID_EXACT = 1 << 0,
	ID_START = 1 << 1,
	NAME_EXACT = 1 << 2,
	NAME_START = 1 << 3,
	NAME_CONTAINS = 1 << 4,
	ALL = 0xffff,
}

export function dng_detailer_query(this: Mms5Connection, p_item: string): SparqlSelectQuery {
	return new SparqlSelectQuery({
		select: [
			'?idValue',
			'?requirementNameValue',
			'?requirementTextValue',
		],
		bgp: /* syntax: sparql */ `
		
			hint:Query hint:joinOrder "Ordered" .
			#hint:Query hint:useDFE true .
			values ?item {
				<${p_item}>
			}
			?item a def:Item ;
				:itemType/:display "MSR_Requirement" ;
				:fields ?itemFields ;
				.

			## exclude requirements that are part of a requirement document
			#filter exists {
			#	?artifact jazz_nav:parent ?parent .
			#}
			
			${H_NATIVE_DNG_PATTERNS.id}

			${H_NATIVE_DNG_PATTERNS.requirementName}

			${H_NATIVE_DNG_PATTERNS.requirementText}
		`,
	});
}

export function dng_searcher_query(this: Mms5Connection, s_input: string, xm_types?: number): SparqlSelectQuery {
	// criteria for searching
	const h_criteria = {
		1: [],
		2: [],
		3: [],
		4: [],
	} as Record<string, string[]>;

	// sanitize input string
	const s_sanitized = s_input.trim()
		.replace(/[\r\n]/g, '')
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"');

	// default to all
	xm_types ||= SearcherMask.ALL;

	// an id candidate requires ensuring requirement name is non-emtpy
	let b_id_candidate = false;

	// multirank-ness
	let b_multirank = false;

	// id candidate
	if(/^\d+$/.test(s_sanitized)) {
		if(xm_types & SearcherMask.ID_EXACT) {
			b_id_candidate = true;
			h_criteria[1].push(`str(?idValue) = "MSR-MSRREQ-${s_sanitized}"`);
		}

		if(xm_types & SearcherMask.ID_START) {
			b_id_candidate = true;
			h_criteria[3].push(`strStarts(?idValue, "MSR-MSRREQ-${s_sanitized}")`);
		}
	}

	// requirement name exact
	if(xm_types & SearcherMask.NAME_EXACT) {
		h_criteria[1].push(`str(lcase(?requirementNameValue)) = "${s_sanitized}"`);
	}

	// requirement name start
	if(xm_types & SearcherMask.NAME_START) {
		h_criteria[2].push(`strStarts(lcase(?requirementNameValue), "${s_sanitized}")`);
	}

	// requirement name contains
	if(xm_types & SearcherMask.NAME_CONTAINS && s_sanitized.length > 1) {
		h_criteria[4].push(`contains(lcase(?requirementNameValue), "${s_sanitized}")`);
	}

	// filter criteria
	const a_criteria = ode(h_criteria).filter(([, a]) => a.length);

	// no criteria; return no-op
	if(!a_criteria.length) return new NoOpSparqlSelectQuery();

	// set multirank-ness
	b_multirank = a_criteria.length > 1;

	// build query
	return new SparqlSelectQuery({
		count: '?artifact',
		select: [
			...b_multirank? ['?rank']: [],
			'?item',
			'?idValue',
			'?requirementNameValue',
			`(strLen(strBefore(lcase(?requirementNameValue), "${s_sanitized}")) as ?score)`,
		],
		bgp: /* syntax: sparql */ `
			hint:Query hint:joinOrder "Ordered" .
			#hint:Query hint:useDFE true .
			
			?item a def:Item ;
				:itemType/:display "MSR_Requirement" ;
				:fields ?itemFields ;
				.

			## exclude requirements that are part of a requirement document
			#filter exists {
			#	?artifact jazz_nav:parent ?parent .
			#}
			${H_NATIVE_DNG_PATTERNS.id}

			${H_NATIVE_DNG_PATTERNS.requirementName}

			hint:Prior hint:rangeSafe 'true' .

			${b_id_candidate? `filter(str(?requirementNameValue) != "")`: ''}

			${b_multirank /* eslint-disable @typescript-eslint/indent */
				? `
					bind(${a_criteria.reverse().reduce((s_out, [si_priority, a_conditions]) => `
						if(${a_conditions.join(' || ')}, ${si_priority}, ${s_out})
					`.trim(), '0')} as ?rank)

					filter(?rank > 0)
				`
				: `filter(${a_criteria.reduce((a_out, [, a_conditions]) => [
					...a_out,
					a_conditions.join(' || '),
				], [] as string[]).join(' || ')})`}
			`,

		sort: [
			...b_multirank? ['asc(?rank)']: [],
			'asc(?score)',
			'asc(?requirementNameValue)',
		],
	});
}
