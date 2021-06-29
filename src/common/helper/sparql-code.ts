import type {
	MmsSparqlQueryTable,
} from '../../model/QueryTable';
import { SparqlSelectQuery } from '../../util/sparql-endpoint';
import type { Hash } from '../types';

const terse_lit = (s: string) =>
	`"${s.replace(/[\r\n]+/g, '').replace(/"/g, '\\"')}"`;

function attr(
	h_props: Hash,
	si_attr: string,
	s_attr_key: string,
	b_many = false,
) {
	const sx_prop = (h_props[si_attr] = `?_${si_attr}`);

	if (!s_attr_key) debugger;
	return `
		${sx_prop} a rdf:Property ;
			rdfs:label ${terse_lit(s_attr_key)} .

		?artifact ${sx_prop} [rdfs:label ?${si_attr}Value] .
	`;
}

// export function build_select_query_from_params(h_params: Record<string, QueryParam>, h_fields: Record<string, Field>={}): SelectQuery {
export async function build_dng_select_query_from_params(
	this: MmsSparqlQueryTable,
): Promise<SparqlSelectQuery> {
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
	for (const {
		key: si_param,
		label: s_label,
	} of await this.getParameters()) {
		// fetch values list
		const k_list = this.parameterValuesList(si_param);

		// nothing selected for this param; skip it
		if (!k_list?.size) continue;

		// insert value filter
		a_bgp.push(`
            ${attr(h_props, si_param, s_label)}

            values ?${si_param}Value {
                ${[...this.parameterValuesList(si_param)]
					.map((k) => terse_lit(k.value))
					.join(' ')}
            }
        `);
	}

	// each field
	for (const {
		key: si_param,
		label: s_header,
		value: s_value,
		hasMany: b_many,
	} of this.fields) {
		// attr already captured from filter; select value variable and skip it
		if (si_param in h_props) {
			a_selects.push(`?${si_param}Value`);
			continue;
		}

		// many cardinality; group concat variable
		if (b_many) {
			a_aggregates.push(
				/* syntax: sparql */ `(group_concat(distinct ?${si_param}Values; separator='\\u0000') as ?${si_param}Value)`,
			);
		}
		// select the value variable
		else {
			a_selects.push(`?${si_param}Value`);
		}

		// insert binding pattern fragment
		a_bgp.push(`
			optional {
				${attr(h_props, si_param, s_value, b_many)}
			}
		`);
	}

	const k_connection = await this.getConnection();

	return new SparqlSelectQuery({
		count: '?artifact',
		select: [...a_selects, ...a_aggregates],
		from: `<${k_connection.modelGraph}>`,
		bgp: /* syntax: sparql */ `
			?artifact a oslc_rm:Requirement ;
				dct:identifier ?identifierValue ;
				dct:title ?titleValue ;
				jazz_rm:primaryText ?primaryTextValue ;
				.

			${a_bgp.join('\n')}
		`,
		group: a_aggregates.length ? a_selects.join(' ') : null,
	});
}
