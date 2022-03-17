import {
	dd,
	qs,
} from "#/util/dom";

import {
	process,
} from '#/common/static';

export const SR_HASH_VE_PAGE_EDIT_MODE = '#editor';

export const P_SRC_EDITOR_SUPPLEMENT = process.env.EDITOR_SUPPLEMENT_SRC || 'https://ced.jpl.nasa.gov/cdn/editor.min.js';
// process.env.PRODUCTION? 'https://ced-uat.jpl.nasa.gov/cdn/editor.min.js': 'http://localhost:3001/public/build/editor.dev.js';


async function microtasks_expire() {
	for(let i=0; i<128; i++) {
		await Promise.resolve();
	}
}

export async function inject_frame(p_href: string): Promise<void> {
	// mimic loading UI
	{
		const dm_edit = qs(document.body, 'a#editPageLink') as HTMLAnchorElement;
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
		const pr_target = location.pathname.replace(/\+*$/, `+++${SR_HASH_VE_PAGE_EDIT_MODE}`);

		// current href does not match target, push to history
		if(pr_target !== location.pathname+location.search+location.hash) {
			// history.pushState(null, '', pr_target);
			history.replaceState(null, '', pr_target);
		}

		// set iframe target
		Object.assign(window, {ve4_iframe_target:pr_target});
	}

	// open, write and close document
	{
		document.open();
		document.write('<html><body><div id="ve4-loading">Loading...</div></body></html>');
		document.close();
	}

	{
		const dm_iframe: HTMLIFrameElement = dd('iframe');
		// hijack iframe href changes
		
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

		// inject editor js and monitor window unload events
		const f_attach_unload = () => {
			dm_iframe.contentWindow?.removeEventListener('unload', fk_unload);
			dm_iframe.contentWindow?.addEventListener('unload', fk_unload);
			dm_iframe.contentDocument?.body.appendChild(dd('script', {
				type: 'text/javascript',
				src: P_SRC_EDITOR_SUPPLEMENT,
			}, [], dm_iframe.contentDocument));
		};

		dm_iframe.onload = f_attach_unload;
		dm_iframe.src = p_href;
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
	}
}
