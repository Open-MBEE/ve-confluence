import {
	dd,
	qs,
} from "#/util/dom";

import {
	process,
} from '#/common/static';

export const SR_HASH_VE_PAGE_EDIT_MODE = '#editor';

export const P_SRC_EDITOR_SUPPLEMENT = process.env.EDITOR_SUPPLEMENT_SRC;

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
	// open, write and close document
	{
		document.open();
		document.write('<html><body><div id="ve4-loading">Loading...</div></body></html>');
		document.close();
		window.addEventListener('popstate', (event) => {
			setTimeout(()=>{
				location.reload();
			}); // user hits back button
		});
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
