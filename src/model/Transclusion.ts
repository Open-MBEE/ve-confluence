import type {TypedLabeledObject} from '#/common/types';

import type {VeoPathTarget} from '#/common/veo';

import type {Connection} from './Connection';

import {VeOdmLabeled} from './Serializable';


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
	async fetchConnection(): Promise<Connection> {
		return await this._k_store.resolve<Connection>(this._gc_serialized.connectionPath);
	}
}
