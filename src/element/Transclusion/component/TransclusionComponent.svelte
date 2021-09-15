<script lang="ts">
    import type { Transclusion } from "../model/Transclusion";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { onMount } from "svelte";
import Fa from "svelte-fa";

    /**
     * The transclusion model
     */
    export let k_model: Transclusion;

	/**
	 * The HTML element to which this view element is anchored
	 */
	export let dm_anchor = document.createElement('div');

	/**
	 * An optional XHTML node that should be replaced when publishing this table to the page
	*/
	export let yn_directive: Node & {
		localName: string;
	};

	/**
	 * Whether or not this table is already published
	 */
	export let b_published = false;


    let s_display: string;

    if(dm_anchor) {
        dm_anchor.style.display = 'none';
    }

    (async() => {
        s_display = await k_model.fetchDisplayText();
    })();


    let b_display_hover = false;

    function enable_hover() {
        b_display_hover = true;
    }

    function disable_hover() {
        b_display_hover = false;
    }
</script>


<style lang="less">
    a {
        background-color: var(--ve-color-button-light);
        font-weight: 500;
        padding: 3px 6px;
        border-radius: 3px;

        &:hover {
            background-color: #FFFDD1;
        }
    }
</style>

<div class="hover" style="display:{b_display_hover? 'block': 'none'}">
    
</div>

<a href={k_model.itemIri} class="transclusion" on:mouseover={enable_hover()} on:mouseout={disable_hover()}>
    <span>
        <Fa icon={faBolt} />
    </span>
    <span>
        {s_display || k_model.fallbackDisplayText}
    </span>
</a>
