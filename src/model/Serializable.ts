import type {
	DotFragment,
	JsonObject,
	JsonValue,
	PrimitiveObject,
	PrimitiveValue,
	TypedKeyedUuidedObject,
} from '#/common/types';

import type {VeoPath} from '#/common/veo';

import type {ObjectStore} from '#/model/ObjectStore';

import type {
	ConfluenceDocument,
	ConfluencePage,
} from '#/vendor/confluence/module/confluence';

import type XHTMLDocument from '#/vendor/confluence/module/xhtml-document';

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
	store: ObjectStore;
	source: XHTMLDocument;
	page: ConfluencePage;
	document: ConfluenceDocument;
}


export function deep_clone<InType extends Serializable | Primitive>(gc_serialized: InType): InType {
	type OutType = InType[Extract<keyof InType, string>];

	const gc_out = {} as InType;

	for(const si_key in gc_serialized) {
		const z_test = gc_serialized[si_key];
		let w_out: OutType = z_test;

		switch(typeof z_test) {
			// pass-by-value primitive
			case 'undefined':
			case 'boolean':
			case 'number':
			case 'bigint':
			case 'string': {
				w_out = z_test;
				break;
			}

			// do-not-clone and do-not-modify
			case 'symbol':
			case 'function': {
				w_out = z_test;
				break;
			}

			// object
			case 'object': {
				// array
				if(Array.isArray(z_test)) {
					// not empty
					if(z_test.length) {
						// infer type from first item
						const z_test_0 = z_test[0];
						switch(typeof z_test_0) {
							// pass-by-value
							case 'boolean':
							case 'number':
							case 'bigint':
							case 'string': {
								// shallow clone array
								w_out = z_test.slice(0) as OutType;
								break;
							}

							// pass-by-ref; deep clone array
							default: {
								// @ts-expect-error accept odd parameter types
								w_out = z_test.map(deep_clone);
								break;
							}
						}
					}
					// clone empty
					else {
						w_out = [] as unknown as OutType;
					}
				}
				// null
				else if(null === z_test) {
					w_out = null as OutType;
				}
				// not array; deep clone
				else {
					w_out = deep_clone(z_test as Primitive) as unknown as OutType;
				}

				break;
			}

			default: {
				throw new Error(`typeof ${z_test+''} === '${typeof z_test}' ??`);
			}
		}

		// set value
		gc_out[si_key] = w_out;
	}

	// return
	return gc_out;
}

export function deep_hash_object(gc_serialized: Serializable | Primitive): string {
	const a_keys = Object.keys(gc_serialized).sort();
	const a_fields = [];

	for(const si_key of a_keys) {
		const z_test = gc_serialized[si_key];
		let s_out = '';

		switch(typeof z_test) {
			// stringifyable
			case 'boolean':
			case 'number':
			case 'string': {
				s_out = JSON.stringify(z_test);
				break;
			}

			case 'undefined': {
				s_out = 'undefined';
				break;
			}

			case 'bigint': {
				s_out = z_test+'n';
				break;
			}

			// do-not-clone and do-not-modify
			case 'symbol':
			case 'function': {
				s_out = z_test.toString();
				break;
			}

			case 'object': {
				if(null === z_test) {
					s_out = 'null';
				}
				else if(Array.isArray(z_test)) {
					// @ts-expect-error accept odd parameter type
					s_out = '['+z_test.map(deep_hash_object).join(',')+']';
				}
				else {
					s_out = deep_hash_object(z_test as Primitive);
				}
				break;
			}

			default: {
				throw new Error(`cannot deep hash ${z_test+''}`);
			}
		}

		a_fields.push(`"${si_key}":${s_out}`);
	}

	return '{'+a_fields.join(',')+'}';
}

export type VeOdmConstructor<
	Serialized extends Serializable | Primitive,
	InstanceType extends VeOdm<Serialized>,
> = {
	new(sp_path: VeoPath.Full, gc_serialized: Serialized, g_context: Context): InstanceType;
};

export abstract class VeOdm<Serialized extends Serializable | Primitive> {
	static async createFromSerialized<
		Serialized extends Serializable | Primitive,
		InstanceType extends VeOdm<Serialized>,
	>(dc_model: VeOdmConstructor<Serialized, InstanceType>, sp_path: VeoPath.Full, gc_serialized: Serialized, g_context: Context): Promise<InstanceType> {
		return await (new dc_model(sp_path, gc_serialized, g_context)).ready();
	}

	private _b_ready = false;
	private readonly _a_awaits: (() => void)[] = [];
	private readonly _a_restores: ((k_new: this) => Promise<void>)[] = [];

	protected _sp_path: VeoPath.Full;
	protected readonly _gc_serialized: Serialized;
	protected readonly _gc_serialized_init: Serialized;
	protected _g_context: Context;
	protected _k_store: ObjectStore;

	constructor(sp_path: VeoPath.Full, gc_serialized: Serialized, g_context: Context) {
		this._sp_path = sp_path;
		this._gc_serialized = deep_clone(gc_serialized);
		this._gc_serialized_init = gc_serialized;
		this._g_context = g_context;
		this._k_store = g_context.store;

		// start init
		this.initSync();
		this.init()
			.then(() => {
				this._b_ready = true;
				const a_awaits = this._a_awaits;
				while(a_awaits.length) {
					const fk_resolve = a_awaits.shift()!;
					fk_resolve();
				}
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

	/**
	 * Modify the serialized object
	 */
	protected _assign(gc_assign: Partial<Serializable>): this {
		Object.assign(this._gc_serialized, gc_assign);
		return this;
	}

	get path(): VeoPath.Full {
		return this._sp_path;
	}

	get type(): string {
		return this._gc_serialized.type;
	}

	// eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-empty-function
	async init(): Promise<void> {}

	// eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-empty-function
	initSync(): void {}

	async restore(): Promise<this> {
		// restore from init
		const k_new = await VeOdm.createFromSerialized(this.constructor as VeOdmConstructor<Serialized, this>, this._sp_path, this._gc_serialized_init, this._g_context);

		// call restores
		const a_restores = this._a_restores;
		while(a_restores.length) {
			const fk_restore = a_restores.pop();
			await fk_restore!(k_new);
		}

		return k_new;
	}

	onRestore(fk_restore: (k_new: this) => Promise<void>): void {
		this._a_restores.push(fk_restore);
	}

	async ready(): Promise<this> {
		if(!this._b_ready) {
			return await new Promise((fk_resolve) => {
				this._a_awaits.push(() => {
					fk_resolve(this);
				});
			});
		}

		return this;
	}

	getContext(): Context {
		return this._g_context;
	}

	async save(s_message=''): Promise<JsonObject> {
		return this._k_store.commit(this._sp_path, this.toSerialized() as Serializable, s_message);
	}

	toSerialized(): Serialized {
		return this._gc_serialized;
	}

	hash(): string {
		return deep_hash_object(this._gc_serialized);
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

export abstract class VeOdmPageElement<
	Serialized extends TypedKeyedUuidedObject,
> extends VeOdmKeyed<Serialized> {
	get uuid(): string {
		return this._gc_serialized.uuid;
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


export type SchemaVersion = `${number}.${number}`;

export interface MetadataBundleVersionDescriptor extends JsonObject {
	number: number;
	message: string;
}

export interface MetadataShape<TypeString extends string=string> extends PrimitiveObject {
	type: TypeString;
	schema: SchemaVersion;
	paths: Record<VeoPath.Full, PrimitiveValue>;
}

export interface MetadataBundle<
	ObjectType extends MetadataShape,
	StorageInfoType extends JsonObject=JsonObject,
> extends PrimitiveObject {
	schema: SchemaVersion;
	version: MetadataBundleVersionDescriptor;
	storage: StorageInfoType;
	data: ObjectType;
}

export interface JsonMetadataShape<TypeString extends string=string> extends JsonObject {
	type: TypeString;
	schema: SchemaVersion;
	paths: Record<VeoPath.Full, JsonValue>;
}

export interface JsonMetadataBundle<
	ObjectType extends JsonMetadataShape=JsonMetadataShape,
	StorageInfoType extends JsonObject=JsonObject,
> extends JsonObject {
	schema: SchemaVersion;
	version: MetadataBundleVersionDescriptor;
	storage: StorageInfoType;
	data: ObjectType;
}


export abstract class SerializationLocation<
	ObjectType extends MetadataShape=MetadataShape,
> {
	readonly isReadOnly!: boolean;
	readonly isSynchronous!: boolean;

	abstract fetchMetadataBundle(b_force?: boolean): Promise<MetadataBundle<ObjectType> | null>;
}

export abstract class SynchronousSerializationLocation<
	ObjectType extends MetadataShape=MetadataShape,
> extends SerializationLocation<ObjectType> {
	abstract getMetadataBundle(): MetadataBundle<ObjectType> | null;

	fetchMetadataBundle(): Promise<MetadataBundle<ObjectType> | null> {
		return Promise.resolve(this.getMetadataBundle());
	}
}

export abstract class ReadonlySynchronousSerializationLocation<
	ObjectType extends MetadataShape=MetadataShape,
> extends SynchronousSerializationLocation<ObjectType> {
	readonly isReadOnly: true = true;
	readonly isSynchronous: true = true;
}

export abstract class AsynchronousSerializationLocation<
	ObjectType extends JsonMetadataShape=JsonMetadataShape,
> extends SerializationLocation<ObjectType> {
	readonly isSynchronous: false = false;
}

export abstract class WritableAsynchronousSerializationLocation<
	ObjectType extends JsonMetadataShape=JsonMetadataShape,
> extends AsynchronousSerializationLocation<ObjectType> {
	readonly isReadOnly: false = false;

	abstract writeMetadataObject(g_bundle: ObjectType, g_version: MetadataBundleVersionDescriptor): Promise<JsonObject>;

	abstract writeMetadataValue(w_value: PrimitiveValue, a_frags: DotFragment[], s_message?: string): Promise<JsonObject>;
}
