
type PlainContentType = 'text/plain';
type HtmlContentType = 'text/html';
type XhtmlContentType = 'application/xhtml+xml';

type ContentType = PlainContentType | HtmlContentType | XhtmlContentType;

export abstract class TypedString<ContentTypeString extends ContentType=ContentType> {
	private readonly _s_source: string;

	constructor(s_source: string) {
		this._s_source = s_source;
	}

	abstract readonly contentType: ContentTypeString;

	abstract get textContent(): string;

	toString(): string {
		return this._s_source;
	}
}

export class PlainString extends TypedString<PlainContentType> {
	readonly contentType = 'text/plain';

	get textContent(): string {
		return this.toString();
	}
}

export class HtmlString extends TypedString<HtmlContentType> {
	readonly contentType = 'text/html';

	get textContent(): string {
		return new DOMParser().parseFromString(this.toString(), this.contentType).textContent || '';
	}
}

export class XhtmlString extends TypedString<XhtmlContentType> {
	readonly contentType = 'application/xhtml+xml';

	get textContent(): string {
		return new DOMParser().parseFromString(this.toString(), this.contentType).textContent || '';
	}
}


export function tag_string<ClassType extends TypedString>(dc_class: {new(s_source: string): ClassType}, a_strings: TemplateStringsArray, a_exprs: string[]): ClassType {
	const s_source = (a_strings[0] || '')+a_exprs.reduce((s_out, s_string, i_string) => s_out+s_string+a_strings[i_string+1], '');
	return new dc_class(s_source);
}

export const plain = (a_strings: TemplateStringsArray, ...a_exprs: string[]): PlainString => tag_string(PlainString, a_strings, a_exprs);

export const html = (a_strings: TemplateStringsArray, ...a_exprs: string[]): HtmlString => tag_string(HtmlString, a_strings, a_exprs);

export const xhtml = (a_strings: TemplateStringsArray, ...a_exprs: string[]): XhtmlString => tag_string(XhtmlString, a_strings, a_exprs);

export const escape_html = (s: string): string => s.replace(/</g, '&lt;');
