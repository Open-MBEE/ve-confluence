import {
	dd,
	qs,
} from "#/util/dom";

import {
	confluence_editor_injections,
} from '#/common/static';

export const SR_HASH_VE_PAGE_EDIT_MODE = '#editor';

// export const P_SRC_WYSIWYG_EDITOR = 'https://ced-cdn-test.s3-us-gov-west-1.amazonaws.com/confluence-ui/injected-editor.js';
export const P_SRC_WYSIWYG_EDITOR = 'http://localhost:3001/public/build/confluence-editor.js';

const B_AWAIT_PRELOAD = true;

const RT_STRINGIFIED_FUNCTION_NATIVE = /^\s*function\s+([a-zA-Z0-9_$]+)\([^)]*\)\s*\{\s*\[\s*native\s+code\s*\]\s*\}\s*$/;

async function microtasks_expire() {
	for(let i=0; i<128; i++) {
		await Promise.resolve();
	}
}

function reset_window() {
	const a_uncertain = [];

	// create fresh window instance
	const dm_iframe: HTMLIFrameElement = dd('iframe');
	document.documentElement.appendChild(dm_iframe);
	const d_window = dm_iframe.contentWindow;
	const AS_WINDOW_NAKED_PROPERTY: Set<string> = new Set(Object.getOwnPropertyNames(d_window));

	// only enumerable properties
	for(const si_decl in window) {
		// property of naked window
		if(AS_WINDOW_NAKED_PROPERTY.has(si_decl)) continue;

		// get descriptor
		const g_desc = Object.getOwnPropertyDescriptor(window, si_decl);

		// not configurable, skip
		if(!g_desc || !g_desc?.configurable) {
			debugger;
			continue;
		}

		// native
		if(g_desc.get || g_desc.set) {
			debugger;
			continue;
		}

		// function
		if('function' === typeof g_desc.value) {
			// stringify
			const s_function = (g_desc.value as VoidFunction).toString();

			debugger;

			// native
			if(RT_STRINGIFIED_FUNCTION_NATIVE.test(s_function)) continue;
		}

		// uncertain
		a_uncertain.push(si_decl);

		// if(!A_DEFS.includes(si_decl)) {
		// 	try {
		// 		delete window[si_decl];
		// 	}
		// 	catch(e_del) {

		// 	}
		// }
	}

	debugger;
	console.dir(a_uncertain);
}

export async function inject_frame(p_href: string): Promise<void> {
	// mimic loading UI
	{
		const dm_edit = qs(document.body, 'a#editPageLink') as HTMLAnchorElement
		(qs(dm_edit, '.aui-iconfont-edit') as HTMLSpanElement).style.visibility = 'hidden';

		// use same jQuery call as confluence
		try {
			($(dm_edit) as unknown as {spin: () => void}).spin();
		}
		// didn't work
		catch(e_jquery) {
			// try manually as fallback
			try {
				// clone spinner and append to edit page link
				const dm_spinner = qs(document.body, 'aui-spinner[size="small"]').cloneNode(true) as HTMLElement;
				dm_edit.appendChild(dm_spinner);

				dm_spinner.toggleAttribute('filled', true);
				(qs(dm_spinner, 'svg') as HTMLElement).style.top = '-20px;';
			}
			// didn't work either
			catch(e_manual) {
				// doesn't matter, keep going
			}
		}
	}

	// purge 'editor' from hash
	{
		const as_parts = new Set(location.hash.slice(1).split(/:/g));
		as_parts.delete('editor');

		history.replaceState(null, '', `#${[...as_parts].join(':')}`);
	}

	// ensure editor script is fully loaded before clearing page
	let b_script_loaded = !B_AWAIT_PRELOAD;
	let fk_script_loaded = () => {
		b_script_loaded = true;
	};

	// initiate script load
	if(B_AWAIT_PRELOAD) {
		// create script element
		const dm_load = dd('script', {
			type: 'text/javascript',
			charset: 'utf-8',
			defer: true,
			async: true,
			src: P_SRC_WYSIWYG_EDITOR,
		});

		// set onload handler
		dm_load.onload = fk_script_loaded;

		// append to dom
		document.head.appendChild(dm_load);
	}

	// initiate request for actual edit page
	const d_res = await fetch(p_href, {
		method: 'GET',
		headers: {
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
		},
	});

	// download html
	const sx_doc = await d_res.text();

	// create parser and parse document
	const d_parser = new DOMParser();
	const d_doc = d_parser.parseFromString(sx_doc, 'text/html');

	// replace editor script src
	{
		const d_script = qs(d_doc, 'script[data-wrm-key^="editor-v4"]') as HTMLScriptElement;
		d_script.src = P_SRC_WYSIWYG_EDITOR;
	}

	// remove things that mess up view
	{
		const dm_webmetrics_p = qs(d_doc, 'p>img[src^="//webmetrics"]')?.parentNode;
		if(dm_webmetrics_p) {
			dm_webmetrics_p.parentNode?.removeChild(dm_webmetrics_p);
		}

		const dm_bloat = qs(d_doc, '#header-precursor');
		if(dm_bloat) {
			dm_bloat?.parentNode?.removeChild(dm_bloat);
		}
	}

	// reserialize the document
	const d_serializer = new XMLSerializer();
	const sx_injected = d_serializer.serializeToString(d_doc);

	// await for script to load
	if(!b_script_loaded) {
		await new Promise((fk_resolve) => {
			fk_script_loaded = () => fk_resolve(void 0);
		});
	}

	debugger;

	// let all microtasks die
	await microtasks_expire();

	// clear all timeouts
	{
		let i_timer = window.setTimeout(() => {}, 0);  // eslint-disable-line @typescript-eslint/no-empty-function
		while(i_timer--) {
			window.clearTimeout(i_timer);
		}
	}

	// clear all intervals
	{
		let i_interval = window.setInterval(() => {}, 1000*60*60*24*365);  // eslint-disable-line @typescript-eslint/no-empty-function
		while(i_interval--) {
			window.clearInterval(i_interval);
		}
	}

	// let all microtasks die
	await microtasks_expire();

	// clear all script tags
	document.head.innerHTML = '';

	// // clean up global scope
	// {
	// 	reset_window();
	// }

	// let any remaining microtasks die
	await microtasks_expire();

	// use special URL to indicate edit mode
	{
		// debugger;
		const pr_target = location.pathname.replace(/\+*$/, `+++${SR_HASH_VE_PAGE_EDIT_MODE}`);

		// current href does not match target, push to history
		if(pr_target !== location.pathname+location.search+location.hash) {
			// history.pushState(null, '', pr_target);
			history.replaceState(null, '', pr_target);
		}

		// set iframe target
		Object.assign(window, {ve4_iframe_target:pr_target});
	}

	debugger;

	// open, write and close document
	{
		document.open();
		document.write('<html><body><div id="ve4-loading">Loading...</div></body></html>');
		document.close();
	}

	debugger;

	// create iframe
	{
		const dm_iframe: HTMLIFrameElement = dd('iframe');
		document.body.appendChild(dm_iframe);
		const dm_loading = qs(document.body, 'div#ve4-loading');
		dm_loading.parentElement?.removeChild(dm_loading);
		document.body.style.margin = '0';
		Object.assign(dm_iframe.style, {
			border: 'none',
			position: 'absolute',
			top: '0',
			left: '0',
			width: '100%',
			height: '100%',
		});
		const d_document = dm_iframe.contentDocument;
		if(!d_document) {
			throw new Error('no iframe');
		}

		// hijack iframe href changes
		{
			// upon unload event
			const fk_unload = () => {
				// allow URL to change
				setTimeout(() => {
					const p_href_new = dm_iframe.contentWindow?.location.href;
					if(p_href_new) {
						location.href = p_href_new;
					}
				}, 0);
			};

			// monitor window unload events
			const f_attach_unload = () => {
				dm_iframe.contentWindow?.removeEventListener('unload', fk_unload);
				dm_iframe.contentWindow?.addEventListener('unload', fk_unload);
			};

			// once iframe is loaded
			dm_iframe.addEventListener('load', f_attach_unload);
			f_attach_unload();

			// dm_iframe.addEventListener('load', () => {
			// 	new MutationObserver((a_mutations) => {
			// 		debugger;
			// 		for(const d_mutation of a_mutations) {
			// 			if('attributes' === d_mutation.type && 'src' === d_mutation.attributeName) {
			// 				const p_href_new = d_mutation.target.src;
			// 				debugger;
			// 				console.dir(p_href_new);

			// 				location.href = p_href_new;
			// 				return;
			// 			}
			// 		}
			// 	}).observe(dm_iframe, {
			// 		attributes: true,
			// 		attributeFilter: ['src'],
			// 		characterData: false,
			// 		characterDataOldValue: false,
			// 		childList: false,
			// 		subtree: true,
			// 	});
			// });
		}

		
		// write injected HTML into iframe document
		{
			d_document.open();
			d_document.write(sx_injected);
			d_document.close();
		}

		debugger;

		// monkey-patch editor styling
		{
			const try_styling = () => {
				const dm_editor = d_document.getElementById('wysiwygTextarea_ifr') as HTMLIFrameElement;
				if(!dm_editor) return;

				const d_editor_doc = dm_editor.contentDocument!;
				const dm_editor_head = d_editor_doc.head;

				debugger;
				if(Array.isArray(confluence_editor_injections)) {
					for(const gc_element of confluence_editor_injections as Record<string, string>[]) {
						try {
							const dm = d_editor_doc.createElement(gc_element.$);
							delete gc_element.$;
							Object.assign(dm, gc_element);
							dm_editor_head.appendChild(dm);
						}
						catch(e_create) {
							console.error(`Failed to created confluence editor injection element due to ${(e_create as Error).message}: ${JSON.stringify(gc_element)}`);
						}
					}
				}

				d_observer.disconnect();

				// const dm_css = d_editor_doc.createElement('link');
				// dm_css.type = 'text/css';
				// dm_css.rel = 'stylesheet';
				// dm_css.media = 'all';
				// dm_css.href = 'https://wiki.jpl.nasa.gov/s/69afc5555c45d13b7cc6239935b399e5-CDN/-25huub/8505/f5e71ce5e7eab96b69c873705d53960b71f86fff/c5daead80556afbde9c4a23a2c202d7b/_/download/contextbatch/css/editor-content/batch.css?frontend.editor.v4=true';
				// dm_css.id = 've4-forced-style';
				// dm_editor_head.appendChild(dm_css);
			};

			const d_observer = new MutationObserver(() => {
				try_styling();
			});

			d_document.addEventListener('DOMContentLoaded', () => {
				d_observer.observe(d_document.body, {
					childList: true,
					subtree: true,
					attributes: false,
					characterData: false,
				});

				debugger;
				try_styling();
			});
		}

	}
}
