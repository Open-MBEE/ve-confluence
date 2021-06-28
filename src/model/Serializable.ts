import type { ObjectStore } from '../class/object-store';
import type {
	JSONObject, LabeledObject, LabeledPrimitive, TypedKeyedLabeledObject, TypedKeyedLabeledPrimitive, TypedKeyedObject, TypedKeyedPrimitive, TypedLabeledObject, TypedLabeledPrimitive, TypedObject, TypedPrimitive,
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

        this.initSync();

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

    initSync(): void{}

    get type() {
        return this._gc_serialized.type;
    }

    // protected _create<CreationSerialized extends Serializable>(
    //     dc_class: {new(gc_serialized: CreationSerialized, g_context: Context): VeOdm<CreationSerialized>},
    //     gc_serialized: CreationSerialized,
    // ): VeOdm<CreationSerialized> {
    //     return new dc_class(gc_serialized, this._g_context);
    // }

    toSerialized(): Serialized {
        return this._gc_serialized;
    }
}

export abstract class VeOdmLabeled<Serialized extends TypedLabeledObject | TypedLabeledPrimitive> extends VeOdm<Serialized> {
    get label(): string {
        return this._gc_serialized.label;
    }
}

export abstract class VeOdmKeyed<Serialized extends TypedKeyedObject | TypedKeyedPrimitive> extends VeOdm<Serialized> {
    get key(): string {
        return this._gc_serialized.key;
    }
}

export abstract class VeOdmKeyedLabeled<Serialized extends TypedKeyedLabeledObject | TypedKeyedLabeledPrimitive> extends VeOdm<Serialized> {
    get label(): string {
        return this._gc_serialized.label;
    }

    get key(): string {
        return this._gc_serialized.key;
    }
}

export interface VeOrmClass<Serialized extends Serializable | Primitive> {
    new(gc_serialized: Serialized, g_context: Context): VeOdm<Serialized>;
}

