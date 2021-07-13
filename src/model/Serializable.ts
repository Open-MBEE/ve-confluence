import type {IObjectStore,} from '#/common/types';

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

	protected _gc_serialized: Serialized;
	protected _g_context: Context;
	protected _k_store: IObjectStore;

	constructor(gc_serialized: Serialized, g_context: Context) {
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
				for (const fk_resolve of this._a_awaits) {
					fk_resolve();
				}
				this._a_awaits.length = 0;
			})
			.catch(() => {
				let s_serialized = '(unable to stringify - see Error details)';
				try {
					s_serialized = JSON.stringify(this._gc_serialized);
				} catch (e_stringify) {
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

	// protected _create<CreationSerialized extends Serializable>(
	//     dc_class: {new(gc_serialized: CreationSerialized, g_context: Context): VeOdm<CreationSerialized>},
	//     gc_serialized: CreationSerialized,
	// ): VeOdm<CreationSerialized> {
	//     return new dc_class(gc_serialized, this._g_context);
	// }

	async save(): Promise<boolean> {
		console.log("It's saving.");
		return true;
	}

	fromSerialized(serialized: Serialized): void {
		this._gc_serialized = serialized;
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
