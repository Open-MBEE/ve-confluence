import {
    Serializable,
    PresentationElement,
} from './Serializable';

export interface SerializedDataTable extends Serializable {
    type: 'SPARQL' | 'VQL';
}

export abstract class DataTable<Serialized extends SerializedDataTable> extends PresentationElement<Serialized> {

}

export type {PresentationElementClass} from './Serializable';
