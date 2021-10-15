import type {SearcherMask} from '#/common/helper/sparql-code';

import type {VeoPathTarget} from '#/common/veo';
import type { ConnectionQuery } from '#/element/QueryTable/model/QueryTable';

import type {Connection} from '#/model/Connection';

export enum DisplayMode {
	ITEM,
	ATTRIBUTE,
}

export interface Channel {
	connection_path: VeoPathTarget;
	connection: Connection;
	types: SearcherMask;
	limit?: number;
	hash: string;
}

export interface ChannelConfig {
	label: string;
	search: (s_input: string, xm_types?: SearcherMask) => ConnectionQuery;
}

export interface ShowConfig {
	x: string;
	y: string;
	mode: DisplayMode;
}

export enum GroupState {
	FRESH,
	DIRTY,
}

export interface Row {
	title: string;
	subtitle: string;
	source: Connection;
	uri: string;
}

export type RowGroup = {
	channel_hash: string;
	state: GroupState;
	rows: Row[];
};


export interface Scenario {
	input: string;
	groups: Record<string, RowGroup>;
	ready: boolean;
}

