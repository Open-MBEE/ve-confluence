import type {
	Hash,
	SparqlBindings,
} from '../common/types';

import type {ConnectionQuery} from '#/element/QueryTable/model/QueryTable';

import AsyncLockPool from './async-lock-pool';

export interface SparqlEndpointConfig {
	endpoint: string;
	prefixes?: Hash;
	concurrency?: number;
	variables?: Hash;
}

export type SparqlQuery = string | ((k_helper: SparqlQueryHelper) => string);

export class SparqlQueryHelper {
	static iri(p_iri: string): string {
		// prevent injection attacks
		return p_iri.replace(/\s+/g, '+').replace(/>/g, '_');
	}

	static literal(s_value: string, s_lang_or_datatype?: string): string {
		// post modifier
		let s_post = '';
		if(s_lang_or_datatype) {
			// language tag
			if(s_lang_or_datatype.startsWith('@')) {
				s_post = s_lang_or_datatype;
			}
			// datatype
			else {
				s_post = `^^${s_lang_or_datatype}`;
			}
		}

		// escape dirks
		return `"""${s_value.replace(/"/g, '\\"')}"""${s_post}`;
	}

	_h_variables: Hash;

	constructor(h_variables: Hash) {
		this._h_variables = h_variables;
	}

	var(si_key: string, s_default: string | null = null): string {
		if(!(si_key in this._h_variables)) {
			if(null !== s_default) return s_default;
			throw new Error(
				`SPARQL substitution variable not defined: '${si_key}'`
			);
		}
		return this._h_variables[si_key];
	}
}

export class SparqlEndpoint {
	_p_endpoint: string;
	_h_prefixes: Hash;
	_kl_fetch: AsyncLockPool;
	_sq_prefixes: string;
	_k_helper: SparqlQueryHelper;
	_token = '';

	constructor(gc_init: SparqlEndpointConfig) {
		this._p_endpoint = gc_init.endpoint;
		this._h_prefixes = gc_init.prefixes || {};
		this._kl_fetch = new AsyncLockPool(gc_init.concurrency || 1);
		this._sq_prefixes = Object.entries(this._h_prefixes)
			.map(([si_prefix, p_iri]) => `prefix ${si_prefix}: <${p_iri}>\n`)
			.join('');
		this._k_helper = new SparqlQueryHelper(gc_init.variables || {});
	}

	setAuth(token: string) {
		this._token = token;
	}

	// submit SPARQL SELECT query
	async select(z_select: string | SparqlQuery, fk_controller?: (d_controller: AbortController) => void): Promise<SparqlBindings> {
		let sq_select = z_select as string;

		// apply helper
		if('function' === typeof z_select) {
			sq_select = z_select(this._k_helper);
		}

		// acquire async lock
		const f_release = await this._kl_fetch.acquire();

		// new abort controller
		const d_controller = new AbortController();
		const w_abort_signal = d_controller.signal;

		// controller callback
		if(fk_controller) fk_controller(d_controller);

		// submit HTTP POST request
		let d_res!: Response;
		try {
			d_res = await fetch(this._p_endpoint, {
				method: 'POST',
				mode: 'cors',
				headers: {
					'Content-Type': 'application/sparql-query',
					'Accept': 'application/sparql-results+json',
					'Authorization': `Bearer ${this._token}`,
				},
				body: `${this._sq_prefixes}\n${sq_select}`,
				signal: w_abort_signal,
			});
		}
		catch(e_fetch: unknown) {
			// release lock
			f_release();

			// throw out
			throw e_fetch;
		}

		// response not ok
		if(!d_res.ok) {
			throw new Error(
				`Neptune response not OK: '''\n${await d_res.text()}\n'''`
			);
		}

		// parse results as JSON
		const g_res = (await d_res.json()) as {
			results: {
				bindings: SparqlBindings;
			};
		};

		// release async lock
		f_release();

		// return bindings
		return g_res.results.bindings;
	}
}

interface SelectQueryDescriptor {
	count?: string;
	select?: string[];
	from?: string;
	bgp: string;
	group?: string | null;
	sort?: string[];
}

function stringify_select_query_descriptor(g_desc: SelectQueryDescriptor): string {
	let s_select = '*';
	let s_from = '';
	let s_tail = '';

	if(g_desc.select) s_select = g_desc.select.join(' ');
	if(g_desc.from) s_from += /* syntax: sparql */ ` from ${g_desc.from}`;
	if(g_desc.group) s_tail += /* syntax: sparql */ ` group by ${g_desc.group}`;
	if(g_desc.sort?.length) s_tail += /* syntax: sparql */ ` order by ${g_desc.sort.join(' ')}`;

	return /* syntax: sparql */ `
		select ${s_select} ${s_from} {
			${g_desc.bgp}
		} ${s_tail}
	`;
}

export class SparqlSelectQuery implements ConnectionQuery {
	protected _gc_query: SelectQueryDescriptor;

	constructor(gc_query: SelectQueryDescriptor) {
		this._gc_query = gc_query;
	}

	paginate(n_limit: number, n_offset = 0): string {
		return stringify_select_query_descriptor(this._gc_query)+` limit ${n_limit} offset ${n_offset}`;
	}

	count(): string {
		const g_desc = {...this._gc_query};
		delete g_desc.group;

		return stringify_select_query_descriptor({
			...g_desc,
			select: [`(count(distinct ${g_desc.count || '*'}) as ?count)`],
		});
	}

	all(): string {
		return stringify_select_query_descriptor(this._gc_query);
	}
}

export class NoOpSparqlSelectQuery extends SparqlSelectQuery {
	/* eslint-disable class-methods-use-this */
	constructor() {
		super({} as SelectQueryDescriptor);
	}

	paginate(): string {
		return '';
	}

	count(): string {
		return '';
	}

	all(): string {
		return '';
	}
	/* eslint-enable class-methods-use-this */
}

export namespace Sparql {
	export function literal(
		s_value: string,
		s_lang_or_datatype?: string
	): string {
		// post modifier
		let s_post = '';
		if(s_lang_or_datatype) {
			// language tag
			if(s_lang_or_datatype.startsWith('@')) {
				s_post = s_lang_or_datatype;
			}
			// datatype
			else {
				s_post = `^^${s_lang_or_datatype}`;
			}
		}

		return '"""' + s_value.replace(/"/g, '\\"') + '"""' + s_post;
	}

	export function iri(p_iri: string): string {
		// prevent injection attacks
		return p_iri.replace(/\s+/g, '+').replace(/>/g, '_');
	}
}

export default SparqlEndpoint;
