import type {HardcodedObjectRoot} from '#/common/hardcoded';

import type {
	IObjectStore,
	PrimitiveValue,
} from '#/common/types';

import {
	access,
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

	optionsSync<
		ValueType extends Serializable | Primitive,
		ClassType extends VeOdm<ValueType>,
	>(sp_path: VeoPath.HardcodedObject, dc_class: {new (gc: ValueType, g: Context): ClassType;}, g_context: Context): Record<VeoPath.Full, ClassType> {
		const sp_parent = sp_path.replace(/\.[^.]+$/, '');
		const h_options = this.resolveSync<Record<string, ValueType>>(sp_parent);
		return Object.entries(h_options).reduce(
			(h_out, [si_key, w_value]) => ({
				...h_out,
				[`${sp_parent}.${si_key}`]: new dc_class(w_value, g_context),
			}),
			{}
		);
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
}
