
import type {
	Instantiable,
	PrimitiveValue,
	PathOptions,
	DotFragment,
	PrimitiveObject,
	JsonObject,
	TypedLabeledPrimitive,
} from '#/common/types';

import {
	NL_PATH_FRAGMENTS,
	ResolvePath,
	VeoPathTarget,
} from '#/common/veo';

import type {
	Context,
	Primitive,
	Serializable,
	SerializationLocation,
	SynchronousSerializationLocation,
	VeOdm,
	WritableAsynchronousSerializationLocation,
} from '#/model/Serializable';

import {oderom} from '#/util/belt';



class UnhandledLocationError extends Error {
	_si_storage: VeoPathTarget;
	_a_frags: DotFragment[];

	constructor(sp_path: VeoPathTarget, si_storage: VeoPathTarget, a_frags: DotFragment[]) {
		super(`VE Path ${si_storage} location not handled: '${sp_path}'`);
		this._si_storage = si_storage;
		this._a_frags = a_frags;
	}

	get location() {
		return this._si_storage;
	}

	get frags() {
		return this._a_frags;
	}
}


function parse_path(sp_path: VeoPathTarget): [VeoPathTarget, DotFragment[]] {
	const m_parts = /^([\w_0-9-]+)#(.+)$/.exec(sp_path);

	if(!m_parts) {
		debugger;
		throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
	}

	const [, si_storage, s_frags] = m_parts as unknown as [string, VeoPathTarget, string];
	const a_frags = s_frags.split('.');

	return [si_storage, a_frags];
}


type LocationHash = Record<VeoPathTarget, SerializationLocation>;


function describe_path_attempt(a_frags: string[], i_frag: number): string {
	const nl_frags = a_frags.length;
	if(i_frag === nl_frags - 1) return a_frags.join('.');

	const s_current = a_frags.slice(0, i_frag + 1).join('.');
	const s_rest = a_frags.slice(i_frag + 1).join('.');

	return `${s_current}[.${s_rest}]`;
}

export function access<Type extends PrimitiveValue>(h_map: PrimitiveObject, a_frags: string[]): Type {
	const nl_frags = a_frags.length;

	// empty path
	if(!nl_frags) {
		throw new TypeError(`Cannot access object using empty path frags`);
	}

	// node for traversing
	let z_node = h_map;

	if(!h_map) {
		console.error(`Encountered undefined value while trying to access path in object store -- must be using an outdated schema`);
		debugger;
	}

	// each frag
	for(let i_frag=0; i_frag<nl_frags; i_frag++) {
		const s_frag = a_frags[i_frag];

		// wildcard
		if('*' === s_frag) {
			const sp_parent = a_frags.slice(0, i_frag).join('.');

			return oderom(z_node, (si_key, w_value) => ({
				[`${sp_parent}.${si_key}`]: w_value,
			})) as Type;
		}
		// recursive wildcard
		else if('**' === s_frag) {
			const sp_parent = a_frags.slice(0, i_frag).join('.');

			for(; i_frag<NL_PATH_FRAGMENTS; i_frag++) { // TODO what's going on here
				debugger;
				for(const si_part in z_node) {
					const z_child = z_node[si_part];
					debugger;
				}
			}

			return oderom(z_node, (si_key, w_value) => ({
				[`${sp_parent}.${si_key}`]: w_value,
			})) as Type;
		}

		// access thing
		const z_thing = z_node[s_frag];

		// terminal
		if(i_frag === nl_frags-1) {
			return z_thing as Type;
		}

		// deduce type
		const s_type = typeof z_thing;
		switch(s_type) {
			// undefined
			case 'undefined': {
				debugger;
				throw new Error(`Cannot access thing '${describe_path_attempt(a_frags, i_frag)}' since it is undefined`);
			}

			// object
			case 'object': {
				// null
				if(null === z_thing) {
					throw new Error(`While accessing '${describe_path_attempt(a_frags, i_frag)}'; encountered null part-way thru`);
				}
				// array or dict; traverse
				else {
					z_node = z_thing as PrimitiveObject;
					continue;
				}
			}

			// primitive
			default: {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				throw new Error(`While accessing '${describe_path_attempt(a_frags, i_frag)}'; encountered primitive value "${z_thing}" part-way thru`);
			}
		}
	}

	throw new Error(`Code route not reachable`);
}


export class ObjectStore {
	protected _h_locations!: LocationHash;

	constructor(h_locations: LocationHash) {
		this._h_locations = h_locations;
	}

	protected async _explode<
		ValueType extends Serializable | Primitive,
		ClassType extends VeOdm<ValueType>,
	>(sp_target: VeoPathTarget, g_context: Context, c_frags: number, dc_class: Instantiable<ValueType, ClassType>): Promise<PathOptions<ValueType, ClassType>> {
		const h_options = (await this.resolve(sp_target)) as Record<string, unknown>;

		let h_out: PathOptions<ValueType, ClassType> = {};

		if(c_frags < NL_PATH_FRAGMENTS-1) { // TODO check NL_PATH_FRAGMENTS impact //doesnt' work for shorter paths
			for(const si_frag in h_options) {
				h_out = {
					...h_out,
					...await this._explode(`${sp_target}.${si_frag}`, g_context, c_frags+1, dc_class),
				};
			}
		}
		else {
			for(const si_frag in h_options) {
				const sp_full = `${sp_target}.${si_frag}`;
				h_out = {
					...h_out,
					[sp_full]: dc_class? new dc_class(sp_full, h_options[si_frag] as ValueType, g_context): h_options[si_frag],
				};
			}
		}

		return h_out;
	}

	protected _parse_path(sp_path: VeoPathTarget): [VeoPathTarget, DotFragment[], SerializationLocation] {
		const [si_storage, a_frags] = parse_path(sp_path);

		if(!(si_storage in this._h_locations)) {
			throw new Error(`No such location '${si_storage}'`);
		}

		return [si_storage, a_frags, this._h_locations[si_storage]];
	}

	protected _parse_path_sync(sp_path: VeoPathTarget): [VeoPathTarget, DotFragment[], SynchronousSerializationLocation] {
		const [si_storage, a_frags, k_location] = this._parse_path(sp_path);

		if(!k_location.isSynchronous) {
			throw new Error(`Cannot synchronously access asynchronous storage type '${si_storage}'`);
		}

		return [si_storage, a_frags, k_location as SynchronousSerializationLocation];
	}

	static locationPart(sp_path: string): string {
		return sp_path.split('#')[0];
	}

	// eslint-disable-next-line class-methods-use-this
	idPartSync(sp_path: string): string[] {
		const a_parts = sp_path.split('#');

		if(2 !== a_parts.length) {
			throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
		}

		const [, s_frags] = a_parts as [VeoPathTarget, string];
		const a_frags = s_frags.split('.');

		return a_frags.slice(3);
	}


	/**
	 * Deduces all the available objects given a 'hardcoded#...' Veo Path pattern and constructs instance of the objects in memory
	 */
	optionsSync<
		PathString extends VeoPathTarget,
		ValueType extends ResolvePath<PathString, TypedLabeledPrimitive>,
		ClassType extends VeOdm<ValueType>,
	>(sp_path: PathString, g_context: Context, dc_class: Instantiable<ValueType, ClassType>): Record<string, ClassType> {
		const sp_parent = sp_path.replace(/\.[^.]+$/, '');
		const h_options = this.resolveSync(sp_parent);
		return oderom(h_options, (si_key, w_value) => ({
			[`${sp_parent}.${si_key}`]: new dc_class(`${sp_parent}.${si_key}`, w_value as ValueType, g_context),
		}));
	}


	/**
	 * Deduces all the available objects given a locatable Veo Path pattern and constructs instance of the objects in memory
	 */
	async options<
		ValueType extends Serializable | Primitive,
		ClassType extends VeOdm<ValueType>=VeOdm<ValueType>,
	>(sp_path: VeoPathTarget, g_context: Context, dc_class?: Instantiable<ValueType, ClassType>): Promise<PathOptions<ValueType, ClassType>> {
		const a_frags = sp_path.split('.');
		const nl_frags = a_frags.length;

		let sp_target!: VeoPathTarget;

		if(nl_frags < NL_PATH_FRAGMENTS-1) { // TODO check
			if('**' === a_frags[nl_frags-1]) {
				sp_target = a_frags.slice(0, -1).join('.');
			}
			else {
				throw new Error(`Invalid path target: '${sp_path}'`);
			}
		}
		else {
			sp_target = sp_path.replace(/\.[^.]+$/, '');
		}

		return this._explode<ValueType, ClassType>(sp_target, g_context, nl_frags, dc_class!);
	}


	/**
	 * Resolves a synchronously accessible Veo Path string (currently only 'hardcoded#...') to the raw data it references (i.e., primitive value)
	 */
	resolveSync<
		PathString extends VeoPathTarget,
		ValueType extends ResolvePath<PathString, TypedLabeledPrimitive>,
	>(sp_path: PathString): ValueType {
		const [si_storage, a_frags, k_location] = this._parse_path_sync(sp_path);

		// fetch ve4 data
		const g_bundle = k_location.getMetadataBundle();

		// no metadata bundle; error
		if(!g_bundle) {
			throw new Error(`Location '${si_storage}' exists but is missing a metadata bundle`);
		}

		// fetch metadata
		const g_metadata = g_bundle.data || null;

		// no data
		if(!g_metadata) {
			throw new Error(`Location '${si_storage}' has a metadata bundle but its data is emtpy`);
		}

		// no paths
		if(!g_metadata.paths) {
			debugger;

			// auto-migrate old schema
			const as_keys = new Set(Object.keys(g_metadata));
			as_keys.delete('type');
			as_keys.delete('schema');

			const h_paths: Record<string, any> = {};

			for(const si_key of as_keys) {
				h_paths[si_key] = g_metadata[si_key];
				delete g_metadata[si_key];
			}

			g_metadata.paths = h_paths;
		}

		return access<ValueType>(g_metadata.paths, a_frags);
	}


	/**
	 * Resolves a Veo Path string to the raw data it references (i.e., deserialized JSON or primitive value)
	 */
	async resolve<
		PathString extends VeoPathTarget=VeoPathTarget,
		ValueType extends ResolvePath<PathString>=ResolvePath<PathString>,
	>(sp_path: PathString): Promise<ValueType> {
		const [si_storage, a_frags, k_location] = this._parse_path(sp_path);

		// fetch ve4 data
		const g_bundle = await k_location.fetchMetadataBundle();

		// no metadata bundle; error
		if(!g_bundle) {
			throw new Error(`Location '${si_storage}' exists but is missing a metadata bundle`);
		}

		// fetch metadata
		const g_metadata = g_bundle.data || null;

		// no data
		if(!g_metadata) {
			throw new Error(`Location '${si_storage}' has a metadata bundle but its data is emtpy`);
		}

		return access<ValueType>(g_metadata.paths, a_frags);
	}

	async commit(sp_path: VeoPathTarget, gc_serialized: Serializable, s_message=''): Promise<JsonObject> {
		const [si_storage, a_frags, k_location] = this._parse_path(sp_path);

		if(k_location.isReadOnly) {
			throw new Error(`Cannot write to readonly location '${si_storage}'`);
		}

		const k_writable = k_location as WritableAsynchronousSerializationLocation;

		return await k_writable.writeMetadataValue(gc_serialized, a_frags, s_message);
	}
}
