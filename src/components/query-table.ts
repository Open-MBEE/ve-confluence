import type { SparqlQuery } from "../util/sparql-endpoint";

type Hash = Record<string, string>;

const terse_lit = (s: string) => `"${s.replace(/[\r\n]+/g, '').replace(/"/g, '\\"')}"`;

function attr(h_props: Hash, si_attr: string, s_key: string, b_many=false) {
	const sx_prop = h_props[si_attr] = `?_${si_attr}`;

	return `
		${sx_prop} a rdf:Property ;
			rdfs:label ${terse_lit(s_key)} .

		?artifact ${sx_prop} [rdfs:label ?${si_attr}Value] .
	`;
}

interface Param {
	key: string;
	selected: string[];
}

interface Field {
	key: string;
	label?: string;
	array?: boolean;
}


export function build_select_query(h_params: Record<string, Param>, h_fields: Record<string, Field>={}): SparqlQuery {
	const a_bgp: string[] = [];
	const h_props = {};

	const a_selects = [
		'?artifact',
		'?identifierValue',
		'?primaryTextValue',
		'?levelvalue',
		'?titleValue',
	];

	const a_aggregates: string[] = [];

	// each param
	for(const [si_param, g_param] of Object.entries(h_params)) {
		// nothing selected for this param; skip it
		if(!g_param.selected.length) continue;

		// insert value filter
		a_bgp.push(`
			${attr(h_props, si_param, g_param.key)}

			values ?${si_param}Value {
				${g_param.selected.map(s => terse_lit(s)).join(' ')}
			}
		`);
	}

	// each field
	for(const [si_field, g_field] of Object.entries(h_fields)) {
		// attr already captured from filter; skip it
		if(si_field in h_props) {
			// select the value variable
			a_selects.push(`?${si_field}Value`);

			continue;
		}

		let b_many = false;

		if(g_field.array) {
			a_aggregates.push(/* syntax: sparql */ `(group_concat(distinct ?${si_field}Values; separator='\\u0000') as ?${si_field}Value)`);
			b_many = true;
		}
		else {
			// select the value variable
			a_selects.push(`?${si_field}Value`);
		}

		// insert binding pattern fragment
		a_bgp.push(`
			optional {
				${attr(h_props, si_field, g_field.key, b_many)}
			}
		`);
	}

	return k => /* syntax: sparql */ `
		select ${a_selects.join(' ')} ${a_aggregates.join(' ')} from ${k.var('DATA_GRAPH')} {
			?artifact a oslc_rm:Requirement ;
				dct:identifier ?identifierValue ;
				dct:title ?titleValue ;
				jazz_rm:primaryText ?primaryTextValue ;
				.

			${a_bgp.join('\n')}
		} ${a_aggregates.length? `group by ${a_selects.join(' ')}`: ''}
	`;
}