
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

export interface TypedObject<TypeValue extends string=string> extends JSONObject {
	type: TypeValue;
}

export interface KeyedObject extends JSONObject {
    key: string;
}

export interface LabeledObject extends JSONObject {
    label: string;
}

export type TypedKeyedObject<TypeValue extends string=string> = TypedObject<TypeValue> & KeyedObject;
export type TypedLabeledObject<TypeValue extends string=string> = TypedObject<TypeValue> & LabeledObject;
export type KeyedLabeledObject = KeyedObject & LabeledObject;

export type TypedKeyedLabeledObject<TypeValue extends string=string> = TypedObject<TypeValue> & KeyedObject & LabeledObject;


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


export interface QueryResult {
	type: string;
	value: string;
	datatype?: string;
	'xml:lang'?: string;
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
