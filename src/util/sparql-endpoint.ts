import G_META from '../common/meta';
import AsyncLockPool from './async-lock-pool';

type Hash = Record<string, string>;

export interface SparqlEndpointConfig {
	endpoint: string;
	prefixes?: Hash;
	concurrency?: number;
	variables?: Hash;
}

export type Binding = {
	type: 'uri';
	value: string;
} | {
	type: 'literal';
	value: string;
} | {
	type: 'literal';
	value: string;
	'xml:lang': string;
} | {
	type: 'literal';
	value: string;
	datatype: string;
} | {
	type: 'bnode';
	value: string;
};

export interface BindingMap {
	[variable: string]: Binding;
}

export type Bindings = Array<BindingMap>;

export type SparqlQuery = string | ((k_helper: SparqlQueryHelper) => string);

export class SparqlQueryHelper {
	_h_variables: Hash;

	constructor(h_variables: Hash) {
		this._h_variables = h_variables;
	}

	var(si_key: string, s_default: string | null=null) {
		if(!(si_key in this._h_variables)) {
			if(null !== s_default) return s_default;
			throw new Error(`SPARQL substitution variable not defined: '${si_key}'`);
		}
		return this._h_variables[si_key];
	}

	iri(p_iri: string) {
		// prevent injection attacks
		return p_iri.replace(/\s+/g, '+').replace(/>/g, '_');
	}

	literal(s_value: string, s_lang_or_datatype?: string) {
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
}

export class SparqlEndpoint {
	_p_endpoint: string;
	_h_prefixes: Hash;
	_kl_fetch: AsyncLockPool;
	_sq_prefixes: string;
	_k_helper: SparqlQueryHelper;

	constructor(gc_init: SparqlEndpointConfig) {
		this._p_endpoint = gc_init.endpoint;
		this._h_prefixes = gc_init.prefixes || {};
		this._kl_fetch = new AsyncLockPool(gc_init.concurrency || 1);
		this._sq_prefixes = Object.entries(this._h_prefixes).map(([si_prefix, p_iri]) => {
			return `prefix ${si_prefix}: <${p_iri}>\n`;
		}).join('');
		this._k_helper = new SparqlQueryHelper(gc_init.variables || {});
	}

	async auth() {
		// authenticate to access the named graph
		fetch(`${this._p_endpoint}/auth`, {
			method: 'POST',
			mode: 'cors',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			body: JSON.stringify({
				href: document.location.href,
				cookie: document.cookie,
			}),
		})
	}

	// submit SPARQL SELECT query
	async select(z_select: SparqlQuery): Promise<Bindings> {
		let sq_select = z_select;

		// apply helper
		if('function' === typeof z_select) {
			sq_select = z_select(this._k_helper);
		}

		// acquire async lock
		const f_release = await this._kl_fetch.acquire();

		// submit HTTP POST request
		const d_res = await fetch(this._p_endpoint, {
			method: 'POST',
			mode: 'cors',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/sparql-results+json',
			},
			body: new URLSearchParams({
				query: `${this._sq_prefixes}\n${sq_select}`,
			}),
		});

		// response not ok
		if(!d_res.ok) {
			throw new Error(`Neptune response not OK: '''\n${await d_res.text()}\n'''`);
		}

		// parse results as JSON
		const g_res = await d_res.json();

		// release async lock
		f_release();

		// return bindings
		return g_res.results.bindings;
	}
}

export default SparqlEndpoint;
