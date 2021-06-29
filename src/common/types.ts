export type Hash = Record<string, string>;

export type UrlString = `${'http' | 'https'}://${string}`;

export interface JSONObject {
	[k: string]: JSONValue | undefined;
}

export type JSONValue =
	| string
	| number
	| boolean
	| null
	| JSONValue[]
	| JSONObject
	| undefined;

export interface PrimitiveObject {
	[k: string]: PrimitiveValue | PrimitiveValue[];
}

export type PrimitiveValue =
	| JSONValue
	| Function  // eslint-disable-line @typescript-eslint/ban-types
	| PrimitiveObject
	| PrimitiveValue[];

export interface TypedObject<TypeValue extends string = string>
	extends Omit<JSONObject, 'type'> {
	type: TypeValue;
}

export interface TypedPrimitive<TypeValue extends string = string>
	extends Omit<PrimitiveObject, 'type'> {
	type: TypeValue;
}

export interface KeyedObject extends Omit<JSONObject, 'key'> {
	key: string;
}

export interface LabeledObject extends Omit<JSONObject, 'label'> {
	label: string;
}

export interface KeyedPrimitive extends Omit<PrimitiveObject, 'key'> {
	key: string;
}

export interface LabeledPrimitive extends Omit<PrimitiveObject, 'label'> {
	label: string;
}

export interface ValuedObject {
	value: string;
}

export type TypedKeyedObject<TypeValue extends string = string> =
	TypedObject<TypeValue> & KeyedObject;
export type TypedLabeledObject<TypeValue extends string = string> =
	TypedObject<TypeValue> & LabeledObject;
export type KeyedLabeledObject = KeyedObject & LabeledObject;

export type ValuedLabeledObject = ValuedObject & LabeledObject;

export type TypedKeyedLabeledObject<TypeValue extends string = string> =
	TypedObject<TypeValue> & KeyedObject & LabeledObject;

export type TypedKeyedPrimitive<TypeValue extends string = string> =
	TypedPrimitive<TypeValue> & KeyedPrimitive;
export type TypedLabeledPrimitive<TypeValue extends string = string> =
	TypedPrimitive<TypeValue> & LabeledPrimitive;
export type TypedKeyedLabeledPrimitive<TypeValue extends string = string> =
	TypedKeyedPrimitive<TypeValue> & LabeledPrimitive;

export type SparqlString = string;

export type SparqlBinding =
	| {
		type: 'uri';
		value: string;
	}
	| {
		type: 'literal';
		value: string;
	}
	| {
		type: 'literal';
		value: string;
		'xml:lang': string;
	}
	| {
		type: 'literal';
		value: string;
		datatype: string;
	}
	| {
		type: 'bnode';
		value: string;
	};

export interface QueryResult {
	type: string;
	value: string;
	datatype?: string;
	'xml:lang'?: string;
}

export type QueryRow = Record<string, QueryResult>;

export interface SparqlBindingMap {
	[variable: string]: SparqlBinding;
}

export type SparqlBindings = Array<SparqlBindingMap>;

export interface Labeled {
	label: string;
}

export type CompareFunction<Type> = (w_a: Type, w_b: Type) => -1 | 0 | 1;

export type DotFragment = string;
