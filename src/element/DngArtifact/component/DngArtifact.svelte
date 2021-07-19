<script lang="ts">
	import {onMount} from 'svelte';
	import H_PREFIXES from '#/common/prefixes';
	import { dd } from '#/util/dom';
import type { Context } from '#/model/Serializable';
import { MmsSparqlConnection } from '#/model/Connection';

	export let ym_anchor: HTMLElement;
	export let g_link: Record<string, string>;

	
	// hide original element
	ym_anchor.style.display = 'none';

	/**
	 * input href of artifact
	 */
	export let p_href = '';

	/**
	 * optional display label for the link on the page
	 */
	export let s_label = '';

	/**
	 * optional input artifact id
	 */
	export let si_artifact = '';

	export let g_context: Context;


	// canonical iri of the dng artifact
	let p_artifact = '';

	// tooltip display text
	let s_tooltip = '';

	// title of the dng artifact
	let s_title = '';

	// primary text of the dng artifact
	let s_primary_text = '';

	let s_type;

	let dm_macro: HTMLSpanElement;

	// once component mounts
	onMount(async() => {
		// enable tooltip
		jQuery(dm_macro).tipsy();
		
		// href IRI specified
		if(p_href) {
			const du_href = new URL(p_href);
			p_artifact = p_href;

			// web link
			if(du_href.pathname.startsWith('/rm/web')) {
				p_artifact = (new URLSearchParams(du_href.hash.slice(1))).get('artifactURI') || 'invalid-artifact-url://';
			}
			// clear search params
			else {
				du_href.search = '';
				p_artifact = du_href.toString();
			}

			// resolve connection path
			const gc_sparql_connection = await g_context.store.resolve<MmsSparqlConnection.Serialized>('document#connection.sparql.mms.dng');
			const k_sparql = new MmsSparqlConnection(gc_sparql_connection, g_context);

			// find artifact by IRI
			const a_artifacts = await k_sparql.execute(/* syntax: sparql */ `
				select ?title ?identifier ?primaryText (group_concat(?type; separator="\\u0000") as ?types) from <${k_sparql.modelGraph}> {
					<${p_artifact}> a ?type ;
						dct:title ?title ;
						dct:identifier ?identifier ;
						.
					
					optional {
						<${p_artifact}> jazz_rm:primaryText ?primaryText .
					}
				} group by ?title ?identifier ?primaryText	
			`);

			// found it
			if(a_artifacts.length) {
				const {
					title: {value:_s_title},
					identifier: {value:s_identifier},
					types: {value:s_types},
					primaryText: {value:_s_primary_text},
				} = a_artifacts[0];

				// split concat'd types list
				const a_types = s_types.split('\0');

				// requirement
				if(a_types.includes(H_PREFIXES.oslc_rm+'Requirement')) {
					si_artifact = s_identifier;
					s_type = 'Requirement';
					s_title = _s_title;
					s_primary_text = _s_primary_text;

					// use requirement title in place of pasted link
					if(ym_anchor.textContent === p_href) {
						s_label = s_title
					}
					// use narrative text if present
					else {
						s_label = String(ym_anchor.textContent)
					}
				}
			}
		}
	});

	// reactively assign tooltip text based on query result
	$: s_tooltip = `DNG ${si_artifact}, ${s_title}: `+((() => {
		const dm = dd('div');
		dm.innerHTML = s_primary_text;
		return dm;
	})().textContent || '').trim();

</script>

<style lang="less">
	.wrapper {
		.info {
			.label {
				max-width: 400px;
			}
		}
	}
</style>

<span class="wrapper">
	<!-- <input type="text" value="{si_artifact}" >
	<span class="info">
		<span class="label">{s_label}</span>
	</span> -->
	<span class="preview">
		<span bind:this={dm_macro} id="ve4-directive-tooltip-d2b512da419f477f801de24b5c336546" class="inline-first-p conf-macro output-inline" data-hasbody="true" data-macro-name="span" original-title="{s_tooltip}">
			<a href="{p_artifact}" class="external-link" rel="nofollow">{s_label}</a>
		</span>
	</span>
</span>
