
import type {
	Instantiable,
	PrimitiveValue,
	PathOptions,
	DotFragment,
	PrimitiveObject,
} from '#/common/types';

import {
	NL_PATH_FRAGMENTS,
	VeoPath,
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



class UnhandledLocationError extends Error {
	_si_storage: VeoPath.Location;
	_a_frags: DotFragment[];

	constructor(sp_path: VeoPath.Locatable, si_storage: VeoPath.Location, a_frags: DotFragment[]) {
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


function parse_path(sp_path: VeoPath.Locatable): [VeoPath.Location, DotFragment[]] {
	const a_parts = sp_path.split('#');

	if(2 !== a_parts.length) {
		throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
	}

	const [si_storage, s_frags] = a_parts as [VeoPath.Location, string];
	const a_frags = s_frags.split('.');

	return [si_storage, a_frags];
}


type LocationHash = Record<VeoPath.Location, SerializationLocation>;


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

	// each frag
	for(let i_frag=0; i_frag<nl_frags; i_frag++) {
		const s_frag = a_frags[i_frag];

		// wildcard
		if('*' === s_frag) {
			const sp_parent = a_frags.slice(0, i_frag).join('.');

			return Object.entries(z_node).reduce((h_out, [si_key, w_value]) => ({
				...h_out,
				[`${sp_parent}.${si_key}`]: w_value,
			}), {}) as Type;
		}
		// recursive wildcard
		else if('**' === s_frag) {
			const sp_parent = a_frags.slice(0, i_frag).join('.');

			for(; i_frag<NL_PATH_FRAGMENTS; i_frag++) {
				debugger;
				for(const si_part in z_node) {
					const z_child = z_node[si_part];
					debugger;
				}
			}

			return Object.entries(z_node).reduce((h_out, [si_key, w_value]) => ({
				...h_out,
				[`${sp_parent}.${si_key}`]: w_value,
			}), {}) as Type;
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
	>(sp_target: VeoPath.Locatable, dc_class: null | Instantiable<ValueType, ClassType>, c_frags: number, g_context: Context={store:this}): Promise<PathOptions<ValueType, ClassType>> {
		const h_options = await this.resolve<Record<string, ValueType>>(sp_target);

		let h_out: PathOptions<ValueType, ClassType> = {};

		if(c_frags < NL_PATH_FRAGMENTS-1) {
			for(const si_frag in h_options) {
				h_out = {
					...h_out,
					...await this._explode(`${sp_target}.${si_frag}`, dc_class, c_frags+1, g_context),
				};
			}
		}
		else {
			for(const si_frag in h_options) {
				h_out = {
					...h_out,
					[`${sp_target}.${si_frag}`]: dc_class? new dc_class(h_options[si_frag], g_context): h_options[si_frag],
				};
			}
		}

		return h_out;
	}


	// eslint-disable-next-line class-methods-use-this
	idPartSync(sp_path: string): string {
		const a_parts = sp_path.split('#');

		if(2 !== a_parts.length) {
			throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
		}

		const [, s_frags] = a_parts as [VeoPath.Location, string];
		const a_frags = s_frags.split('.');

		return a_frags[3];
	}

	_parse_path(sp_path: VeoPath.Locatable): [VeoPath.Location, DotFragment[], SerializationLocation] {
		const [si_storage, a_frags] = parse_path(sp_path);

		if(!(si_storage in this._h_locations)) {
			throw new Error(`No such location '${si_storage}'`);
		}

		return [si_storage, a_frags, this._h_locations[si_storage]];
	}

	_parse_path_sync(sp_path: VeoPath.Locatable): [VeoPath.Location, DotFragment[], SynchronousSerializationLocation] {
		const [si_storage, a_frags, k_location] = this._parse_path(sp_path);

		if(!k_location.isSynchronous) {
			throw new Error(`Cannot synchronously access asynchronous storage type '${si_storage}'`);
		}

		return [si_storage, a_frags, k_location as SynchronousSerializationLocation];
	}

	async options<
		ValueType extends Serializable | Primitive,
		ClassType extends VeOdm<ValueType>=VeOdm<ValueType>,
	>(sp_path: VeoPath.Locatable, dc_class: null | Instantiable<ValueType, ClassType>=null, g_context: Context={store:this}): Promise<Record<VeoPath.Full, ClassType>> {
		const a_frags = sp_path.split('.');
		const nl_frags = a_frags.length;

		let sp_target!: VeoPath.Locatable;

		if(nl_frags < NL_PATH_FRAGMENTS-1) {
			if('**' === a_frags[nl_frags-1]) {
				sp_target = a_frags.slice(0, -1).join('.') as VeoPath.Locatable;
			}
			else {
				throw new Error(`Invalid path target: '${sp_path}'`);
			}
		}
		else {
			sp_target = sp_path.replace(/\.[^.]+$/, '') as VeoPath.Locatable;
		}

		return this._explode(sp_target, dc_class, nl_frags, g_context);
	}

	optionsSync<
		ValueType extends Serializable | Primitive,
		ClassType extends VeOdm<ValueType>,
	>(sp_path: VeoPath.HardcodedObject, dc_class: Instantiable<ValueType, ClassType>, g_context: Context={store:this}): Record<VeoPath.Full, ClassType> {
		const sp_parent = sp_path.replace(/\.[^.]+$/, '');
		const h_options = this.resolveSync<Record<string, ValueType>>(sp_parent as VeoPath.Locatable);
		return Object.entries(h_options).reduce((h_out, [si_key, w_value]) => ({
			...h_out,
			[`${sp_parent}.${si_key}`]: new dc_class(w_value, g_context),
		}), {});
	}

	resolveSync<
		ValueType extends PrimitiveValue,
		VeoPathType extends VeoPath.HardcodedObject = VeoPath.HardcodedObject,
	>(sp_path: VeoPath.Locatable): ValueType {
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

		return access<ValueType>(g_metadata.paths, a_frags);
	}

	async resolve<
		ValueType extends PrimitiveValue,
		VeoPathType extends VeoPath.Full = VeoPath.Full,
	>(sp_path: VeoPath.Locatable): Promise<ValueType> {
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

	async commit(sp_path: VeoPath.Full, gc_serialized: Serializable): Promise<boolean> {
		const [si_storage, a_frags, k_location] = this._parse_path(sp_path);

		if(k_location.isReadOnly) {
			throw new Error(`Cannot write to readonly location '${si_storage}'`);
		}

		const k_writable = k_location as WritableAsynchronousSerializationLocation;

		return await k_writable.writeMetadataValue(gc_serialized, a_frags);
	}
}
