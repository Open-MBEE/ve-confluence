import type {HardcodedObjectRoot} from '#/common/hardcoded';

import type {
	IObjectStore,
	Instantiable,
	PrimitiveObject,
	PrimitiveValue,
	PathOptions,
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
	VeOdm,
} from '#/model/Serializable';

import type {
	ConfluenceDocument,
	ConfluencePage,
} from './confluence';

import type {MmsSparqlQueryTable} from "#/element/QueryTable/model/QueryTable";

// const G_SHAPE = {
// 	document: [
// 		'DocumentObject',
// 		{
// 			connection: [
// 				'Connection',
// 				{
// 					sparql: [
// 						'SparqlConnection',
// 						{mms:['MmsSparqlConnection']},
// 					],
// 				},
// 			],
// 		},
// 	],
// 	page: [
// 		'PageObject',
// 		{
// 			element: [
// 				'PageElement',
// 				{
// 					query_table: [
// 						'QueryTable',
// 						{sparql:['SparqlQueryTable']},
// 					],
// 				},
// 			],
// 		},
// 	],
// 	hardcoded: [
// 		'HardcodedObject',
// 		{
// 			queryField: [
// 				'QueryField',
// 				{
// 					sparql: [
// 						'SparqlQueryFieeld',
// 						{dng:['DngSparqlQueryField']},
// 					],
// 				},
// 			],
// 			queryType: [
// 				'QueryType',
// 				{
// 					sparql: [
// 						'SparqlQueryType',
// 						{dng:['DngSparqlQueryType']},
// 					],
// 				},
// 			],
// 			queryParameter: [
// 				'QueryParameter',
// 				{
// 					sparql: [
// 						'SparqlQueryParameter',
// 						{dng:['DngSparqlQueryParameter']},
// 					],
// 				},
// 			],
// 			queryContext: [
// 				'QueryContext',
// 				{
// 					sparql: [
// 						'SparqlQueryContext',
// 						{dng:['DngSparqlQueryContext']},
// 					],
// 				},
// 			],
// 			utility: [
// 				'Utility',
// 				{
// 					function: [
// 						'Function',
// 						{sort:['SortFunction']},
// 					],
// 				},
// 			],
// 		},
// 	],
// } as const;


export class ObjectStore implements IObjectStore {
	protected _k_page: ConfluencePage;
	protected _k_document: ConfluenceDocument;
	protected _h_hardcoded: HardcodedObjectRoot;

	constructor(
		k_page: ConfluencePage,
		k_document: ConfluenceDocument,
		h_hardcoded: HardcodedObjectRoot
	) {
		this._k_page = k_page;
		this._k_document = k_document;
		this._h_hardcoded = h_hardcoded;
	}

	private async _explode<
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
		const h_options = this.resolveSync<Record<string, ValueType>>(sp_parent);
		return Object.entries(h_options).reduce((h_out, [si_key, w_value]) => ({
			...h_out,
			[`${sp_parent}.${si_key}`]: new dc_class(w_value, g_context),
		}), {});
	}

	resolveSync<
		ValueType extends PrimitiveValue,
		VeoPathType extends VeoPath.HardcodedObject = VeoPath.HardcodedObject,
		>(sp_path: string): ValueType {
		const a_parts = sp_path.split('#');

		if(2 !== a_parts.length) {
			throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
		}

		const [si_storage, s_frags] = a_parts as [VeoPath.Location, string];
		const a_frags = s_frags.split('.');

		if('hardcoded' !== si_storage) {
			throw new Error(`Cannot synchronously access non-hardcoded storage type '${si_storage}'`);
		}

		return access<ValueType>(this._h_hardcoded, a_frags);
	}

	async resolve<
		ValueType extends PrimitiveValue,
		VeoPathType extends VeoPath.Full = VeoPath.Full,
		>(sp_path: string): Promise<ValueType> {
		const a_parts = sp_path.split('#');
		if(2 !== a_parts.length) {
			throw new TypeError(`Invalid path string: '${sp_path}'; no storage parameter`);
		}

		const [si_storage, s_frags] = a_parts as [VeoPath.Location, string];
		const a_frags = s_frags.split('.');

		let k_target: ConfluencePage | ConfluenceDocument;

		switch(si_storage) {
			case 'page': {
				k_target = this._k_page;
				break;
			}

			case 'document': {
				k_target = this._k_document;
				break;
			}

			case 'hardcoded': {
				return access<ValueType>(this._h_hardcoded, a_frags);
			}

			default: {
				throw new Error(`Unmapped VeoPath storage parameter '${si_storage}'`);  // eslint-disable-line @typescript-eslint/restrict-template-expressions
			}
		}

		// fetch ve4 data
		const g_ve4 = await k_target.getMetadata();

		// no metadata; error
		if(!g_ve4) {
			throw new Error(`${si_storage[0].toUpperCase() + si_storage.slice(1)} exists but no metadata`);
		}

		// fetch metadata
		const g_metadata = g_ve4.value || null;

		if(!g_metadata) {
			throw new Error(`Cannot access ${si_storage} metadata`);
		}

		return access<ValueType>(g_metadata, a_frags);
	}

	async update(content: Serializable): Promise<boolean> {
		let k_target: ConfluencePage;
		k_target = this._k_page;
		// fetch ve4 data
		const g_ve4 = await k_target.getMetadata(true);

		// fetch metadata
		const g_metadata = g_ve4?.value || null;
		if (g_metadata) {
			g_metadata.published = <MmsSparqlQueryTable.Serialized> content;
		}

		if(!g_metadata) {
			throw new Error(`Cannot access ${this._k_page.pageId} metadata`);
		}

		const n_version = ((g_ve4)?.version.number) || 1;

		return k_target.postMetadata(g_metadata, n_version + 1, '');
	}

	async publish(content: Node): Promise<boolean> {
		let k_target: ConfluencePage;
		k_target = this._k_page;

		return k_target.postContent(content.toString(), "Updated CAE CED Table Element");
	}

	async isPublished(): Promise<boolean> {
		let k_target: ConfluencePage;
		k_target = this._k_page;
		let g_metadata = await k_target.getMetadata(true);
		return !!g_metadata?.value.published;
	}
}
