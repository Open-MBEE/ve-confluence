
import {SearcherMask} from '#/common/helper/sparql-code';

import type {
	Hash,
	QueryRow,
	ValuedLabeledObject,
} from '#/common/types';

import type {VeoPathTarget} from '#/common/veo';


import {
	Connection,
	Mms5Connection,
} from '#/model/Connection';

import {
	Context,
	VeOdm,
} from '#/model/Serializable';

import {
	ode,
	oderac,
} from '#/util/belt';

import {
	faAngleDown,
} from '@fortawesome/free-solid-svg-icons';

import Fa from 'svelte-fa';

import {
	dd,
	parse_html,
	qs,
	remove_all_children,
	serialize_dom,
	timeout,
	uuid_v4,
} from '#/util/dom';

import type {SvelteComponent} from 'svelte/internal';

import {
	ChannelConfig,
	DisplayMode,
	GroupState,
	Row,
	RowGroup,
	Scenario,
	ShowConfig,
} from './Autocomplete';

import type {Channel} from './Autocomplete';

import MentionOverlay from '#/element/Mentions/component/MentionOverlay.svelte';

import {Transclusion} from '#/element/Transclusion/model/Transclusion';

import {
	editorMacro,
} from '#/vendor/confluence/module/confluence';

import AsyncLockPool from '#/util/async-lock-pool';

import {
	HtmlString,
	PlainString,
	TypedString,
} from '#/util/strings';

export interface MentionConfig {
	g_context: Context;
	k_transclusion: Transclusion;
	d_doc_editor: Document;
	si_dom?: string;
	dm_anchor?: Element;
	channels?: ChannelConfig[];
	ready?: (h_channels: Record<string, Channel>) => void;
	precache?: Record<string, Scenario>;
}

export type MessageRouter = Record<string, (...a_args: any[]) => void | Promise<void>>;

window.VE_LOCAL_STORAGE_MANAGER = {
	clear() {
		for(const si_key in localStorage) {
			if(si_key.startsWith('ve-')) {
				localStorage.removeItem(si_key);
			}
		}
	},
};

export class MacroDestroyedError extends Error {
	constructor() {
		super('Mention macro dom destroyed');
	}
}

// debounce time in ms
const XT_DEBOUNCE = 350;

// global precache
const H_PRECACHE: Record<string, Scenario> = {};

export const S_TRANSCLUDE_SYMBOL = '#';
export const R_TRANSCLUDE_SYMBOL_PREFIX = new RegExp(`^${S_TRANSCLUDE_SYMBOL.replace(/([^*()-+{}[\]\\|.?])/g, '\\$1')}`);

const query_row_to_display_row = (h_row: QueryRow, k_connection: Connection): Row => ({
	title: h_row.requirementNameValue.value,
	subtitle: h_row.idValue.value,
	uri: h_row.artifact.value,
	source: k_connection,
});

function* range(s_from: string, s_to: string) {
	for(let i_char=s_from.codePointAt(0)!, i_to=s_to.codePointAt(0)!; i_char<i_to; i_char++) {
		yield String.fromCodePoint(i_char);
	}
}

export class Mention {
	static get globalPrecache(): Record<string, Scenario> {
		return H_PRECACHE;
	}

	static async initGlobalPrecache(g_context: Context): Promise<void> {
		const XC_FRESH = GroupState.FRESH;
		const kl_precache = new AsyncLockPool(16);

		const precache = async(s_input: string) => {
			const f_release = await kl_precache.acquire();

			const h_groups_local: Record<string, RowGroup> = {};

			const g_scenario: Scenario = H_PRECACHE[s_input] = {
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
				//console.log(`precached search: "${s_input}"`);
			});
		};

		const d_doc_wysiwyg = (qs(document, 'iframe#wysiwygTextarea_ifr') as HTMLIFrameElement).contentDocument!;
		const k_precacher = Mention.fromConception(g_context, d_doc_wysiwyg);

		await k_precacher.ready();

		for(const s_char0 of range('0', '9')) {
			void precache(s_char0);

			// for(const s_char1 of range('0', '9')) {
			// 	void precache(`${s_char0}${s_char1}`);
			// }
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

	// static fromSpan(g_context: Context, d_doc_editor: Document, dm_span: Element): Mention {
	// 	return Mention.fromTransclusion(g_context, d_doc_editor, decode_attr(dm_span.getAttribute(SI_EDITOR_SYNC_KEY)!) as Transclusion.Serialized, dm_span.id);
	// }

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
				format: '',
			},
			connectionPath: 'document#connection.sparql.mms.dng', //TODO
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

	static fromMacro(dm_node: HTMLTableElement, gc_transclusion: Transclusion.Serialized, g_context: Context): Mention {
		const k_transclusion = new Transclusion(`transient.transclusion.${uuid_v4('-')}`, gc_transclusion as unknown as Transclusion.Serialized, g_context);

		return new Mention({
			g_context,
			d_doc_editor: dm_node.ownerDocument,
			k_transclusion,
			si_dom: dm_node.getAttribute('data-macro-id') || '',
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
	protected _b_ready = false;

	protected _dm_publish: Document;

	_fk_overlay: VoidFunction = () => {};  // eslint-disable-line class-methods-use-this, @typescript-eslint/no-empty-function
	_fk_destroy: VoidFunction = () => {};  // eslint-disable-line class-methods-use-this, @typescript-eslint/no-empty-function

	constructor(gc_session: MentionConfig) {
		const {
			g_context,
			k_transclusion,
			d_doc_editor,
			si_dom,
		} = gc_session;

		let si_element: string;
		let si_dom_norm: string;

		if(si_dom) {
			si_dom_norm = si_dom;
			si_element = si_dom.replace(/^ve-mention-macro-/, '');
		}
		else {
			si_element = uuid_v4('-');
			si_dom_norm = `ve-mention-macro-${si_element}`;
		}

		this._si_element = si_element;
		this._sq_dom = `[data-macro-id="${si_dom_norm}"]`;

		const sp_element = `embedded#elements.serialized.transclusion.${si_element}`;

		// default to global precache
		this._h_precache = gc_session.precache || H_PRECACHE;

		this._k_transclusion = k_transclusion;
		this._d_doc_editor = d_doc_editor;
		this._g_context = g_context;

		// init publish dom
		this._dm_publish = parse_html(`
			<body>
				<!-- cql-search-tag:${sp_element} -->
				<script type="application/json" data-ve-eid="${si_element}" data-ve-type="element-metadata">
					${JSON.stringify(this._k_transclusion.toSerialized(), null, '\t')}
				</script>
				<span class="ve-output-publish-anchor" data-ve-eid="${si_element}" data-ve-type="element-dom" id="${sp_element}"></span>
			</body>
		`.replace(/(^|\n)[ \t]+</g, '$1<'));

		// create editor macro dom shadow
		this._dm_shadow = editorMacro({
			document: d_doc_editor,
			id: si_dom_norm,
			elementPath: sp_element,
			macroName: 'html',
			parameters: {
				class: 've-mention',
				id: sp_element,
			},
			autoCursor: true,
			tableAttributes: {
				class: 'wysiwyg-macro ve-inline-macro ve-draft',
			},
			contentAttributes: {
				style: 'display: none;',
			},
			body: [
				dd('pre', {
					class: 've-macro-publish-anchor',
					style: 'display:none',
				}, [
					serialize_dom(this._dm_publish),
				]),
			],
			display: [
				this.displayNode,
			],
		});
	}

	async init(): Promise<void> {
		if (this._b_ready) {
			return;
		}
		let c_retries = 0;
		const n_max_retrires = 100;
		while(!this.initOverlay() && c_retries < n_max_retrires) {
			await timeout(200);
			c_retries += 1;
		}

		if(c_retries >= n_max_retrires) {
			debugger;
			throw new Error(`failed to init Mentions overlay`);
		}

		const g_context = this._g_context;
		const k_store = g_context.store;

		if(!k_store) {
			debugger;
			throw new Error(`context.store access access was attempted before the store was initialized`);
		}

		const h_connections = await k_store.options('document#connection.**', g_context);

		const h_channels = this._h_channels;

		for(const [sp_connection, gc_connection] of ode(h_connections)) {
			switch(gc_connection.type) {
				case 'Mms5Connection': {
					const k_connection = await VeOdm.createFromSerialized(Mms5Connection, sp_connection, gc_connection as Mms5Connection.Serialized, g_context);
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

	protected _save_macro(): void {
		// query for macro
		const dm_macro = this.macroDom;

		// query for pre element
		const dm_pre = qs(dm_macro, '.wysiwyg-macro-body>pre');
		if(!dm_pre) {
			debugger;
			throw new Error(`Failed to select macro body`);
		}

		// query for script tag
		let dm_script = qs(this._dm_publish, 'script[data-ve-type="element-metadata"]') as HTMLScriptElement;

		// serialize transclusion
		const sx_ve = JSON.stringify(this._k_transclusion.toSerialized(), null, '\t');

		// script does not exist in output dom
		if(!dm_script) {
			// create script element
			dm_script = dd('script', {
				type: 'application/json',
			}, [sx_ve], this._dm_publish);

			// prepend to publish dom body
			this._dm_publish.body.prepend(dm_script);
		}
		// script exists in output dom; update content
		else {
			dm_script.textContent = sx_ve;
		}

		// reserialize to publish html
		dm_pre.textContent = serialize_dom(this._dm_publish);
	}

	protected async _publish(a_display: Parameters<typeof dd>[2]|null=null): Promise<void> {
		// nodes to append to macro publish body
		remove_all_children(qs(this._dm_publish, '[data-ve-type="element-dom"]') as HTMLElement).append(...[
			dd('a', {
				class: 've-transclusion',
				href: this._k_transclusion.itemIri,
				rel: 'external',
				target: '_blank',
				'data-ve-type': 'element-live',
			}, [
				dd('span', {
					class: 've-transclusion-icon fa fa-bolt',
				}, []),
				dd('span', {
					class: 've-transclusion-display',
				}, a_display || [
					await this._k_transclusion.fetchDisplayText(),
				]),
			]),
		]);

		// save
		this._save_macro();
	}


	protected _show_attribute_selector(): void {
		qs(this.macroDom, '.ve-mention-attribute').classList.add('active');

		this.postMessage('show_attribute_selector', [
			this.macroDom,
		]);

		if(this._fk_overlay) {
			this._fk_overlay();
		}
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

	updateDisplay(): void {
		const s_attr_label = this._k_transclusion.attributeLabel;

		const dm_static = qs(this.macroDom, '.ve-mention-static') as HTMLElement;

		if(!dm_static) debugger;

		remove_all_children(dm_static).append(...[
			dd('span', {
				class: 've-mention-at',
			}, [S_TRANSCLUDE_SYMBOL]),
			dd('span', {
				class: 've-mention-target',
			}, [this._k_transclusion.itemId]),
			dd('span', {
				class: 've-mention-attribute',
			}, [
				dd('span', {
					class: 'content',
				}, [s_attr_label || '']),
				dd('span', {
					class: 'indicator',
				}, []),
			]),
		]);

		// insert dropdown indicator icon
		new Fa({
			target: qs(dm_static, '.indicator'),
			props: {
				icon: faAngleDown,
			},
		});

		qs(this.macroDom, '.ve-mention-input').textContent = '';
	}


	ready(): Promise<void> {
		// ready to go
		if(this._b_ready) return;
		return this.init();
	}

	get transclusion(): Transclusion {
		return this._k_transclusion;
	}

	get displayNode(): HTMLElement {
		return dd('span', {
			class: 've-mention',
		}, [
			dd('span', {
				class: 've-mention-static',
				contentEditable: 'false',
			}, []),
			dd('span', {
				class: 've-mention-input',
			}, [S_TRANSCLUDE_SYMBOL]),
		]);
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

		// update text display
		this.updateDisplay();

		// publish
		void this._publish([
			si_item,
		]);

		// make immutable
		qs(this.macroDom, '.ve-mention-input').remove();
		this.macroDom.contentEditable = 'false';

		// bind event listeners
		void this.bindEventListeners();

		//
		await this._enter_attribute_selector(p_item);

		// query for rendered content
		const dm_macro = this.macroDom;

		// // clear attribute span
		// const dm_attr = remove_all_children(qs(dm_macro, '.ve-mention-attribute') as HTMLElement);

		// // append template
		// dm_attr.append(...[
		// 	dd('span', {
		// 		class: 'content',
		// 	}, [
		// 		' |',  // cursor preview
		// 	]),
		// 	dd('span', {
		// 		class: 'indicator',
		// 	}),
		// ]);

		const dm_attr = qs(dm_macro, '.ve-mention-attribute') as HTMLElement;

		// create active attribute selector
		dm_attr.classList.add('active');
	}

	async _enter_attribute_selector(p_item: string): Promise<void> {
		// await for transclusion to be ready
		await this._k_transclusion.ready();

		// get item details
		const g_item = await this.fetchItemDetails(this._k_transclusion.connection, p_item);

		// update component states
		this._y_component.$set({
			// load attributes
			a_attributes: oderac(g_item, (si_key, {label:s_label, value:y_value}) => ({
				label: s_label,
				key: si_key,
				value: y_value.textContent,
				format: y_value.contentType,
			})),

			// switch to attribute selector
			xc_mode: DisplayMode.ATTRIBUTE,
		});
	}

	async bindEventListeners(b_init=false): Promise<void> {
		// ref created span
		const dm_attribute = qs(this.macroDom, '.ve-mention-attribute') as HTMLSpanElement;

		// bind event listeners
		{
			// attribute is clicked on
			dm_attribute.addEventListener('click', (de_event: MouseEvent) => {
				de_event.stopImmediatePropagation();

				this._show_attribute_selector();
			});

			// attribute is typed into
			dm_attribute.addEventListener('input', () => {
				this._show_attribute_selector();
			});

			// attribute is backspaces
			dm_attribute.addEventListener('keydown', (d_event) => {
				d_event.preventDefault();

				if('Backspace' === d_event.key) {
					dm_attribute.textContent = '|';
				}

				this._show_attribute_selector();
			});
		}

		// prevent rogue input
		{
			qs(this.macroDom, '.ve-mention')!.addEventListener('input', (de_event: Event) => {
				de_event.stopImmediatePropagation();
				de_event.preventDefault();

				qs(this.macroDom, '.ve-mention-input')!.dispatchEvent(de_event);
			});
		}

		// also perform init
		if(b_init) {
			// get cursor offset
			const g_rect = this.macroDom.getBoundingClientRect();

			// unable to get bounding rect
			if(!g_rect) {
				debugger;
				throw new Error(`y_editor.selection has no bounding client rect`);
			}

			// destructure rect
			const {
				left: x_left,
				top: x_top,
			} = g_rect;

			// set widget display and offset
			this._y_component.$set({
				sx_offset_x: `${x_left}px`,
				sx_offset_y: `calc(${x_top}px + 1.5em)`,
			});

			// enter attribute selector
			await this._enter_attribute_selector(this._k_transclusion.itemIri);
		}
	}

	async selectAttribute(g_attr: ValuedLabeledObject): Promise<void> {
		const dm_macro = this.macroDom;

		// ref created span
		const dm_attribute = qs(dm_macro, '.ve-mention-attribute') as HTMLSpanElement;

		// selector no longer active
		dm_attribute.classList.remove('active');

		// add display attribute and re-encode
		this._k_transclusion = await this._k_transclusion.clone<Transclusion>({
			displayAttribute: g_attr,
		});

		// publish text
		void this._publish();

		// replace text content with new attribute
		qs(dm_attribute, '.content').textContent = g_attr.label;

		// remove draft status
		this.macroDom.classList.remove('ve-draft');

		// ensure not content editable
		this.macroDom.contentEditable = 'false';
	}

	get searchTerm(): string {
		return (qs(this.macroDom, '.ve-mention-input')?.textContent || '').replace(R_TRANSCLUDE_SYMBOL_PREFIX, '').trim().toLocaleLowerCase();
	}

	searchInput(): void {
		const s_term = this.searchTerm;

		// needs to happen synchronously before setting group vars
		this.postMessage('render_search', [s_term]);

		return this.search(s_term);
	}

	get macroDom(): HTMLElement {
		const dm_macro = qs(this._d_doc_editor.body, this._sq_dom);
		if(!dm_macro) {
			this._fk_destroy();
			throw new MacroDestroyedError();
		}
		else {
			return dm_macro as HTMLElement;
		}
	}

	initOverlay(): boolean {
		const dm_target = qs(this._d_doc_editor, '#ve-overlays');

		if(!dm_target) {
			console.warn(`during initOverlay() call, #ve-overlays was not ready ${document} ${this._d_doc_editor}`);
			return false;
		}

		// create component
		this._y_component = new MentionOverlay({
			target: dm_target,
			props: {
				k_mention: this,
			},
		});

		// listen for dom init event to fetch dom refs
		this._y_component.$on('dom', (d_event: CustomEvent<{dm_container: HTMLElement; dm_content: HTMLElement}>) => {
			this._dm_overlay_container = d_event.detail.dm_container;
			this._dm_overlay_content = d_event.detail.dm_content;
		});

		return true;
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
			// make each one dirty
			for(const si_group in h_groups) {
				const g_group = h_groups[si_group];
				g_group.state = GroupState.DIRTY;
			}

			// update component
			this._y_component.$set({
				h_groups,
			});

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

		// draft status; self-destroy
		if(this.macroDom.classList.contains('ve-draft')) {
			this.macroDom.remove();
		}
		// publishable; select attribute
		else {
			void this.selectAttribute(this._k_transclusion.toSerialized().displayAttribute);
		}
	}

	renderMacroDom(): HTMLElement {
		return this._dm_shadow;
	}

	renderMacroHtml(): string {
		return this.renderMacroDom().outerHTML;
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
					fk_rows(g_channel, JSON.parse(sx_cache) as QueryRow[]);
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
					try {
						localStorage.setItem(si_storage, JSON.stringify(a_rows));
					}
					// could not set local storage
					catch(e_set) {
						// disable caching
						b_cache = false;
					}
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

	// eslint-disable-next-line class-methods-use-this
	async fetchItemDetails(k_connection: Connection, p_item: string): Promise<Record<string, ValuedLabeledObject<TypedString>>> {
		// build detailer query
		const k_query = k_connection.detail(p_item);

		// execute query (should only be 1 row)
		const a_rows = await k_connection.execute(k_query.paginate(2));

		// ref first result
		const g_item = a_rows[0];

		// annotate value strings
		return {
			idValue: {
				label: 'Requirement ID',
				value: new PlainString(g_item.idValue.value),
			},
			requirementNameValue: {
				label: 'Requirement Name',
				value: new PlainString(g_item.requirementNameValue.value),
			},
			requirementTextValue: {
				label: 'Requirement Text',
				value: new HtmlString(g_item.requirementTextValue.value),
			},
		};
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
