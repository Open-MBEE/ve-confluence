import type {
	DotFragment,
	JsonObject,
	JsonValue,
	PrimitiveObject,
	PrimitiveValue,
} from '#/common/types';

import type {VeoPath} from '#/common/veo';

import type {ObjectStore} from '#/model/ObjectStore';
import type { ConfluenceDocument, ConfluencePage } from '#/vendor/confluence/module/confluence';
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

export abstract class VeOdm<Serialized extends Serializable | Primitive> {
	private _b_ready = false;
	private _a_awaits: (() => void)[] = [];

	protected _sp_path: VeoPath.Full;
	protected _gc_serialized: Serialized;
	protected _g_context: Context;
	protected _k_store: ObjectStore;

	constructor(sp_path: VeoPath.Full, gc_serialized: Serialized, g_context: Context) {
		this._sp_path = sp_path;
		this._gc_serialized = gc_serialized;
		this._g_context = g_context;
		this._k_store = g_context.store;
		this.bootstrap();
	}

	get path(): VeoPath.Full {
		return this._sp_path;
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

	async save(s_message=''): Promise<JsonObject> {
		return this._k_store.commit(this._sp_path, this.toSerialized() as Serializable, s_message);
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
