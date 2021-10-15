
import {SearcherMask} from '#/common/helper/sparql-code';

import type {
	Hash,
	JsonObject,
	JsonValue,
	QueryRow,
	ValuedLabeledObject,
} from '#/common/types';

import type {VeoPathTarget} from '#/common/veo';

import type {ConnectionQuery} from '#/element/QueryTable/model/QueryTable';

import {
	Connection,
	MmsSparqlConnection,
} from '#/model/Connection';

import {
	Context,
	VeOdm,
	VeOdmConstructor,
} from '#/model/Serializable';

import {ode, oderac} from '#/util/belt';

import {
	faAngleDown,
} from '@fortawesome/free-solid-svg-icons';

import Fa from 'svelte-fa';

import {
	dd,
	decode_attr,
	encode_attr,
	qs,
	uuid_v4,
} from '#/util/dom';

import type {SvelteComponent} from 'svelte/internal';

import {ChannelConfig, DisplayMode, GroupState, Row, RowGroup, Scenario, ShowConfig} from './Autocomplete';

import type {Channel} from './Autocomplete';

import MentionOverlay from '#/element/Mentions/component/MentionOverlay.svelte';

import {Transclusion} from '#/element/Transclusion/model/Transclusion';

import {
	autoCursorNode,
	editorAutoCursor,
	editorMacro,
	SI_EDITOR_SYNC_KEY,
} from '#/vendor/confluence/module/confluence';
import AsyncLockPool from '#/util/async-lock-pool';

export interface MentionConfig {
	g_context: Context;
	k_transclusion: Transclusion;
	d_doc_editor: Document;
	dm_anchor?: Element;
	channels?: ChannelConfig[];
	ready?: (h_channels: Record<string, Channel>) => void;
	precache?: Record<string, Scenario>;
}

export type MessageRouter = Record<string, (...a_args: any[]) => void | Promise<void>>;


// debounce time in ms
const XT_DEBOUNCE = 350;

// global precache
const H_PRECACHE: Record<string, Scenario> = {};


const query_row_to_display_row = (h_row: QueryRow, k_connection: Connection): Row => ({
	title: h_row.requirementNameValue.value,
	subtitle: h_row.idValue.value,
	uri: h_row.artifact.value,
	source: k_connection,
});

function macro_parameters_from_string(sx_params: string): Hash {
	return sx_params.split(/\|/g).reduce((h_out, s_pair) => {
		const [si_key, s_value] = s_pair.split('=');
		return {
			...h_out,
			[si_key]: s_value,
		};
	}, {}) as Hash;
}

function macro_parameters_to_string(h_params: Hash): string {
	return oderac(h_params, (si_key: string, s_value: string) => `${si_key}=${s_value}`).join('|');
}


function* range(s_from: string, s_to: string) {
	for(let i_char=s_from.codePointAt(0)!, i_to=s_to.codePointAt(0)!; i_char<i_to; i_char++) {
		yield String.fromCodePoint(i_char);
	}
}

function remove_all_children(dm_parent: HTMLElement): HTMLElement {
	while(dm_parent.firstChild) {
		dm_parent.removeChild(dm_parent.firstChild);
	}

	return dm_parent;
}

export class Mention {
	static get globalPrecache(): Record<string, Scenario> {
		return H_PRECACHE;
	}

	static async initGlobalPrecache(g_context: Context) {
		const XC_FRESH = GroupState.FRESH;
		const kl_precache = new AsyncLockPool(16);

		const precache = async(s_input: string) => {
			const f_release = await kl_precache.acquire();

			const h_groups_local: Record<string, RowGroup> = {};

			let g_scenario: Scenario = H_PRECACHE[s_input] = {
				input: s_input,
				ready: false,
				groups: h_groups_local,
			};

			void k_precacher.update(s_input, (g_channel, a_rows) => {
				h_groups_local[g_channel.hash] = {
					channel_hash: g_channel.hash,
					state: XC_FRESH,
					rows: a_rows.map(h => query_row_to_display_row(h, g_channel.connection)),
				};
			}, true).then(() => {
				for(const si_channel of Object.keys(h_groups_local)) {
					if(!h_groups_local[si_channel]) {
						h_groups_local[si_channel] = {
							channel_hash: si_channel,
							state: XC_FRESH,
							rows: [] as Row[],
						};
					}
				}

				g_scenario.ready = true;
				f_release();
				console.log(`precached search: "${s_input}"`);
			});
		};

		const k_precacher = Mention.fromConception(g_context, document);

		await k_precacher.ready;

		for(const s_char of range('0', '9')) {
			void precache(s_char);
		}

		for(const s_char of range('a', 'z')) {
			void precache(s_char);
		}

		void precache('tr');
		void precache('ch');
		void precache('sh');
		void precache('th');

		// for(const s_char of range('a', 'z')) {
		// 	void precache(s_char+'a');
		// 	void precache(s_char+'e');
		// 	void precache(s_char+'i');
		// 	void precache(s_char+'o');
		// 	void precache(s_char+'u');
		// }

		for(const s_char of range('a', 'z')) {
			if('bcfgps'.includes(s_char)) {
				void precache(s_char+'r');
				void precache(s_char+'l');
			}
		}
	}

	static fromSpan(g_context: Context, d_doc_editor: Document, dm_span: Element): Mention {
		return Mention.fromTransclusion(g_context, d_doc_editor, decode_attr(dm_span.getAttribute(SI_EDITOR_SYNC_KEY)!) as Transclusion.Serialized, dm_span.id);
	}

	static fromConception(g_context: Context, d_doc_editor: Document, gc_transclusion?: Partial<Transclusion.Serialized>): Mention {
		return Mention.fromTransclusion(g_context, d_doc_editor, {
			type: 'Transclusion',
			label: '',
			item: {
				iri: '',
				id: '',
			},
			displayAttribute: {
				key: '',
				label: '',
				value: '',
			},
			connectionPath: 'document#connection.sparql.mms.dng',
			...gc_transclusion,
		});
	}

	static fromTransclusion(g_context: Context, d_doc_editor: Document, gc_transclusion: Transclusion.Serialized, si_element: string=uuid_v4('-')): Mention {
		const k_transclusion = new Transclusion(`transient.transclusion.${si_element}`, gc_transclusion as unknown as Transclusion.Serialized, g_context);

		return new Mention({
			g_context,
			d_doc_editor,
			k_transclusion,
		});
	}

	protected _si_element: string;
	protected _sq_dom: string;
	protected _b_display = false;

	protected _x_offset_x = 0;
	protected _x_offset_y = 0;
	protected _xc_mode: DisplayMode = DisplayMode.ITEM;

	protected _g_context: Context;
	protected _h_channels: Record<string, Channel> = {};
	protected _a_channels_enabled: Channel[] = [];
	protected _as_controllers: Set<AbortController> = new Set();

	protected _h_router: MessageRouter = {};
	protected _y_component!: SvelteComponent;

	protected _d_doc_editor: Document;
	protected _dm_shadow: HTMLElement;
	protected _dm_overlay_container: HTMLElement;
	protected _dm_overlay_content: HTMLElement;

	protected _dm_rendered: HTMLElement | null = null;

	protected _k_transclusion: Transclusion;

	protected _i_debounce = 0;
	protected _h_groups: Record<string, RowGroup> = {};
	protected _h_precache: Record<string, Scenario>;
	protected _fk_ready: VoidFunction | null = null;
	protected _b_ready: boolean = false;

	constructor(gc_session: MentionConfig) {
		const {
			g_context,
			k_transclusion,
			d_doc_editor,
		} = gc_session;

		const si_element = this._si_element = uuid_v4('-');
		const sp_element = `page#elements.serialized.transclusion.${si_element}`;
		const si_dom = `ve-mention-macro-${si_element}`;
		const sq_dom = this._sq_dom = `[data-macro-id="${si_dom}"]`;

		// default to global precache
		this._h_precache = gc_session.precache || H_PRECACHE;

		this._k_transclusion = k_transclusion;
		this._d_doc_editor = d_doc_editor;
		this._g_context = g_context;

		// create editor macro dom shadow
		this._dm_shadow = editorMacro({
			document: d_doc_editor,
			id: si_dom,
			parameters: {
				class: 've-mention',
				id: sp_element,
				ve: encode_attr(this._k_transclusion.toSerialized()),
			},
			autoCursor: true,
			tableAttributes: {
				class: 'wysiwyg-macro ve-inline-macro',
				// style: oderac({
				// }, (si_key: string, w_value: string | number) => `${si_key}:${w_value};`).join(' '),
			},
			contentAttributes: {
				style: 'display: none;',
			},
			body: [
				editorAutoCursor(),
				editorMacro({
					parameters: {
						class: 've-cql-search-tag',
						style: 'display:none',
					},
					body: [
						dd('p', {}, [
							sp_element,
						]),
					],
				}),
				dd('p', {
					class: 've-macro-publish-anchor',
					style: 'display:none',
				}, []),
			],
			display: [
				dd('span', {
					class: 've-mention',
				}, [
					dd('span', {
						class: 've-mention-at',
					}, ['@']),
					dd('span', {
						class: 've-mention-target',
					}, []),
					dd('span', {
						class: 've-mention-attr',
					}, []),
				]),
			],
		});

		void this._init(gc_session.ready);
	}

	protected async _init(fk_ready: MentionConfig['ready']): Promise<void> {
		this.initOverlay();

		const g_context = this._g_context;
		const k_store = g_context.store;
		const h_connections = await k_store.options('document#connection.**', g_context);

		const h_channels = this._h_channels;

		for(const [sp_connection, gc_connection] of ode(h_connections)) {
			switch(gc_connection.type) {
				case 'MmsSparqlConnection': {
					const k_connection = await VeOdm.createFromSerialized(MmsSparqlConnection, sp_connection, gc_connection as MmsSparqlConnection.Serialized, g_context);

					// push as separate channels
					this._add_channel(sp_connection, k_connection, {
						types: SearcherMask.ID_EXACT | SearcherMask.ID_START,
						limit: 20,
					});

					this._add_channel(sp_connection, k_connection, {
						types: SearcherMask.NAME_START | SearcherMask.NAME_CONTAINS,
						limit: 50,
					});
					break;
				}

				default: {
					break;
				}
			}
		}

		// enable all channels by default
		this.setChannelUse(() => true);

		// init groups
		this._h_groups = ode(h_channels).reduce((h_out, [si_channel, g_channel]) => ({
			...h_out,
			[g_channel.hash]: {
				channel_hash: g_channel.hash,
				state: GroupState.DIRTY,
				rows: [],
			} as RowGroup,
		}), {});

		// ready
		this._b_ready = true;
		if(this._fk_ready) {
			this._fk_ready();
		}
	}

	protected _save_macro() {
		// query for macro
		const dm_macro = this._dm_macro;

		// save persistent metadata
		{
			// get params attribute string
			const sx_params = dm_macro.getAttribute('data-macro-parameters') || '';

			// parse out params
			const h_params = macro_parameters_from_string(sx_params);

			// edit ve entry
			h_params.ve = encode_attr(this._k_transclusion.toSerialized());

			// reserialize
			dm_macro.setAttribute('data-macro-parameters', macro_parameters_to_string(h_params));
		}

		// nodes to append to macro publish body
		const a_publish_body: HTMLElement[] = [];

		// create publish view
		{
			a_publish_body.push(...[
				dd('span', {}, [
					'Loading transclusion...',
				]),
			]);
		}

		// save view to macro
		{
			// query for anchor
			const dm_publish_anchor = qs(dm_macro, 'p.ve-macro-publish-anchor');

			// remove all next siblings
			while(dm_publish_anchor.nextElementSibling) {
				dm_publish_anchor.nextElementSibling.remove();
			}

			// append body
			dm_publish_anchor.parentElement?.append(...a_publish_body);
		}
	}

	get ready(): void | Promise<void> {
		// ready to go
		if(this._b_ready) return;

		// have to wait
		return new Promise((fk_ready) => {
			this._fk_ready = fk_ready;
		});
	}

	protected _add_channel(sp_connection: VeoPathTarget, k_connection: Connection, h_features: {types: SearcherMask; limit: number}): void {
		const si_channel = [
			k_connection.hash(),
			JSON.stringify(h_features),
		].join('\n');

		this._h_channels[si_channel] = {
			connection_path: sp_connection,
			connection: k_connection,
			hash: si_channel,
			...h_features,
		};
	}

	get transclusion(): Transclusion {
		return this._k_transclusion;
	}

	async selectItem(si_channel: string, p_item: string, si_item: string): Promise<void> {
		// get channel
		const g_channel = this.getChannel(si_channel);

		// save connection and item
		this._k_transclusion = await this._k_transclusion.clone<Transclusion>({
			connectionPath: g_channel.connection.path,
			item: {
				iri: p_item,
				id: si_item,
			},
		});

		// save macro
		this._save_macro();

		// // make mention not editable
		// dm_mention.contentEditable = 'false';

		// // replace content
		// dm_mention.textContent = `@${si_item}`;

		// // set mention metadata
		// dm_mention.setAttribute(SI_SYNC_KEY, encode_attr({
		// 	connection_path: g_channel.connection_path,
		// 	connection: g_channel.connection.toSerialized(),
		// 	item: {
		// 		iri: p_item,
		// 	},
		// }));

		// get item details
		const g_item = (await this.fetchItemDetails(si_channel, p_item)) as Record<string, ValuedLabeledObject>;

		// update component states
		this._y_component.$set({
			// load attributes
			a_attributes: oderac(g_item, (si_key, {label:s_label, value:s_value}) => ({
				label: s_label,
				key: si_key,
				value: s_value,
			})),

			// switch to attribute selector
			xc_mode: DisplayMode.ATTRIBUTE,
		});

		// query for rendered content
		const dm_rendered = qs(this._d_doc_editor, this._sq_dom);

		// create active attribute selector
		remove_all_children(qs(dm_rendered, '.ve-mention-attr') as HTMLElement).appendChild(dd('span', {
			class: 'attribute active',
			contentEditable: 'false',
		}, [
			dd('span', {
				class: 'content',
			}, [
				'|',  // cursor preview
			]),
			dd('span', {
				class: 'indicator',
			}),
		]));

		// ref created span
		const dm_attribute = qs(dm_rendered, '.attribute') as HTMLSpanElement;

		// // set attributes so they can be xfered
		// dm_attribute

		// bind event listeners
		dm_attribute.addEventListener('click', () => {
			prompt_attribute_selector(dm_mention);
		});
		dm_attribute.addEventListener('input', () => {
			prompt_attribute_selector(dm_mention);
		});
		dm_attribute.addEventListener('keydown', (d_event) => {
			d_event.preventDefault();

			if('Backspace' === d_event.key) {
				dm_attribute.textContent = '|';
			}

			prompt_attribute_selector(dm_mention);
		});

		new Fa({
			target: qs(dm_attribute, '.indicator'),
			props: {
				icon: faAngleDown,
			},
		});
	}

	protected _update_text(): void {
		this.targetText = `${this._k_transclusion.connection.alias}:${this._k_transclusion.itemId}`;
		this._k_transclusion.clone
	}

	get targetText(): string {
		return (qs(this._dm_macro, '.ve-mention-at').textContent || '').replace(/^@/, '');
	}

	set targetText(s_text: string) {
		qs(this._dm_macro, '.ve-mention-at').textContent = '@'+s_text;
	}

	get _dm_macro(): HTMLElement {
		return qs(this._d_doc_editor.body, this._sq_dom) as HTMLElement;
	}

	initOverlay(): void {
		const dm_target = qs(this._d_doc_editor, '#ve-overlays');

		// create component
		this._y_component = new MentionOverlay({
			target: dm_target,
			props: {
				k_mention: this,
			},
		});

		// listen for dom init event to fetch dom refs
		this._y_component.$on('dom', ({dm_container, dm_content}: {dm_container: HTMLElement; dm_content: HTMLElement}) => {
			this._dm_overlay_container = dm_container;
			this._dm_overlay_content = dm_content;
		});
	}

	get domSelector(): string {
		return this._sq_dom;
	}

	search(s_search: string, b_debounce=false): void {
		// precache available
		const g_scenario = this._h_precache[s_search];
		if(g_scenario?.ready) {
			// update
			const h_groups = this._h_groups = g_scenario.groups;

			// update component
			this._y_component.$set({
				h_groups,
			});

			// exit
			return;
		}

		// ref groups
		const h_groups = this._h_groups;

		// debounce
		clearTimeout(this._i_debounce);
		this._i_debounce = setTimeout(() => {
			// apply query
			void this.update(s_search, (g_channel: Channel, a_rows: QueryRow[]) => {
				let a_mapped: Row[] = [];
				const k_connection = g_channel.connection;

				if('DNG Requirements' === g_channel.connection.label) {
					a_mapped = a_rows.map(h_row => ({
						title: h_row.requirementNameValue.value,
						subtitle: h_row.idValue.value,
						uri: h_row.artifact.value,
						source: k_connection,
					}));
				}

				// ref/create group
				const si_channel = g_channel.hash;
				const g_group = h_groups[si_channel] = h_groups[si_channel] || {
					channel_hash: si_channel,
					state: GroupState.DIRTY,
					rows: [],
				};

				// update rows
				g_group.rows = a_mapped;

				// clean state
				g_group.state = GroupState.FRESH;

				// update component
				this._y_component.$set({
					h_groups,
				});
			});
		}, b_debounce? XT_DEBOUNCE: 0);

		// this.postMessage('render_search', [s_search, true]);
	}

	acceptItem(): boolean {
		const dm_selected = qs(this._dm_overlay_content, '.item-selected');
		if(!dm_selected) {
			return false;
		}

		this.postMessage('select_row', []);
		return true;
	}

	showOverlay(gc_show: ShowConfig): void {
		// update component
		this._y_component.$set({
			sx_offset_x: gc_show.x,
			sx_offset_y: gc_show.y,
			xc_mode: gc_show.mode,
			b_display: true,
		});
	}

	hideOverlay(): void {
		// update component
		this._y_component.$set({
			b_display: false,
		});
	}

	renderDom(): HTMLElement {
		return this._dm_shadow;
	}

	renderHtml(): string {
		return this.renderDom().outerHTML;
	}

	setChannelUse(f_each: (g_channel: Channel) => boolean): void {
		const a_enabled = [];

		for(const g_channel of Object.values(this._h_channels)) {
			if(f_each(g_channel)) {
				a_enabled.push(g_channel);
			}
		}

		this._a_channels_enabled = a_enabled;
	}


	routeMessages(h_router: MessageRouter): void {
		this._h_router = h_router;
	}

	postMessage(si_event: string, a_args: unknown[]): unknown {
		const h_router = this._h_router;
		const f_route = h_router[si_event];

		if('function' !== typeof f_route) {
			throw new Error(`No route handler for '${si_event}'`);
		}

		return f_route(...a_args);
	}


	async update(s_input: string, fk_rows: (g_channel: Channel, a_rows: QueryRow[]) => void, b_cache=false): Promise<void> {
		const a_queries: Promise<void>[] = [];

		// each channel
		for(const g_channel of this._a_channels_enabled) {
			// construct local storage key
			const si_storage = `ve-autocomplete#${g_channel.hash}:${s_input}`;

			// exists in local storage
			const sx_cache = localStorage.getItem(si_storage);
			if(sx_cache && 'string' === typeof sx_cache) {
				try {
					fk_rows(g_channel, JSON.parse(sx_cache));
					return;
				}
				catch(e_parse) {}
			}

			// ref connection
			const k_connection = g_channel.connection;

			// gen searcher query
			const k_query = k_connection.search(s_input, g_channel.types);

			// paginate
			const sq_query = k_query.paginate(g_channel.limit || 50);

			// no query; skip gracefully
			if(!sq_query) continue;

			// queue a promise for each
			a_queries.push((async() => {
				let d_controller!: AbortController;
				let a_rows!: QueryRow[];
				let b_exit = false;

				// attempt to execute query
				try {
					// and fetch query rows
					a_rows = await k_connection.execute(sq_query, (_d_controller) => {
						// set locally scoped ref to AbortController
						d_controller = _d_controller;

						// add it to instance field
						this._as_controllers.add(d_controller);
					});
				}
				// execution error
				catch(e_execute) {
					// do not throw on abort
					if(e_execute && 'AbortError' !== (e_execute as Error).name) {
						throw e_execute;
					}

					// flag for exit
					b_exit = true;
				}
				// no matter what happens
				finally {
					// delete abort controller
					this._as_controllers.delete(d_controller);
				}

				// exit
				if(b_exit) return;

				// cache
				if(b_cache) {
					localStorage.setItem(si_storage, JSON.stringify(a_rows));
				}

				// callback with new rows
				fk_rows(g_channel, a_rows);
			})());
		}

		await Promise.all(a_queries);
	}

	getChannel(si_channel: string): Channel {
		return this._h_channels[si_channel];
	}

	async fetchItemDetails(si_channel: string, p_item: string): Promise<JsonObject> {
		// get connection
		const k_connection = this._h_channels[si_channel].connection;

		// build detailer query
		const k_query = k_connection.detail(p_item);

		// execute query (should only be 1 row)
		const a_rows = await k_connection.execute(k_query.paginate(2));

		const g_item = a_rows[0];

		return {
			idValue: {
				label: 'Requirement ID',
				value: g_item.idValue.value,
			},
			requirementNameValue: {
				label: 'Requirement Name',
				value: g_item.requirementNameValue.value,
			},
			requirementTextValue: {
				label: 'Requirement Text',
				value: g_item.requirementTextValue.value,
			},
		};

		// this._g_context.store.optionsSync('hardcoded#queryField.sparql.dng.**', this._g_context, QueryField);
	}

	abortAll(): number {
		const as_controllers = this._as_controllers;
		const nl_aborted = as_controllers.size;
		for(const d_controller of as_controllers) {
			d_controller.abort();
		}

		as_controllers.clear();
		return nl_aborted;
	}
}
