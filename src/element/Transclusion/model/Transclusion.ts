import type {TypedLabeledObject} from '#/common/types';

import type {VeoPath, VeoPathTarget} from '#/common/veo';

import {Connection, MmsSparqlConnection} from '#/model/Connection';

import {VeOdm, VeOdmLabeled} from '#/model/Serializable';


export namespace Transclusion {
	type DefaultType = `Transclusion`;

	export interface Serialized<TypeString extends DefaultType=DefaultType> extends TypedLabeledObject<TypeString> {
		connectionPath: VeoPathTarget;
		item: {
			iri: string;
		};
		displayAttribute: {
			key: string;
			label: string;
			value: string;
		};
	}
}

export class Transclusion<
	Serialized extends Transclusion.Serialized=Transclusion.Serialized,
> extends VeOdmLabeled<Serialized> {
	protected _s_display!: string;
	protected _k_connection!: Connection;

	initSync(): void {
		this._s_display = '';
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

	get itemIri(): string {
		return this._gc_serialized.item.iri;
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

		return this._s_display = a_rows[0][si_key].value;
	}

	get fallbackDisplayText(): string {
		return this._gc_serialized.displayAttribute.value;
	}
}
