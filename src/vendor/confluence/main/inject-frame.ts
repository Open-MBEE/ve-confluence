import { qs } from "#/util/dom";

export const SR_HASH_VE_PAGE_EDIT_MODE = '#ve-page-edit-mode';

const A_NATIVE = [
	'0', 'window', 'self', 'document', 'name', 'location', 'customElements', 'history', 'locationbar',
	'menubar', 'personalbar', 'scrollbars', 'statusbar', 'toolbar', 'status', 'closed', 'frames',
	'length', 'top', 'opener', 'parent', 'frameElement', 'navigator', 'origin', 'external', 'screen',
	'innerWidth', 'innerHeight', 'scrollX', 'pageXOffset', 'scrollY', 'pageYOffset', 'visualViewport',
	'screenX', 'screenY', 'outerWidth', 'outerHeight', 'devicePixelRatio', 'clientInformation',
	'screenLeft', 'screenTop', 'defaultStatus', 'defaultstatus', 'styleMedia', 'onsearch',
	'isSecureContext', 'performance', 'onappinstalled', 'onbeforeinstallprompt', 'crypto', 'indexedDB',
	'webkitStorageInfo', 'sessionStorage', 'localStorage', 'onbeforexrselect', 'onabort', 'onblur',
	'oncancel', 'oncanplay', 'oncanplaythrough', 'onchange', 'onclick', 'onclose', 'oncontextmenu',
	'oncuechange', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover',
	'ondragstart', 'ondrop', 'ondurationchange', 'onemptied', 'onended', 'onerror', 'onfocus',
	'onformdata', 'oninput', 'oninvalid', 'onkeydown', 'onkeypress', 'onkeyup', 'onload',
	'onloadeddata', 'onloadedmetadata', 'onloadstart', 'onmousedown', 'onmouseenter', 'onmouseleave',
	'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel', 'onpause', 'onplay',
	'onplaying', 'onprogress', 'onratechange', 'onreset', 'onresize', 'onscroll', 'onseeked',
	'onseeking', 'onselect', 'onstalled', 'onsubmit', 'onsuspend', 'ontimeupdate', 'ontoggle',
	'onvolumechange', 'onwaiting', 'onwebkitanimationend', 'onwebkitanimationiteration',
	'onwebkitanimationstart', 'onwebkittransitionend', 'onwheel', 'onauxclick', 'ongotpointercapture',
	'onlostpointercapture', 'onpointerdown', 'onpointermove', 'onpointerup', 'onpointercancel',
	'onpointerover', 'onpointerout', 'onpointerenter', 'onpointerleave', 'onselectstart',
	'onselectionchange', 'onanimationend', 'onanimationiteration', 'onanimationstart',
	'ontransitionrun', 'ontransitionstart', 'ontransitionend', 'ontransitioncancel', 'onafterprint',
	'onbeforeprint', 'onbeforeunload', 'onhashchange', 'onlanguagechange', 'onmessage', 'onmessageerror',
	'onoffline', 'ononline', 'onpagehide', 'onpageshow', 'onpopstate', 'onrejectionhandled', 'onstorage',
	'onunhandledrejection', 'onunload', 'alert', 'atob', 'blur', 'btoa', 'cancelAnimationFrame',
	'cancelIdleCallback', 'captureEvents', 'clearInterval', 'clearTimeout', 'close', 'confirm',
	'createImageBitmap', 'fetch', 'find', 'focus', 'getComputedStyle', 'getSelection', 'matchMedia',
	'moveBy', 'moveTo', 'open', 'postMessage', 'print', 'prompt', 'queueMicrotask', 'releaseEvents',
	'requestAnimationFrame', 'requestIdleCallback', 'resizeBy', 'resizeTo', 'scroll', 'scrollBy',
	'scrollTo', 'setInterval', 'setTimeout', 'stop', 'webkitCancelAnimationFrame',
	'webkitRequestAnimationFrame', 'chrome', 'caches', 'cookieStore', 'ondevicemotion',
	'ondeviceorientation', 'ondeviceorientationabsolute', 'showDirectoryPicker', 'showOpenFilePicker',
	'showSaveFilePicker', 'speechSynthesis', 'originAgentCluster', 'onpointerrawupdate', 'trustedTypes',
	'crossOriginIsolated', 'openDatabase', 'webkitRequestFileSystem', 'webkitResolveLocalFileSystemURL',
	'loadTimeData', 'JSCompiler_renameProperty', 'ShadyCSS', 'mojo', 'mojoBase', 'skia', 'url', 'search',
	'realbox', 'newTabPage', 'cr', 'chromeCart', 'promoBrowserCommand', 'drive', 'taskModule',
];

const A_KEEP = [
	'AJS', '$', 'jQuery', 'jquery',
	// 'define', 'require',
	// 'WRM',
];

const A_DEFS = [...A_NATIVE, ...A_KEEP];

export async function inject_frame(p_href: string): Promise<void> {
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
		// d_script.src = 'http://localhost:3001/public/inject.js';
		d_script.src = 'https://ced-cdn-test.s3-us-gov-west-1.amazonaws.com/confluence-ui/injected-editor.js';
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
	for(let i=0; i<64; i++) {
		await Promise.resolve();
	}

	// clear all script tags
	document.head.innerHTML = '';

	// clean up global scope
	for(const si_decl in window) {
		if(!A_DEFS.includes(si_decl)) {
			try {
				delete window[si_decl];
			}
			catch(e_del) {

			}
		}
	}

	// let any remaining microtasks die
	for(let i=0; i<64; i++) {
		await Promise.resolve();
	}

	// use special URL to indicate edit mode
	{
		// debugger;
		const pr_target = location.pathname.replace(/\+*$/, `+++${SR_HASH_VE_PAGE_EDIT_MODE}`);

		// current href does not match target, push to history
		if(pr_target !== location.pathname+location.search+location.hash) {
			// history.pushState(null, '', pr_target);
			history.replaceState(null, '', pr_target);
		}
	}

	// open, write and close document
	{
		document.open();
		document.write(sx_injected);
		document.close();
	}

	// monkey-patch editor styling
	{
		const d_observer = new MutationObserver((a_muts) => {
			const dm_editor = document.getElementById('wysiwygTextarea_ifr') as HTMLIFrameElement;
			if(!dm_editor) return;

			const d_editor_doc = dm_editor.contentDocument!;
			const dm_editor_head = d_editor_doc.head;
			const dm_css = d_editor_doc.createElement('link');
			dm_css.type = 'text/css';
			dm_css.rel = 'stylesheet';
			dm_css.media = 'all';
			dm_css.href = 'https://wiki.jpl.nasa.gov/s/69afc5555c45d13b7cc6239935b399e5-CDN/-25huub/8505/f5e71ce5e7eab96b69c873705d53960b71f86fff/c5daead80556afbde9c4a23a2c202d7b/_/download/contextbatch/css/editor-content/batch.css?frontend.editor.v4=true';
			dm_css.id = 've4-forced-style';
			dm_editor_head.appendChild(dm_css);

			d_observer.disconnect();
		});

		document.addEventListener('DOMContentLoaded', () => {
			d_observer.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: false,
				characterData: false,
			});
		});
	}
}
