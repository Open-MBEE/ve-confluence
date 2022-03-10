import type {
	QueryParam,
	MmsSparqlQueryTable,
} from '#/element/QueryTable/model/QueryTable';

import type {MmsSparqlConnection} from '#/model/Connection';

import {
	ode,
} from '#/util/belt';

import {
	NoOpSparqlSelectQuery,
	SparqlQueryHelper,
	SparqlSelectQuery,
} from '../../util/sparql-endpoint';

import type {
	Hash,
	SparqlString,
} from '../types';

const terse_lit = (s: string) => `"${s.replace(/[\r\n]+/g, '').replace(/"/g, '\\"')}"`;

function attr(h_props: Hash, si_attr: string, s_attr_key: string) {
	const sx_prop = h_props[si_attr] = `?_${si_attr}`;

	return /* syntax: sparql */ `
		{
			${sx_prop} a rdf:Property ;
				rdfs:label ${terse_lit(s_attr_key)} .
		} union {
			${sx_prop}_decl a oslc:Property ;
				dct:title ?title ;
				oslc:propertyDefinition ${sx_prop} .

				filter(str(?title) = ${terse_lit(s_attr_key)})
		}

		?artifact ${sx_prop} [rdfs:label ?${si_attr}Value] .
	`;
}

const H_NATIVE_DNG_PATTERNS: Record<string, string> = {
	id: /* syntax: sparql */ `
		?artifact dct:identifier ?idValue .
	`,
	requirementName: /* syntax: sparql */ `
		?artifact dct:title ?requirementNameValue .
	`,
	requirementText: /* syntax: sparql */ `
		?artifact jazz_rm:primaryText ?requirementTextValue .
	`,
	affectedSystems: /* syntax: sparql */ `
		[
			rdf:subject ?artifact ;
			rdf:predicate <https://jpl.nasa.gov/msr/rm#linkType/Allocation> ;
			rdf:object ?affectedSystem ;
		] .

		?affectedSystem a oslc_rm:Requirement ;
			dct:title ?affectedSystemValue ;
			.
	`,
	children: /* syntax: sparql */ `
		optional {
			?children a oslc_rm:Requirement ;
				ibm_type:Decomposition ?artifact ;
				dct:title ?childrenValues ;
				.
		}
	`,
};

const H_NATIVE_DNG_PARAMS: Record<string, string> = {
	id: /* syntax: sparql */ `
		?artifact dct:identifier ?value .
	`,
	requirementName: /* syntax: sparql */ `
		?artifact dct:title ?value .
	`,
};

interface BuildConfig {
	bgp?: SparqlString;
}

export async function build_dng_select_param_query(this: MmsSparqlQueryTable, k_param: QueryParam, s_seach_text?: string): Promise<SparqlSelectQuery> {
	const a_bgp: string[] = [];

	const a_selects = [
		'?value',
		'(count(?artifact) as ?count)',
	];

	// get format for native parameters
	if(k_param.key in H_NATIVE_DNG_PARAMS) {
		a_bgp.push(H_NATIVE_DNG_PARAMS[k_param.key]);
	}
	// use property formatting for parameter
	else {
		a_bgp.push(`
			{
				?_attr a rdf:Property ;
					rdfs:label ${SparqlQueryHelper.literal(k_param.value)} .
			} union {
				?_attr_decl a oslc:Property ;
					dct:title ?title ;
					oslc:propertyDefinition ?_attr .

					filter(str(?title) = ${SparqlQueryHelper.literal(k_param.value)})
			}

			?artifact a oslc_rm:Requirement ;
				?_attr [rdfs:label ?value] .
		`);
	}

	// add filter for searching for parameters
	if(s_seach_text) {
		a_bgp.push(`
			filter contains(lcase(?value),"${s_seach_text.toLowerCase().replace(/"/g, '\\"').replace(/\n/g, '')}") 
		`);
	}

	const k_connection = await this.fetchConnection();

	return new SparqlSelectQuery({
		select: [...a_selects],
		from: `<${k_connection.modelGraph}>`,
		bgp: /* syntax: sparql */ `
			?artifact a oslc_rm:Requirement ;
				oslc:instanceShape [
					dct:title "Requirement"^^rdf:XMLLiteral ;
				] ;
			.
			# exclude requirements that are part of a requirement document
			filter not exists {
				?collection a oslc_rm:RequirementCollection ;
					oslc_rm:uses ?artifact ;
					.
			}
			${a_bgp.join('\n')}
		`,
		group: '?value order by desc(?count)',
	});
}

export async function build_dng_select_query_from_params(this: MmsSparqlQueryTable, gc_build?: BuildConfig): Promise<SparqlSelectQuery> {
	const a_bgp: string[] = [];
	const h_props = {};

	const {
		bgp: sq_bgp='',
	} = gc_build || {};

	const a_selects = [
		'?artifact',
	];

	const a_aggregates: string[] = [];

	// each param
	for(const {
		key: si_param, label: s_label,
	} of await this.queryType.fetchParameters()) {
		// fetch values list
		const k_list = this.parameterValuesList(si_param);

		// nothing selected for this param; skip it
		if(!k_list?.size) continue;

		// insert value filter
		a_bgp.push(/* syntax: sparql */ `
			${(si_param in H_NATIVE_DNG_PATTERNS)? '': attr(h_props, si_param, s_label)}

			values ?${si_param}Value {
				${[...this.parameterValuesList(si_param)].map(k => terse_lit(k.value)).join(' ')}
			}
		`);
	}

	// each field
	for(const {
		key: si_param,
		label: s_header,
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
					${attr(h_props, si_param, s_value)}
				}
			`);
		}
		// native source
		else if('native' === s_source) {
			if(si_param in H_NATIVE_DNG_PATTERNS) {
				a_bgp.push(H_NATIVE_DNG_PATTERNS[si_param]);

				if('children' === si_param) {
					a_aggregates.push(/* syntax: sparql */ `
						(group_concat(distinct ?${si_param}; separator='\\u0000') as ?${si_param})
					`);
				}
			}
		}
	}

	const k_connection = await this.fetchConnection();

	return new SparqlSelectQuery({
		count: '?artifact',
		select: [...a_selects, ...a_aggregates],
		from: `<${k_connection.modelGraph}>`,
		bgp: /* syntax: sparql */ `
			?artifact a oslc_rm:Requirement ;
				oslc:instanceShape [
					dct:title "Requirement"^^rdf:XMLLiteral ;
				] ;
				.

			# exclude requirements that are part of a requirement document
			filter not exists {
				?collection a oslc_rm:RequirementCollection ;
					oslc_rm:uses ?artifact ;
					.
			}

			${a_bgp.join('\n')}

			${sq_bgp || ''}
		`,
		group: a_aggregates.length ? a_selects.join(' ') : null,
		sort: [
			...a_selects.includes('?idValue')? ['asc(?idValue)']: [],
			'asc(?artifact)',
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

export function dng_detailer_query(this: MmsSparqlConnection, p_artifact: string): SparqlSelectQuery {
	return new SparqlSelectQuery({
		select: [
			'?idValue',
			'?requirementNameValue',
			'?requirementTextValue',
		],
		from: `<${this.modelGraph}>`,
		bgp: /* syntax: sparql */ `
			?artifact a oslc_rm:Requirement ;
				oslc:instanceShape [
					dct:title "Requirement"^^rdf:XMLLiteral ;
				] ;
				.

			# exclude requirements that are part of a requirement document
			filter not exists {
				?collection a oslc_rm:RequirementCollection ;
					oslc_rm:uses ?artifact ;
					.
			}
			
			${H_NATIVE_DNG_PATTERNS.id}

			${H_NATIVE_DNG_PATTERNS.requirementName}

			${H_NATIVE_DNG_PATTERNS.requirementText}

			values ?artifact {
				<${p_artifact}>
			}
		`,
	});
}

export function dng_searcher_query(this: MmsSparqlConnection, s_input: string, xm_types?: number): SparqlSelectQuery {
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
			h_criteria[1].push(`str(?idValue) = "${s_sanitized}"`);
		}

		if(xm_types & SearcherMask.ID_START) {
			b_id_candidate = true;
			h_criteria[3].push(`strStarts(?idValue, "${s_sanitized}")`);
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
			'?artifact',
			'?idValue',
			'?requirementNameValue',
			`(strLen(strBefore(lcase(?requirementNameValue), "${s_sanitized}")) as ?score)`,
		],
		from: `<${this.modelGraph}>`,
		bgp: /* syntax: sparql */ `
			?artifact a oslc_rm:Requirement ;
				oslc:instanceShape [
					dct:title "Requirement"^^rdf:XMLLiteral ;
				] ;
				.

			# exclude requirements that are part of a requirement document
			filter not exists {
				?collection a oslc_rm:RequirementCollection ;
					oslc_rm:uses ?artifact ;
					.
			}
			
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
