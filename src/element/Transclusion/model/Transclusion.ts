import type {TypedLabeledObject} from '#/common/types';

import type {VeoPathTarget} from '#/common/veo';

import {
	Connection,
	MmsSparqlConnection,
} from '#/model/Connection';

import {
	VeOdm,
	VeOdmLabeled,
} from '#/model/Serializable';

import {oderom} from '#/util/belt';

import {
	HtmlString,
	TypedString,
} from '#/util/strings';


export namespace Transclusion {
	type DefaultType = `Transclusion`;

	export interface Serialized<TypeString extends DefaultType=DefaultType> extends TypedLabeledObject<TypeString> {
		connectionPath: VeoPathTarget;
		item: {
			iri: string;
			id: string;
		};
		displayAttribute: {
			key: string;
			label: string;
			value: string;
		};
	}
}

function key_to_label(si_key: string) {
	return si_key.replace(/Value$/, '')
		.replace(/([A-Z])/g, ' $1')
		.replace(/^([a-z])([a-z]$|)/, (_, s_a: string, s_b: string) => s_a.toUpperCase()+(s_b || '').toUpperCase());
}

export class Transclusion<
	Serialized extends Transclusion.Serialized=Transclusion.Serialized,
> extends VeOdmLabeled<Serialized> {
	protected _s_display!: string;
	protected _k_connection!: Connection;
	protected _h_attributes!: Record<string, [string, TypedString]>;

	initSync(): void {
		this._s_display = '';
		return super.initSync();
	}

	async init(): Promise<void> {
		const gc_connection = await this._k_store.resolve(this._gc_serialized.connectionPath);

		switch(gc_connection.type) {
			case 'MmsSparqlConnection': {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				this._k_connection = await VeOdm.createFromSerialized(
					MmsSparqlConnection,
					gc_connection.path as VeoPathTarget,
					gc_connection as MmsSparqlConnection.Serialized,
					this._g_context
				) as unknown as Connection;
				return;
			}

			default: {
				throw new Error(`Unsupported connection type: '${gc_connection.type}' in Transclusion model`);
			}
		}
	}

	get connection(): Connection {
		return this._k_connection;
	}

	setConnection(k_connection: Connection): void {
		this._k_connection = k_connection;
		this._assign({
			connectionPath: k_connection.path,
		});
	}

	get itemIri(): string {
		return this._gc_serialized.item.iri;
	}

	get itemId(): string {
		return this._gc_serialized.item.id;
	}

	async fetchDisplayText(): Promise<string> {
		// use cached string
		if(this._s_display) return this._s_display;

		const k_connection = this._k_connection;

		const k_query = k_connection.detail(this.itemIri);

		const a_rows = await k_connection.execute(k_query.paginate(2));

		if(1 !== a_rows.length) {
			throw new Error(`Expected query to return exactly 1 row, however ${a_rows.length} rows were returned`);
		}

		const si_key = this._gc_serialized.displayAttribute.key;

		this._h_attributes = oderom(a_rows[0], (si_attr, g_field) => ({
			[si_attr]: [key_to_label(si_attr), new HtmlString(g_field.value)],
		}));

		return this._s_display = a_rows[0][si_key].value;
	}

	get fallbackDisplayText(): string {
		return this._gc_serialized.displayAttribute.value;
	}

	get attributes(): Record<string, [string, TypedString]> {
		if(!this._h_attributes) throw new Error('Attributes not yet initialized');

		return this._h_attributes;
	}
}
