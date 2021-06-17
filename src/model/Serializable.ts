import type {
	JSONObject,
} from '../common/types';


export interface Serializable extends JSONObject {
    type: string;
}

export interface Context {}

export abstract class PresentationElement<Serialized extends Serializable> {
    protected _gc_serialized: Serialized;
    protected _g_context: Context;

    constructor(gc_serialized: Serialized, g_context: Context) {
        this._gc_serialized = gc_serialized;
        this._g_context = g_context;

        this.init();
    }

    init() {}

    get type() {
        return this._gc_serialized.type;
    }

    // protected create<CreationSerialized extends Serializable>(
    //     dc_class: {new(gc_serialized: CreationSerialized, g_context: Context): PresentationElement<CreationSerialized>},
    //     gc_serialized: CreationSerialized,
    // ): PresentationElement<CreationSerialized> {
    //     return new dc_class(gc_serialized, this._g_context);
    // }

    toSerialized(): Serialized {
        return this._gc_serialized;
    }
}

export interface PresentationElementClass<Serialized extends Serializable> {
    new(gc_serialized: Serialized, g_context: Context): PresentationElement<Serialized>;
}

