import type {MmsSparqlQueryTable} from '#/element/QueryTable/model/QueryTable';

import {SparqlSelectQuery} from '../../util/sparql-endpoint';

import type {Hash, SparqlString} from '../types';

const terse_lit = (s: string) => `"${s.replace(/[\r\n]+/g, '').replace(/"/g, '\\"')}"`;

function attr(h_props: Hash, si_attr: string, s_attr_key: string, b_many=false) {
	const sx_prop = h_props[si_attr] = `?_${si_attr}`;

	if(!s_attr_key) debugger;
	return /* syntax: sparql */ `
		${sx_prop} a rdf:Property ;
			rdfs:label ${terse_lit(s_attr_key)} .

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
			${attr(h_props, si_param, s_label)}

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
					${attr(h_props, si_param, s_value, b_many)}
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

			${a_bgp.join('\n')}

			${sq_bgp || ''}
		`,
		group: a_aggregates.length ? a_selects.join(' ') : null,
	});
}
