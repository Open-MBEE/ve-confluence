
export type Hash = Record<string, string>;

export type UrlString = `${'http' | 'https'}://${string}`;

export interface JSONObject {
	[k: string]: JSONValue;
}

export type JSONValue = string | number | boolean | null | JSONValue[] | JSONObject;

export interface PrimitiveObject {
	[k: string]: PrimitiveValue;
}

export type PrimitiveValue = JSONValue | Function | PrimitiveObject;


export type SparqlString = string;

export type SparqlBinding = {
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


export interface SparqlQueryResult {

}

export interface SparqlBindingMap {
	[variable: string]: SparqlBinding;
}

export type SparqlBindings = Array<SparqlBindingMap>;


export interface Labeled {
	label: string;
}

export type CompareFunction<Type> = (w_a: Type, w_b: Type) => -1 | 0 | 1;

export type DotFragment = string;
