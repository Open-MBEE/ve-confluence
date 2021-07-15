import type {HardcodedObjectRoot} from '#/common/hardcoded';

import type {
	IObjectStore,
	Instantiable,
	PrimitiveValue,
	PathOptions,
	DotFragment,
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

import type {
	ConfluenceDocument,
	ConfluencePage,
} from './confluence';

import type {MmsSparqlQueryTable} from '#/element/QueryTable/model/QueryTable';
import type { Ve4MetadataKeyStruct } from '#/common/static';
import { ObjectStore } from '#/model/ObjectStore';

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

export class ConfluenceObjectStore extends ObjectStore {
	protected _h_locations: Record<VeoPath.Location, SerializationLocation>;

	protected _k_page: ConfluencePage;
	protected _k_document: ConfluenceDocument;
	protected _h_hardcoded: HardcodedObjectRoot;

	constructor(
		k_page: ConfluencePage,
		k_document: ConfluenceDocument,
		h_hardcoded: HardcodedObjectRoot
	) {
		this._h_locations = {
			page: k_page,
			document: k_document,
			hardcoded: h_hardcoded,
		};

		this._k_page = k_page;
		this._k_document = k_document;
		this._h_hardcoded = h_hardcoded;
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
	>(sp_path: VeoPath.Locatable): Promise<ValueType> {
		let k_target, si_storage, a_frags;
		try {
			[k_target, si_storage, a_frags] = locate_path<ConfluencePage | ConfluenceDocument>(sp_path, {
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
