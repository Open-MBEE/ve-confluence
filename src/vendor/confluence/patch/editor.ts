import { oderac } from "#/util/belt";
import { qsa } from "#/util/dom";


function hide_ve_script_macro() {
	// confluence macro params in order
	const h_macro_params = {
		'atlassian-macro-output-type': 'INLINE',
		'id': 've-script',
		'style': 'display:none',
	};

	// query selector params
	const h_select = {
		'data-macro-name': 'span',
		'data-macro-parameters': oderac(h_macro_params, (si_key, s_value) => `${si_key}=${s_value}`).join('|'),
	};

	// compile query selector filter
	const sx_qs_filter = oderac(h_select, (si_key, s_value) => `[${si_key}="${s_value.replace(/"/g, '\\"')}"]`).join('');

	// select all nodes, set display to none
	(qsa(document, `.wysiwyg-macro${sx_qs_filter}`) as HTMLElement[]).forEach(d => d.style.display = 'none');
}

// [].forEach.call(document.querySelectorAll('.wysiwyg-macro[data-macro-name="span"][data-macro-parameters="atlassian-macro-output-type=INLINE|id=ve-script|style=display:none"]'), d => d.style.display = 'none')