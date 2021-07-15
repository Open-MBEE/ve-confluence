
import type {
	IObjectStore,
	Instantiable,
	PrimitiveValue,
	PathOptions,
	DotFragment,
    PrimitiveObject,
} from '#/common/types';

import {
	access,
	NL_PATH_FRAGMENTS,
	VeoPath,
} from '#/common/veo';

import type {
	Context,
	Primitive,
	Serializable,
	SerializationLocation,
	VeOdm,
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

class HardcodedException extends Error {
	_a_frags: DotFragment[];

	constructor(a_frags: DotFragment[]) {
		super();
		this._a_frags = a_frags;
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

function locate_path<ReturnType>(sp_path: VeoPath.Locatable, g_route: {[s_location in VeoPath.Location]?: (a_frags: DotFragment[]) => ReturnType}): [ReturnType, VeoPath.Location, DotFragment[]] {
	const [si_storage, a_frags] = parse_path(sp_path);
    
	const f_route = g_route[si_storage];
	if(f_route) {
		return [f_route(a_frags), si_storage, a_frags];
	}
	else {
		throw new UnhandledLocationError(sp_path, si_storage, a_frags);
	}
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
        const [si_storage, a_frags, k_location] = this._parse_path(sp_path);

        if(!k_location.isSynchronous) {
			throw new Error(`Cannot synchronously access asynchronous storage type '${si_storage}'`);
		}

		return access<ValueType>(k_location, a_frags);
	}

	async resolve<
		ValueType extends PrimitiveValue,
		VeoPathType extends VeoPath.Full = VeoPath.Full,
	>(sp_path: VeoPath.Locatable): Promise<ValueType> {
		let k_target, si_storage, a_frags;
		try {
			[k_target, si_storage, a_frags] = locate_path(sp_path, {
				page: () => this._k_page,
				document: () => this._k_document,
				hardcoded: (a_frags) => {
					throw new HardcodedException(a_frags);
				},
			});
		}
		catch(e_locate) {
			if(e_locate instanceof HardcodedException) {
				return access<ValueType>(this._h_hardcoded, e_locate.frags);
			}

			throw e_locate;
		}

		// fetch ve4 data
		const g_ve4 = await k_target.fetchMetadata();

		// no metadata; error
		if(!g_ve4) {
			throw new Error(`${si_storage[0].toUpperCase()+si_storage.slice(1)} exists but no metadata`);
		}

		// fetch metadata
		const g_metadata = g_ve4.value || null;

		if(!g_metadata) {
			throw new Error(`Cannot access ${si_storage} metadata`);
		}

		return access<ValueType>(g_metadata, a_frags);
	}

	async commit(sp_path: VeoPath.Full, gc_serialized: Serializable): Promise<boolean> {
		let k_target, si_storage, a_frags;
		try {
			[k_target, si_storage, a_frags] = locate_path<ConfluencePage | ConfluenceDocument>(sp_path, {
				page: () => this._k_page,
				document: () => this._k_document,
			});
		}
		catch(e_locate) {
			if(e_locate instanceof UnhandledLocationError) {
				throw new Error(`Cannot write to ${e_locate.location} location '${sp_path}'`);
			}

			throw e_locate;
		}

		// fetch metadata
		const g_meta = await k_target.fetchMetadata(true);

		g_meta?.value.
	}

	async update(k_content: Serializable): Promise<boolean> {
		// fetch ve4 data
		const g_ve4 = await this._k_page.fetchMetadata(true);

		// fetch metadata
		const g_metadata = g_ve4?.value || null;
		if(g_metadata) {
			g_metadata.published = <MmsSparqlQueryTable.Serialized> k_content;
		}

		if(!g_metadata) {
			throw new Error(`Cannot access ${this._k_page.pageId} metadata`);
		}

		const n_version = g_ve4?.version.number || 1;

		return this._k_page.postMetadata(g_metadata, n_version + 1, '');
	}

	async publish(yn_content: Node): Promise<boolean> {
		return this._k_page.postContent(yn_content.toString(), 'Updated CAE CED Table Element');
	}

	async isPublished(): Promise<boolean> {
		const g_metadata = await this._k_page.fetchMetadata(true);
		return !!g_metadata?.value.published;
	}
}
