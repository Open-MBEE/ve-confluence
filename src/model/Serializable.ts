import type {
	JSONObject,
} from '../common/types';


export interface Serializable extends JSONObject {
    type: string;
}

export abstract class PresentationElement<Serialized extends Serializable> {
    protected _gc_serialized: Serialized;

    constructor(gc_serialized: Serialized) {
        this._gc_serialized = gc_serialized;
    }

    toSerialized(): Serialized {
        return this._gc_serialized;
    }
}

export interface PresentationElementClass<Serialized extends Serializable> {
    new(gc_serialized: Serialized): PresentationElement<Serialized>;
}

