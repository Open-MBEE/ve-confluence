import type {IObjectStore, JsonValue, PrimitiveValue} from '#/common/types';
import type { VeoPath } from '#/common/veo';

import type {
	TypedKeyedLabeledObject,
	TypedKeyedLabeledPrimitive,
	TypedKeyedObject,
	TypedKeyedPrimitive,
	TypedLabeledObject,
	TypedLabeledPrimitive,
	TypedObject,
	TypedPrimitive,
} from '../common/types';

export type Serializable = TypedObject;
export type Primitive = TypedPrimitive;

export interface Context {
	store: IObjectStore;
}

export abstract class VeOdm<Serialized extends Serializable | Primitive> {
	private _b_ready = false;
	private _a_awaits: (() => void)[] = [];

	protected _sp_path: VeoPath.Full;
	protected _gc_serialized: Serialized;
	protected _g_context: Context;
	protected _k_store: IObjectStore;

	constructor(sp_path: VeoPath.Full, gc_serialized: Serialized, g_context: Context) {
		this._sp_path = sp_path;
		this._gc_serialized = gc_serialized;
		this._g_context = g_context;
		this._k_store = g_context.store;
		this.bootstrap();
	}

	bootstrap(): void {
		this.initSync();

		this.init()
			.then(() => {
				this._b_ready = true;
				for(const fk_resolve of this._a_awaits) {
					fk_resolve();
				}
				this._a_awaits.length = 0;
			})
			.catch(() => {
				let s_serialized = '(unable to stringify - see Error details)';
				try {
					s_serialized = JSON.stringify(this._gc_serialized);
				}
				catch(e_stringify) {
				}
				throw new Error(`ERROR: While asynchronously initializing ${this.constructor.name} with ${s_serialized}`);
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

	// eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-empty-function
	async init(): Promise<void> {}

	// eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-empty-function
	initSync(): void {}

	get type(): string {
		return this._gc_serialized.type;
	}

	getContext(): Context {
		return this._g_context;
	}

	// protected _create<CreationSerialized extends Serializable>(
	//     dc_class: {new(gc_serialized: CreationSerialized, g_context: Context): VeOdm<CreationSerialized>},
	//     gc_serialized: CreationSerialized,
	// ): VeOdm<CreationSerialized> {
	//     return new dc_class(gc_serialized, this._g_context);
	// }

	async save(): Promise<boolean> {
		return this._k_store.commit(this._sp_path, this.toSerialized());
	}

	fromSerialized(gc_serialized: Serialized): void {
		this._gc_serialized = gc_serialized;
		this.bootstrap();
	}

	toSerialized(): Serialized {
		return this._gc_serialized;
	}
}

export abstract class VeOdmLabeled<
	Serialized extends TypedLabeledObject | TypedLabeledPrimitive,
> extends VeOdm<Serialized> {
	get label(): string {
		return this._gc_serialized.label;
	}
}

export abstract class VeOdmKeyed<
	Serialized extends TypedKeyedObject | TypedKeyedPrimitive,
> extends VeOdm<Serialized> {
	get key(): string {
		return this._gc_serialized.key;
	}
}

export abstract class VeOdmKeyedLabeled<
	Serialized extends TypedKeyedLabeledObject | TypedKeyedLabeledPrimitive,
> extends VeOdm<Serialized> {
	get label(): string {
		return this._gc_serialized.label;
	}

	get key(): string {
		return this._gc_serialized.key;
	}
}

export interface VeOrmClass<Serialized extends Serializable | Primitive> {
	new (gc_serialized: Serialized, g_context: Context): VeOdm<Serialized>;
}



export abstract class SerializationLocation {
	readonly isReadOnly!: boolean;
	readonly isSynchronous!: boolean;

	abstract fetchMetadata(b_force?: boolean): Promise<JsonValue | PrimitiveValue>;
}

export abstract class SynchronousSerializationLocation extends SerializationLocation {
	abstract getMetadata(): JsonValue | PrimitiveValue;
}

export abstract class ReadonlySynchronousSerializationLocation extends SynchronousSerializationLocation {
	readonly isReadOnly: true = true;
	readonly isSynchronous: true = true;
}

export abstract class AsynchronousSerializationLocation extends SerializationLocation {
	readonly isSynchronous: false = false;
}

export abstract class WritableAsynchronousSerializationLocation extends AsynchronousSerializationLocation {
	readonly isReadOnly: false = false;

	abstract writeMetadata(): Promise<boolean>;
}
