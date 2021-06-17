
export type Hash = Record<string, string>;

export type UrlString = `${'http' | 'https'}://${string}`;

export interface JSONObject {
	[k: string]: JSONValue;
}

export type JSONValue = string | number | boolean | null | JSONValue[] | JSONObject;

export type SparqlString = string;

export interface Labeled {
	label: string;
}

export type CompareFunction<Type> = (w_a: Type, w_b: Type) => -1 | 0 | 1;
