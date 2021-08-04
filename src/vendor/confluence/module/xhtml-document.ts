import xpath, {SelectedValue} from 'xpath';

import {
	DOMParser,
	XMLSerializer,
} from 'xmldom';

type Hash = Record<string, string>;

// prefix to use for all generated view IDs
const SI_VIEW_PREFIX = 've4';

// unique namespaces prefix
const P_URN_NS = 'urn:confluence-prefix:';

// set of prefixes to support when parsing XHTML strings from Confluence
const AS_PREFIXES = new Set(['ac', 'ri']);

// dict of namespaces to support from prefixes
const H_NAMESPACES = [...AS_PREFIXES].reduce(
	(h_out, si_ns) => ({
		...h_out,
		[si_ns]: `${P_URN_NS}${si_ns}`,
	}),
	{}
) as Hash;

// prepare XHTML namespace declaration string
const SX_NAMESPACES = [...AS_PREFIXES]
	.map(si_ns => `xmlns:${si_ns}="${P_URN_NS}${si_ns}"`)
	.join(' ');

const G_NS_RESOLVER = {
	lookupNamespaceURI: (s_ns: string | null): string | null => s_ns? H_NAMESPACES[s_ns] || null: null,
};

// for excluding elements that are within active directives
const SX_PARAMETER_ID = `ac:parameter[@ac:name="id"][starts-with(text(),"${SI_VIEW_PREFIX}-")]`;
const SX_EXCLUDE_ACTIVE_DIRECTIVES = `[not(ancestor::ac:structured-macro[@ac:name="span"][child::${SX_PARAMETER_ID}])]`;

// css style for active directives
const SX_STYLE_DIRECTIVE = 'background-color:lemonchiffon;';

const select_ns = xpath.useNamespaces({...H_NAMESPACES});

export const xpathSelect = (sx_xpath: string, ...a_args: any[]) => select_ns(sx_xpath.replace(/&nbsp;/g, '&#160;'), ...a_args);

export function xpathSelect1<ReturnType extends SelectedValue=SelectedValue>(sx_xpath: string, yn_context?: Node): ReturnType {
	return select_ns(sx_xpath.replace(/&nbsp;/g, '&#160;'), yn_context as Node, true) as ReturnType;
}

// @ts-expect-error ignore spread error
export const xpathEvaluate = (sx_xpath: string, yn_context?: Node, ...a_args: any[]) => xpath.evaluate(sx_xpath.replace(/&nbsp;/g, '&#160;'), yn_context || null, G_NS_RESOLVER, ...a_args);

export class XHTMLDocument {
	static xhtmlToNodes(sx_xhtml: string): ChildNode[] {
		return [...new XHTMLDocument(sx_xhtml)];
	}

	_sx_doc: string;
	_y_doc: XMLDocument;

	constructor(sx_doc='') {
		this._sx_doc = sx_doc.replace(/&nbsp;/g, '&#160;');

		this._y_doc = (new DOMParser()).parseFromString(`<xml ${SX_NAMESPACES}>${this._sx_doc}</xml>`);
	}

	get root(): Node {
		return this._y_doc.childNodes[0];
	}

	* [Symbol.iterator]<ElementType extends ChildNode>(): Generator<ElementType> {
		for(const yn_child of [].slice.call(this.root.childNodes) as ElementType[]) {
			yield yn_child;
		}
	}

	clone(): XHTMLDocument {
		return new XHTMLDocument(this.toString());
	}

	select<NodeType extends SelectedValue=SelectedValue>(sx_xpath: string): NodeType[] {
		return xpathSelect(sx_xpath, this._y_doc) as NodeType[];
	}

	// eval(sx_xpath: string): any {
	// 	return xpath.evaluate(sx_xpath, this._y_doc, F_NS_RESOLVER, XPathResult.STRING_TYPE, null);
	// }

	select1<NodeType extends SelectedValue=SelectedValue>(sx_xpath: string): NodeType {
		return xpathSelect(sx_xpath, this._y_doc, true)[0] as NodeType;
	}

	createCDATA(s_cdata: string): CDATASection {
		return this._y_doc.createCDATASection(s_cdata);
	}

	toString(): string {
		return new XMLSerializer()
			.serializeToString(this.root)
			.replace(/^\s*<xml[^>]*>\s*|\s*<\/xml>\s*$/g, '');
	}

	builder(): (s_tag: string, h_attrs?: Hash, a_children?: Array<string | Node>) => Node {
		const y_doc = this._y_doc;

		return function(
			s_tag: string,
			h_attrs: Record<string, string> = {},
			a_children: Array<string | Node> = []
		): Node {
			const ym_node = y_doc.createElement(s_tag);

			for(const si_attr in h_attrs) {
				ym_node.setAttribute(si_attr, h_attrs[si_attr]);
			}

			for(const z_child of a_children) {
				let ym_child = z_child as Node;

				if('string' === typeof z_child) {
					ym_child = y_doc.createTextNode(z_child);
				}

				if(ym_child) {  //  && null === ym_child.parentNode
					ym_node.appendChild(ym_child);
				}
			}

			return ym_node;
		};
	}
}

export default XHTMLDocument;
