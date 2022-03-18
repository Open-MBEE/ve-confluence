import type { JsonValue } from "#/common/types";

type Split<S extends string, D extends string> = S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S];

type TakeLast<V> = V extends []
	? never
	: V extends [string]
		? V[0]
		: V extends [string, ...infer R]
			? TakeLast<R>
			: never;

type TrimLeft<V extends string> = V extends ` ${infer R}` ? TrimLeft<R> : V;

type TrimRight<V extends string> = V extends `${infer R} ` ? TrimRight<R> : V;

type Trim<V extends string> = TrimLeft<TrimRight<V>>;

type StripModifier<V extends string, M extends string> = V extends `${infer L}${M}${infer A}` ? L : V;

type StripModifiers<V extends string> = StripModifier<
	StripModifier<
		StripModifier<
			StripModifier<V, '.'>, '#'
		>,
	'['>,
':'>;

type TakeLastAfterToken<V extends string, T extends string> = StripModifiers<
	TakeLast<
		Split<
			Trim<V>, T
		>
	>
>;

type GetLastElementName<V extends string> = TakeLastAfterToken<
	TakeLastAfterToken<V, ' '>,
	'>'
>;

type GetEachElementName<V, L extends string[] = []> = V extends []
	? L
	: V extends [string]
		? [...L, GetLastElementName<V[0]>]
		: V extends [string, ...infer R]
			? GetEachElementName<R, [...L, GetLastElementName<V[0]>]>
			: [];

type GetElementNames<V extends string> = GetEachElementName<Split<V, ','>>;

type ElementByName<V extends string> = V extends keyof HTMLElementTagNameMap
	? HTMLElementTagNameMap[V]
	: V extends keyof SVGElementTagNameMap
		? SVGElementTagNameMap[V]
		: Element;

type MatchEachElement<V, L extends Element = Element> = V extends []
	? L
	: V extends [string]
		? L | ElementByName<V[0]>
		: V extends [string, ...infer R]
			? MatchEachElement<R, L | ElementByName<V[0]>>
			: L;

type QueryResult<T extends string> = MatchEachElement<GetElementNames<T>>;

export const qs = <T extends string>(dm_node: ParentNode | HTMLElement, sq_selector: T): QueryResult<T> => dm_node.querySelector(sq_selector) as QueryResult<T>;

export const qsa = <T extends string>(dm_node: ParentNode | HTMLElement, sq_selector: T): QueryResult<T>[] => Array.prototype.slice.call(dm_node.querySelectorAll(sq_selector), 0);

export function dd<T extends HTMLElement = HTMLElement>(
	s_tag: string,
	h_attrs: Record<string, string | number | boolean>={},
	a_children: (Element | string)[]=[],
	d_doc=document
): T {
	const dm_node = d_doc.createElement(s_tag);

	for(const si_attr in h_attrs) {
		dm_node.setAttribute(si_attr, h_attrs[si_attr]+'');
	}

	for(const w_child of a_children) {
		dm_node.append(w_child);
	}

	return dm_node as T;
}


const S_UUID_V4 = 'xxxxxxxx_xxxx_4xxx_yxxx_xxxxxxxxxxxx';
const R_UUID_V4 = /[xy]/g;

export const uuid_v4 = (s_delim='_'): string => {
	let dt_now = Date.now();
	if('undefined' !== typeof performance) dt_now += performance.now();
	let s_uuid_v4 = S_UUID_V4;
	if('_' !== s_delim) s_uuid_v4 = s_uuid_v4.replace(/_/g, s_delim);
	return s_uuid_v4.replace(R_UUID_V4, (s) => {
		const x_r = (dt_now + (Math.random()*16)) % 16 | 0;
		dt_now = Math.floor(dt_now / 16);
		return ('x' === s? x_r: ((x_r & 0x3) | 0x8)).toString(16);
	});
};

export const encode_attr = (h: Record<string, unknown>): string => btoa(JSON.stringify(h));

export const decode_attr = (sx: string): JsonValue | null => sx? JSON.parse(atob(sx)) as JsonValue: null;

export const parse_html = (sx_html: string): Document => new DOMParser().parseFromString(sx_html, 'text/html');

export const serialize_dom = (d_doc: Document): string => new XMLSerializer()
	.serializeToString(d_doc.body).trim()
	.replace(/^<body[^>]*>|<\/body>$/g, '').trim()
	.replace(/\xa0/g, '&nbsp;');


export function remove_all_children(dm_parent: HTMLElement): HTMLElement {
	while(dm_parent.firstChild) {
		dm_parent.removeChild(dm_parent.firstChild);
	}

	return dm_parent;
}

export const timeout = (xt_wait: number) => new Promise((fk_resolve) => {
	setTimeout(() => {
		fk_resolve(void 0);
	}, xt_wait);
});

// complete page
export const dm_page = document.getElementById('page') as HTMLDivElement;

// container
export const dm_container = document.getElementById('full-height-container') as HTMLDivElement;

// main page
export const dm_main = document.getElementById('main') as HTMLDivElement;

// main content
export const dm_content = document.getElementById('main-content') as HTMLDivElement;

// main header
export const dm_main_header = document.getElementById('main-header') as HTMLDivElement;

// // sidebar
// export const dm_sidebar = document.getElementsByClassName('ia-fixed-sidebar').item(0) as HTMLDivElement;

