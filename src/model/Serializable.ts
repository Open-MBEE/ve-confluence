import type { ObjectStore } from '../class/object-store';
import type {
	JSONObject, TypedObject, TypedPrimitive,
} from '../common/types';


export interface Serializable extends TypedObject {}
export interface Primitive extends TypedPrimitive {}

export interface Context {
    store: ObjectStore;
}

export abstract class VeOdm<Serialized extends Serializable | Primitive> {
    private _b_ready = false;
    private _a_awaits: (() => void)[] = [];

    protected _gc_serialized: Serialized;
    protected _g_context: Context;
    protected _k_store: ObjectStore;

    constructor(gc_serialized: Serialized, g_context: Context) {
        this._gc_serialized = gc_serialized;
        this._g_context = g_context;
        this._k_store = g_context.store;

        this.init().then(() => {
            this._b_ready = true;
            for(const fk_resolve of this._a_awaits) {
                fk_resolve();
            }
            this._a_awaits.length = 0;
        });
    }

    ready(): Promise<void> {
        if(!this._b_ready) {
            return new Promise((fk_resolve) => {
                this._a_awaits.push(fk_resolve);
            });
        }

        return Promise.resolve();
    }

    async init(): Promise<void> {}

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

export interface VeOrmClass<Serialized extends Serializable> {
    new(gc_serialized: Serialized, g_context: Context): VeOdm<Serialized>;
}

