interface Process {
	env: Record<string, string>;
}

type Lang = Record<string, Record<string, string>>;

export const process: Process = null as unknown as Process;

export const lang: Lang = null as unknown as Lang;

export const confluence_editor_injections = null as unknown as {
	[attr: string]: string | undefined;
	$: string;
}[];

export let static_css = '';

static_css += /* syntax: css */ `
	:root {
		--ve-font-size-header-1: 28px;
		--ve-font-size-header-2: 16px;
		--ve-font-size-body-content: 14px;
		--ve-font-size-table-header: 12px;

		--ve-color-light-background: #F5F5F5;
		--ve-color-dark-background: #404040;
		--ve-color-darker-background: #333333;
		--ve-color-dark-text: #333333;
		--ve-color-medium-text: #8D8D8D;
		--ve-color-medium-light-text: #D0D0D0;
		--ve-color-light-text: #FFFFFF;
		--ve-color-accent-light: #2C7E8F;
		--ve-color-accent-dark: #205C68;
		--ve-color-accent-darker: #E6E6E6;
		--ve-color-accent-dark-border: #102E34;
		--ve-color-button-light: #EDEDED;
		--ve-color-error-red: #FF6060;
	}

	.ve-tag-pill {
		cursor: default;
		background-color: var(--ve-color-medium-text);
		border-radius: 17px;
		font-size: 10px;
		color: var(--ve-color-light-text);
		padding: 2px 4px;
		font-weight: 500;
		vertical-align: middle;
	}

	.ve-transclusion-display {
		padding-left: 3px;
	}
	.observes-inline {
		display: inline;
	}

`;

export const static_js = '';

export type Ve4MetadataKeyConfluencePage = 've4_confluence_page';
export type Ve4MetadataKeyConfluenceDocument = 've4_confluence_document';

export type Ve4MetadataKey =
	| Ve4MetadataKeyConfluencePage
	| Ve4MetadataKeyConfluenceDocument;

export type Ve4MetadataKeyStruct = {
	CONFLUENCE_PAGE: Ve4MetadataKeyConfluencePage;
	CONFLUENCE_DOCUMENT: Ve4MetadataKeyConfluenceDocument;
};

export const G_VE4_METADATA_KEYS: Ve4MetadataKeyStruct = {
	CONFLUENCE_PAGE: 've4_confluence_page',
	CONFLUENCE_DOCUMENT: 've4_confluence_document',
};
