<script lang="ts">
	import DatasetsTable from '#/ui/component/DatasetsTable.svelte';


	import {
		ConfluencePage,
		ConfluenceDocument,
	} from '#/vendor/confluence/module/confluence';

	import {
		getContext,
		onMount,
} from 'svelte';

	import G_META from '#/common/meta';

	import {lang} from '#/common/static';

	import Fa from 'svelte-fa';

	import {faQuestionCircle} from '@fortawesome/free-solid-svg-icons';

	import {
		qs,
		dm_main,
	} from '#/util/dom';

	import {slide} from 'svelte/transition';

	import {
		Tabs,
		TabList,
		TabPanel,
		Tab,
} from 'svelte-tabs';

	let b_ready = false;
	let b_read_only = false;
	let dm_bar: HTMLDivElement;
	let b_collapsed = true;
	let dm_icon_dropdown: HTMLDivElement;
	let b_document = false;

	let k_page: ConfluencePage | null = null;
	let k_document: ConfluenceDocument | null = null;

	let main_header = dm_main.children.namedItem('main-header') as HTMLDivElement;


	function realign_control_bar() {
        // when scrolling down the wiki header style changes, so update the control bar margin
        if(main_header.style.position != '') {
            dm_bar.style.marginTop = '0px';
            // when the 'overlay-header' class is applied for the nav bar, adjust margins
            if(main_header.className == 'overlay-header') {
                dm_bar.style.marginTop = '-10px';
            }
        }
        else {
            dm_bar.style.marginTop = '-20px';
        }
    }

	onMount(async() => {
		b_ready = true;

		// user does not have write permisisons
		if('READ_WRITE' !== G_META.access_mode) {
			b_read_only = true;
		}

		// initial control bar alignment
		queueMicrotask(realign_control_bar);

		// create new observer
		const d_observer = new MutationObserver((a_mutations) => {
			// each mutation in list
			for(const d_mutation of a_mutations) {
				// style attribute change; realign control bar
				if('attributes' === d_mutation.type && 'style' === d_mutation.attributeName) {
					realign_control_bar();
				}
			}
		});

		// start observing 'main' attribute changes
		d_observer.observe(dm_main, {attributes:true});

		 // start observing 'main-header' attribute changes
		 d_observer.observe(main_header, {attributes: true})

		k_page = await ConfluencePage.fromCurrentPage();

		if(await k_page.isDocumentMember()) {
			k_document = await k_page.getDocument();
		}
	});

	function toggle_collapse() {
		b_collapsed = !b_collapsed;
		if(b_collapsed) {
			dm_icon_dropdown.classList.add('rotate-expand');
			dm_icon_dropdown.classList.remove('rotate-collapse');
		}
		else {
			dm_icon_dropdown.classList.add('rotate-collapse');
			dm_icon_dropdown.classList.remove('rotate-expand');
		}
	}

	async function create_document() {
		if(k_page) {
			k_document = await ConfluenceDocument.createNew(k_page);
		}
	}

	async function reset_document() {
		if(k_page) {
			k_document = await ConfluenceDocument.createNew(k_page, true);
		}
	}
</script>

<style lang="less">
	@import '/src/common/ve.less';

	.animated {
		animation-duration: 0.4s;
	}

	:global(.rotate-expand) {
		animation-name: rotate-expand;
		#a.keyframes(
			rotate-expand; {
				from {
					#a._transform-origin(center);
					#a._transform(rotate(0deg));
				}
				to {
					#a._transform-origin(center);
					#a._transform(rotate(-180deg));
				}
			}
		);
	}

	:global(.rotate-collapse) {
		animation-name: rotate-collapse;
		animation-duration: 0.5s;
		#a.keyframes(
			rotate-collapse; {
				from {
					#a._transform-origin(center);
					#a._transform(rotate(-180deg));
				}
				to {
					#a._transform-origin(center);
					#a._transform(rotate(0deg));
				}
			}
		);
	}

	.ve-control-bar {
		background-color: var(--ve-color-dark-background);
		color: var(--ve-color-light-text);
		// margins to offset wiki 'main' content padding
		margin-left: -40px;
        margin-right: -40px;
        margin-top: -20px;
        margin-bottom: 20px;
		
		.heading {
			position: relative;
			cursor: pointer;

			.heading-center {
				line-height: 19px;
				display: inline-flex;
				align-items: center;
				min-height: 38px;
				margin-left: 20px;
				
				.title {
					font-weight: 500;
					font-size: 12pt;
				}

				.icon-help {
					transform: scale(0.5);
					margin-left: 0.5em;
				}

				.icon-dropdown {
					position: absolute;
					right: 1em;
				}
			}
		}

		.expanded {
			border-top: 1px solid #8D8D8D;
		}
	}

	.hidden {
		display: none;
	}

	:global(.svelte-tabs) {
		padding: 0 20px 12px 20px;
	}

	:global(.svelte-tabs li.svelte-tabs__tab) {
		color: white;
		border-bottom-color: white;
	}

	.tab-body {
		padding: 6px;
	}
</style>

{#if b_ready}
	<div class="ve-control-bar" bind:this={dm_bar} transition:slide={{}}>
		<div class="heading" on:click={toggle_collapse}>
			<div class="heading-center">
				<!-- ve icon -->
				<span class="icon-ve">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right:0.5em;">
						<path fill-rule="evenodd" clip-rule="evenodd" d="M5.52841 10.2178C5.71048 10.2178 5.87334 10.1031 5.93679 9.93022L7.20029 6.48755C7.28415 6.25907 7.16929 6.00499 6.94375 5.92004C6.7182 5.8351 6.46739 5.95145 6.38354 6.17993L5.52841 8.50989L4.67329 6.17993C4.58943 5.95145 4.33862 5.8351 4.11308 5.92004C3.88754 6.00499 3.77268 6.25907 3.85653 6.48755L5.12003 9.93022C5.18348 10.1031 5.34635 10.2178 5.52841 10.2178Z" fill="#B5B5B5"/>
						<path fill-rule="evenodd" clip-rule="evenodd" d="M11.9648 6.33298C11.9648 6.08921 11.7663 5.8916 11.5214 5.8916H9.21562C8.97072 5.8916 8.7722 6.08921 8.7722 6.33298V9.77574C8.7722 10.0195 8.97072 10.2171 9.21562 10.2171H11.5214C11.7663 10.2171 11.9648 10.0195 11.9648 9.77574C11.9648 9.53197 11.7663 9.33436 11.5214 9.33436H9.65904V6.77436H11.5214C11.7663 6.77436 11.9648 6.57675 11.9648 6.33298Z" fill="#B5B5B5"/>
						<path fill-rule="evenodd" clip-rule="evenodd" d="M8.875 8.00349C8.875 7.74753 9.07663 7.54004 9.32536 7.54004H11.4113C11.66 7.54004 11.8617 7.74753 11.8617 8.00349C11.8617 8.25945 11.66 8.46694 11.4113 8.46694H9.32536C9.07663 8.46694 8.875 8.25945 8.875 8.00349Z" fill="#B5B5B5"/>
						<path fill-rule="evenodd" clip-rule="evenodd" d="M7.3867 1.01273C7.42256 1.25183 7.25714 1.47462 7.01723 1.51036C3.84485 1.98289 1.41163 4.71054 1.41163 8.0038C1.41163 11.2948 3.84157 14.021 7.01083 14.4963C7.2507 14.5323 7.41589 14.7552 7.3798 14.9943C7.34371 15.2333 7.12 15.398 6.88012 15.362C3.28747 14.8233 0.533203 11.7345 0.533203 8.0038C0.533203 4.27061 3.29118 1.18017 6.88739 0.644516C7.12729 0.608782 7.35084 0.773638 7.3867 1.01273ZM8.61487 1.01289C8.65079 0.773804 8.87438 0.609006 9.11428 0.644803C12.7095 1.18128 15.4665 4.27127 15.4665 8.0038C15.4665 11.7347 12.712 14.8235 9.11913 15.3621C8.87925 15.398 8.65555 15.2334 8.61947 14.9943C8.5834 14.7553 8.74861 14.5323 8.98848 14.4964C12.1579 14.0213 14.5881 11.295 14.5881 8.0038C14.5881 4.71113 12.1558 1.98386 8.98421 1.51061C8.74431 1.47481 8.57895 1.25198 8.61487 1.01289Z" fill="#B5B5B5"/>
						<mask id="mask0" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
							<path fill-rule="evenodd" clip-rule="evenodd" d="M5.52841 10.2178C5.71048 10.2178 5.87334 10.1031 5.93679 9.93022L7.20029 6.48755C7.28415 6.25907 7.16929 6.00499 6.94375 5.92004C6.7182 5.8351 6.46739 5.95145 6.38354 6.17993L5.52841 8.50989L4.67329 6.17993C4.58943 5.95145 4.33862 5.8351 4.11308 5.92004C3.88754 6.00499 3.77268 6.25907 3.85653 6.48755L5.12003 9.93022C5.18348 10.1031 5.34635 10.2178 5.52841 10.2178Z" fill="#B5B5B5"/>
							<path fill-rule="evenodd" clip-rule="evenodd" d="M11.9648 6.33298C11.9648 6.08921 11.7663 5.8916 11.5214 5.8916H9.21562C8.97072 5.8916 8.7722 6.08921 8.7722 6.33298V9.77574C8.7722 10.0195 8.97072 10.2171 9.21562 10.2171H11.5214C11.7663 10.2171 11.9648 10.0195 11.9648 9.77574C11.9648 9.53197 11.7663 9.33436 11.5214 9.33436H9.65904V6.77436H11.5214C11.7663 6.77436 11.9648 6.57675 11.9648 6.33298Z" fill="#B5B5B5"/>
							<path fill-rule="evenodd" clip-rule="evenodd" d="M8.875 8.00349C8.875 7.74753 9.07663 7.54004 9.32536 7.54004H11.4113C11.66 7.54004 11.8617 7.74753 11.8617 8.00349C11.8617 8.25945 11.66 8.46694 11.4113 8.46694H9.32536C9.07663 8.46694 8.875 8.25945 8.875 8.00349Z" fill="#B5B5B5"/>
							<path fill-rule="evenodd" clip-rule="evenodd" d="M7.3867 1.01273C7.42256 1.25183 7.25714 1.47462 7.01723 1.51036C3.84485 1.98289 1.41163 4.71054 1.41163 8.0038C1.41163 11.2948 3.84157 14.021 7.01083 14.4963C7.2507 14.5323 7.41589 14.7552 7.3798 14.9943C7.34371 15.2333 7.12 15.398 6.88012 15.362C3.28747 14.8233 0.533203 11.7345 0.533203 8.0038C0.533203 4.27061 3.29118 1.18017 6.88739 0.644516C7.12729 0.608782 7.35084 0.773638 7.3867 1.01273ZM8.61487 1.01289C8.65079 0.773804 8.87438 0.609006 9.11428 0.644803C12.7095 1.18128 15.4665 4.27127 15.4665 8.0038C15.4665 11.7347 12.712 14.8235 9.11913 15.3621C8.87925 15.398 8.65555 15.2334 8.61947 14.9943C8.5834 14.7553 8.74861 14.5323 8.98848 14.4964C12.1579 14.0213 14.5881 11.295 14.5881 8.0038C14.5881 4.71113 12.1558 1.98386 8.98421 1.51061C8.74431 1.47481 8.57895 1.25198 8.61487 1.01289Z" fill="#B5B5B5"/>
						</mask>
						<g mask="url(#mask0)">
							<g style="mix-blend-mode:lighten">
								<rect width="16" height="16" fill="#969696"/>
							</g>
							<g style="mix-blend-mode:overlay">
								<rect width="16" height="16" fill="#FF9900"/>
							</g>
						</g>
					</svg>
				</span>
				<span class="title">
					{lang.basic.app_title}
				</span>
				{#if b_read_only}
					<span class="icon-readonly">
						Read-Only
					</span>
				{/if}
				<span class="icon-help">
					<!-- help icon -->
					<Fa icon={faQuestionCircle} size="2x"></Fa>
				</span>
				<span class="icon-dropdown animated rotate-expand" bind:this={dm_icon_dropdown}>
					<!-- drop-down -->
					<svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M7.41 9.09L12 13.67L16.59 9.09L18 10.5L12 16.5L6 10.5L7.41 9.09Z" fill="white"/>
					</svg>                        
				</span>
			</div>
		</div>
		{#if !b_collapsed}
			<div class="expanded" transition:slide={{}}>
				<Tabs>
					{#if k_document}
						<TabList>
							<Tab>Status</Tab>
						</TabList>

						<TabPanel>
							<div class="tab-body">
								<p>New updates are available every Friday at 10:00 PM</p>
								<button on:click={reset_document}>Reset this document's metadata</button>
								<DatasetsTable></DatasetsTable>
							</div>
						</TabPanel>
					{:else}
						<button on:click={create_document}>Convert this page to become the document cover page of a new document</button>
					{/if}
				</Tabs>
			</div>
		{/if}
	</div>
{/if}