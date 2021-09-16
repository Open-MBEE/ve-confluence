<script lang="ts">
	import type {Transclusion} from '../model/Transclusion';

	import {
		faBolt,
		faHistory,
	} from '@fortawesome/free-solid-svg-icons';

	import {onMount} from 'svelte';

	import Fa from 'svelte-fa';

	import {MmsSparqlConnection} from '#/model/Connection';

	import type {TypedString} from '#/util/strings';

	import {ode} from '#/util/belt';
import { dm_main, qs } from '#/util/dom';

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

	export let b_inlined = false;

	let dm_hover!: HTMLDivElement;

	let dm_link!: HTMLElement;

	let h_attributes: Record<string, [string, TypedString]> = {};

	let s_display: string;

	let s_display_version = '';

	if(dm_anchor) {
		dm_anchor.style.display = 'none';
	}

	(async() => {
		s_display = await k_model.fetchDisplayText();

		h_attributes = k_model.attributes;

		// align with link
		if(b_inlined) {
			const g_rect = dm_link.getBoundingClientRect();

			const g_main = dm_main.getBoundingClientRect();

			dm_hover.style.top = (g_rect.top - g_main.top)+'px';
			dm_hover.style.left = (g_rect.left - g_main.left)+'px';
		}
	})();


	let b_display_hover = false;
	let b_transitioning = false;
	let b_grabbed = false;

	function listen_transition_cancel() {
		b_transitioning = false;
	}

	function listen_transition_end() {
		b_transitioning = false;
		dm_hover.style.display = 'none';
	}

	function listen_transition_run() {
		b_transitioning = true;
	}

	function enable_hover() {
		dm_hover.style.display = 'block';
		b_display_hover = true;
	}

	function disable_hover() {
		if(!b_grabbed) {
			b_display_hover = false;
		}
	}

	function grab_hover(this: HTMLDivElement, d_event: MouseEvent) {
		if(b_transitioning) {
			b_grabbed = true;
			enable_hover();
		}
	}

	function release_hover() {
		if(b_grabbed) {
			b_display_hover = false;
			b_grabbed = false;
		}
	}

	onMount(async() => {
		dm_hover.addEventListener('transitionrun', listen_transition_run);
		dm_hover.addEventListener('transitioncancel', listen_transition_cancel);
		dm_hover.addEventListener('transitionend', listen_transition_end);

		const k_connection = k_model.connection;
		if('MmsSparqlConnection' === k_connection.type) {
			const g_version = await (k_connection as unknown as MmsSparqlConnection).fetchCurrentVersion()
			s_display_version = g_version.label;
		}
	});
</script>


<style lang="less">
	@import '../../../common/ve.less';

	@hover-bg: fade(@ve-color-dark-background, 90%);
	@hover-height: 220px;
	@hover-width: 380px;

	.hover {
		z-index: 100;
		opacity: 0;
		position: absolute;
		margin-top: calc(-33px - @hover-height);
		transition: opacity 1.5s 0.5s ease-in;

		&.visible {
			opacity: 1;
			transition: none;
		}

		.container {
			width: @hover-width;
			height: @hover-height;
			overflow-y: scroll;
			background-color: @hover-bg;
			color: var(--ve-color-light-text);
			border-radius: 2px;
			padding: 8px;

			.heading {
				display: flex;
				font-size: 12px;
				font-weight: 500;

				.title {
					flex: 1;
				}

				.date {
					color: var(--ve-color-medium-light-text);
				}
			}

			hr {
				height: 0px;
				border: 1px solid var(--ve-color-medium-text);
				margin-left: -4px;
				width: calc(100% + 6px);
			}

			.content {
				.display {
					&:nth-child(n+1) {
						margin-top: 6px;
					}

					.attribute {
						font-size: 12px;
						font-weight: 500;
						color: var(--ve-color-medium-light-text);
					}

					.value {
						font-size: 14px;
						font-weight: 400;
					}
				}
			}
		}
			
		.arrow-down {
			width: 0; 
			height: 0; 
			border-left: 20px solid transparent;
			border-right: 20px solid transparent;

			border-top: 20px solid @hover-bg;
			transform-origin: 0 0;
			transform: scaleY(0.65);
		}
	}

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

<div class="hover" style="display:none;" class:visible={b_display_hover} on:mousemove={grab_hover} on:mouseout={release_hover} bind:this={dm_hover}>
	<div class="container">
		<div class="heading">
			<span class="title">
					{k_model.connection.label}
			</span>
			<span class="date">
					<Fa icon={faHistory} />
					{s_display_version}
			</span>
		</div>
		<hr>
		<div class="content">
			{#each ode(h_attributes) as [si_key, [s_attr, k_display]]}
					<div class="display">
						<div class="attribute" data-key={si_key}>
							{s_attr}
						</div>
						<div class="value">
							{#if 'text/html' === k_display.contentType}
								{@html k_display.toString()}
							{:else}
								{k_display.toString()}
							{/if}
						</div>
					</div>
			{/each}
		</div>
	</div>
	<div class="arrow-down"></div>
</div>

<a href={k_model.itemIri} class="transclusion" on:mouseenter={enable_hover} on:mouseleave={disable_hover} bind:this={dm_link}>
	<span>
		<Fa icon={faBolt} />
	</span>
	<span>
		{s_display || k_model.fallbackDisplayText}
	</span>
</a>
