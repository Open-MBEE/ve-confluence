<script lang="ts">
	import DatasetsTable from '#/ui/component/DatasetsTable.svelte';

	import type {Context} from '#/model/Serializable';

	import {
		ConfluencePage,
		ConfluenceDocument,
		ConfluenceXhtmlDocument,
	} from '#/vendor/confluence/module/confluence';

	import type {
		DocumentMetadata,
		PageMetadata,
	} from '#/vendor/confluence/module/confluence';

	import {
		onMount,
	} from 'svelte';

	import G_META from '#/common/meta';

	import {
		lang,
		process,
	} from '#/common/static';

	import Fa from 'svelte-fa';

	import {
		faQuestionCircle,
		faExclamationTriangle,
		faTimes,
	} from '@fortawesome/free-solid-svg-icons';

	import {
		dm_main,
		dm_main_header,
		// dm_sidebar,
		qs,
	} from '#/util/dom';

	import {slide} from 'svelte/transition';

	import {
		Tabs,
		TabList,
		TabPanel,
		Tab,
	} from 'svelte-tabs';

	import type {JsonObject} from '#/common/types';

	import {
		oderaf,
	} from '#/util/belt';

	import XHTMLDocument, {xpathSelect1} from '#/vendor/confluence/module/xhtml-document';

	export let g_context: Context;

	export let s_app_version = process.env.VERSION;

	let dm_expanded: HTMLDivElement;

	let b_ready = false;
	let b_read_only = false;
	let b_read_only_page = false;

	let dm_bar: HTMLElement;
	let b_collapsed = true;
	let dm_icon_dropdown: HTMLDivElement;

	let sx_document_metadata_remote: string;
	$: sx_document_metadata_local = '';
	let g_document_metadata_editted: DocumentMetadata | Error;
	$: b_document_json_valid = g_document_metadata_editted && !(g_document_metadata_editted instanceof Error);
	$: b_document_json_writable = b_document_json_valid && JSON.stringify(g_document_metadata_editted) !== sx_document_metadata_remote;
	
	let sx_page_metadata_remote: string;
	$: sx_page_metadata_local = '';
	let g_page_metadata_editted: PageMetadata | Error;
	$: b_page_json_valid = g_page_metadata_editted && !(g_page_metadata_editted instanceof Error);
	$: b_page_json_writable = b_page_json_valid && JSON.stringify(g_page_metadata_editted) !== sx_page_metadata_remote;

	let sx_page_content_remote: string;
	$: sx_page_content_local = '';
	let sx_page_content_editted: string | Error;
	$: b_page_content_valid = sx_page_content_editted && !(sx_page_content_editted instanceof Error);
	$: b_page_content_writable = b_page_json_valid && (new ConfluenceXhtmlDocument(sx_page_content_editted as string)).toString() !== sx_page_content_remote;
	
	const dm_sidebar = qs(document.body, '.ia-fixed-sidebar') as HTMLDivElement;
	const dm_sidebar_scrollable = (qs(dm_sidebar, '.ia-scrollable-section') as HTMLDivElement);
	const n_pre_scrolltop = dm_sidebar.scrollTop || 0;

	let is_chrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
	let show_warning = !is_chrome;
	$: warning = show_warning;

	// if(dm_sidebar) {
	// 	dm_sidebar_scrollable = (qs(dm_sidebar, '.ia-scrollable-section') as HTMLDivElement);
	// 	n_pre_scrolltop = dm_sidebar.scrollTop || 0;
	// }
	
	$: {
		try {
			g_document_metadata_editted = JSON.parse(sx_document_metadata_local) as DocumentMetadata;
		}
		catch(e_parse) {
			g_document_metadata_editted = e_parse as Error;
		}

		try {
			g_page_metadata_editted = JSON.parse(sx_page_metadata_local) as PageMetadata;
		}
		catch(e_parse) {
			g_page_metadata_editted = e_parse as Error;
		}

		try {
			sx_page_content_editted = (new XHTMLDocument(sx_page_content_local)).toString().replace(/>\s*\n\s*</g, '><');
		}
		catch(e_parse) {
			sx_page_content_editted = e_parse as Error;
		}
	}


	const b_admin = location.hash.slice(1).split(/:/g).includes('admin');

	let k_page: ConfluencePage | null = null;
	let k_document: ConfluenceDocument | null = null;

	function realign_control_bar() {
		// if('' !== dm_main_header.style.position) {
		// 	dm_bar.style.marginTop = '0px';
		// 	// when the 'overlay-header' class is applied for the nav bar, adjust margins
		// 	if(dm_main_header.className.split(/\s+/g).includes('overlay-header')) {
		// 		dm_bar.style.marginTop = '-10px';
		// 	}
		// }
		// else {
		// 	dm_bar.style.marginTop = '-20px';
		// }


		// // when scrolling down the wiki header style changes, so update the control bar margin
		// if('' !== dm_sidebar.style.width) {
		// 	const g_rect = dm_bar.getBoundingClientRect();
		// 	console.dir(g_rect);

		// 	dm_sidebar.style.marginTop = `${g_rect.height || 38}px`;

		// 	dm_sidebar_scrollable.scrollTop = n_pre_scrolltop;

		// 	// debugger;

		// 	// if(dm_expanded) {
		// 	// 	dm_expanded.style.paddingLeft = `calc(${dm_sidebar.style.width} + 20px)`;
		// 	// }
		// }
	}

	onMount(async() => {
		b_ready = true;

		// go async to allow svelte components to bind to local variables
		await Promise.resolve();

		// user does not have write permisisons to this page
		if('READ_WRITE' !== G_META.access_mode) {
			b_read_only = true;
		}

		// initial control bar alignment
		queueMicrotask(realign_control_bar);

		// // wait for transition to complete and then realign again
		// setTimeout(realign_control_bar, 1500);

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

		// start observing 'sidebar' attribute changes
		d_observer.observe(dm_sidebar, {attributes:true});

		d_observer.observe(dm_main, {attributes:true});
		d_observer.observe(dm_main_header, {attributes:true});

		k_page = await ConfluencePage.fromCurrentPage();

		LOAD_DOCUMENT_METADATA:
		if(await k_page.isDocumentMember()) {
			k_document = await k_page.fetchDocument()!;

			if(!k_document) break LOAD_DOCUMENT_METADATA;

			const g_bundle = await k_document.fetchMetadataBundle();

			sx_document_metadata_local = JSON.stringify(g_bundle?.data, null, '  ');
			sx_document_metadata_remote = JSON.stringify(g_bundle?.data);

			// user does not have edit permissions to document
			b_read_only ||= !await k_document.fetchUserHasUpdatePermissions();  // eslint-disable-line @typescript-eslint/no-unsafe-call
		}

		LOAD_PAGE_METADATA: {
			if(!k_page) break LOAD_PAGE_METADATA;

			const g_bundle = await k_page.fetchMetadataBundle();

			sx_page_metadata_local = JSON.stringify(g_bundle?.data, null, '  ');
			sx_page_metadata_remote = JSON.stringify(g_bundle?.data);
		}

		LOAD_PAGE_CONTENT: {
			if(!k_page) break LOAD_PAGE_CONTENT;

			const g_bundle = await k_page.fetchContentAsXhtmlDocument();

			sx_page_content_local = g_bundle.document.prettyPrint();
			sx_page_content_remote = g_bundle.document.toString();
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

	async function create_document(h_paths: JsonObject) {
		if(k_page) {
			k_document = await ConfluenceDocument.createNew(k_page, h_paths);

			// reload
			location.reload();
		}
	}

	async function reset_document(h_paths: JsonObject) {
		if(k_page) {
			k_document = await ConfluenceDocument.createNew(k_page, h_paths, true);

			// reload
			location.reload();
		}
	}

	/**
	 * {a: {b: {c: 'yellow', d:'orange'}}} => ['a.b.c', 'a.b.d']
	 */

	async function reset_page(b_force=false): Promise<void> {
		if(k_page) {
			if(b_force) {
				const g_bundle = await k_page.fetchMetadataBundle();
				const n_version = g_bundle?.version.number || 0;

				await k_page.initMetadata(n_version+1);

				location.reload();
			}
			else {
				const g_bundle = await k_page.fetchMetadataBundle();
				const h_elements = g_bundle?.data.paths.elements;
				if(g_bundle && h_elements) {
					// disable button while it overwrites
					b_page_json_writable = false;

					// allow to update dom
					await Promise.resolve();

					const as_elements = new Set((function flatten_obj(h_in: Record<string, any>, c_levels: number, a_path: string[]=[]): string[] {
						return oderaf(h_in, (si_key, z_value) => {
							if(c_levels) {
								if('object' === typeof z_value) {
									return flatten_obj(z_value, c_levels-1, [...a_path, si_key]);
								}
								// cannot go deeper
								else {
									throw new Error(`Cannot go deeper inside nested object to flatten`);
								}
							}
							else {
								return [[...a_path, si_key].join('.')];
							}
						});
					})(h_elements, 2));

					const as_nodes = new Set(g_context.source_original.selectPageElements()
						.map(yn => xpathSelect1<Node>('ac:parameter[@ac:name="id"]', yn).firstChild!.nodeValue?.replace(/^page#elements\./, '')));

					// each element
					for(const sp_element of as_elements) {
						// element is not on page
						if(!as_nodes.has(sp_element)) {
							// delete from elements
							const a_dots = sp_element.split(/\./g);

							let z_node: Record<string, any> = h_elements;
							const nl_dots = a_dots.length;
							for(let i_dot=0; i_dot<nl_dots-1; i_dot++) {
								z_node = z_node[a_dots[i_dot]];
							}

							delete z_node[a_dots[nl_dots-1]];

							// no more keys
							for(let i_up=nl_dots-2; i_up>=0; i_up--) {
								if(!Object.keys(z_node).length) {
									let z_trav = h_elements;
									for(let i_dot=0; i_dot<i_up; i_dot++) {
										z_trav = z_trav[a_dots[i_dot]];
									}
									z_node = z_trav;
									continue;
								}
								else {
									break;
								}
							}
						}
					}

					await k_page.writeMetadataObject(g_bundle?.data, {
						number: (g_bundle?.version.number || 0)+1,
						message: 'Clear unused objects',
					});

					location.reload();
				}
			}
		}
	}

	const H_PATHS_CLIPPER = {
		connection: {
			sparql: {
				mms: {
					dng: {
						type: 'MmsSparqlConnection',
						label: 'DNG Requirements',
						alias: 'DNG',
						endpoint: 'https://ced-uat.jpl.nasa.gov/sparql',
						modelGraph: 'https://opencae.jpl.nasa.gov/mms/rdf/graph/Model.Europa.2021-08-25T23-31-04_375Z',
						metadataGraph: 'https://opencae.jpl.nasa.gov/mms/rdf/graph/Metadata.Europa',
						contextPath: 'hardcoded#queryContext.sparql.dng.common',
						searchPath: 'hardcoded#queryBuilder.sparql.dng.search.basic',
						detailPath: 'hardcoded#queryBuilder.sparql.dng.detail.basic',
					},
				},
			},
		},
	};

	const H_PATHS_MSR = {
		connection: {
			sparql: {
				mms: {
					dng: {
						type: 'MmsSparqlConnection',
						label: 'DNG Requirements',
						alias: 'DNG',
						endpoint: 'https://ced-uat.jpl.nasa.gov/sparql',
						modelGraph: 'https://opencae.jpl.nasa.gov/mms/rdf/graph/Model.Mars_Sample_Return.2022-01-11T08-31-50_971Z',
						metadataGraph: 'https://opencae.jpl.nasa.gov/mms/rdf/graph/Metadata.Mars_Sample_Return',
						contextPath: 'hardcoded#queryContext.sparql.dng.common',
						searchPath: 'hardcoded#queryBuilder.sparql.dng.search.basic',
						detailPath: 'hardcoded#queryBuilder.sparql.dng.detail.basic',
					},
				},
			},
		},
	};


	async function overwrite_document_json() {
		if(!b_document_json_writable || !k_document) return;

		// disable button while it overwrites
		b_document_json_writable = false;

		const g_bundle = await k_document.fetchMetadataBundle();
		const n_version = g_bundle?.version.number || 0;

		await k_document.writeMetadataObject(g_document_metadata_editted as DocumentMetadata, {
			number: n_version+1,
			message: 'Manual admin overwrite',
		});

		location.reload();
	}

	async function overwrite_page_json() {
		if(!b_page_json_writable || !k_page) return;

		// disable button while it overwrites
		b_page_json_writable = false;

		const g_bundle = await k_page.fetchMetadataBundle();
		const n_version = g_bundle?.version.number || 0;

		await k_page.writeMetadataObject(g_page_metadata_editted as PageMetadata, {
			number: n_version+1,
			message: 'Manual admin overwrite',
		});

		location.reload();
	}

	async function overwrite_page_content() {
		if(!b_page_content_writable || !k_page) return;

		// disable button while it overwrites
		b_page_content_writable = false;

		const g_bundle = await k_page.fetchContentAsXhtmlDocument();

		let k_contents = new XHTMLDocument(sx_page_content_editted as string);

		await k_page.postContent(k_contents, 'Manual admin overwrite');

		location.reload();
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

				.icon-readonly {
					background-color: var(--ve-color-light-text);
					color: var(--ve-color-dark-text);
					padding: 2px 8px;
					border-radius: 17px;
					font-size: 12px;
					line-height: 14px;
					margin-left: 8pt;
				}
			}
		}

		.expanded {
			border-top: 1px solid #8D8D8D;

			section {
				&>div {
					margin: 6pt 0;
				}

				&:nth-child(n+2) {
					margin-top: 12pt;
				}
			}

			h3 {
				color: var(--ve-color-light-text);
			}

			h4 {
				color: rgba(255, 255, 255, 0.7);
			}
		}
	}

	:global(.svelte-tabs) {
		padding: 0 20px 2px 20px;
	}

	:global(.svelte-tabs li.svelte-tabs__tab) {
		color: white;
		border-bottom-color: white;
		border-bottom-width: 0px;
	}

	:global(.svelte-tabs li.svelte-tabs__selected) {
		border-bottom-width: 3px;
	}

	.tab-body {
		padding: 6px;
	}

	.version {
		color: bisque;
		position: absolute;
		right: 4em;
		font-size: 13px;
		font-weight: 400;
	}

	.code-edit {
		width: 700px;
		height: 200px;
		font-size: small;
		background-color: rgba(255, 255, 255, 0.1);
		color: #ddd;
	}

	.ve-browser-warning {
		background-color: #FBF3E6;
		padding: 8px;
		margin-bottom: 20px;
		display: flex;
		align-items: center;

		p {
			margin: 0 0 0 8px;
			flex: 1 1 auto;
		}

		button {
			background: none;
			padding: 0;
			border: 0;
			margin: 0 8px 0 0;
		}
	}

</style>

{#if b_ready}
	<header class="ve-control-bar" bind:this={dm_bar} transition:slide={{}}>
		<div class="heading" on:click={toggle_collapse}>
			<div class="heading-center">
				<!-- ve icon -->
				{#if 'View Editor' === lang.basic.app_title}
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
				{/if}
				<span class="title">
					{lang.basic.app_title}
				</span>
				<!--
				{#if b_read_only}
					<span class="icon-readonly">
						Read-Only
					</span>
				{/if}
				-->
				<span class="icon-help">
					<!-- help icon -->
					<Fa icon={faQuestionCircle} size="2x"></Fa>
				</span>
				<span class="version">
					v{s_app_version}
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
			<div class="expanded" transition:slide={{}} bind:this={dm_expanded}>
				<Tabs>
					<TabList>
						{#if k_document}
							<Tab>Document Data Status</Tab>
						{/if}
						{#if b_admin}
							<Tab>Admin</Tab>
						{/if}
					</TabList>

					{#if k_document}
						<TabPanel>
							<div class="tab-body">
								<p>New updates are available every Friday at 10:00 PM</p>
								<DatasetsTable {g_context} {b_read_only}></DatasetsTable>
							</div>
						</TabPanel>
					{/if}

					{#if b_admin}
						<TabPanel>
							<div class="tab-body">
								<section>
									<h3>Document</h3>
									{#if k_document}
										<div>
											<h4>
												Edit document metadata:
											</h4>

											<p>
												<textarea bind:value={sx_document_metadata_local} class="code-edit" spellcheck="false" />
											</p>
											<button class="ve-button-primary" disabled={b_read_only || !b_document_json_writable} on:click={overwrite_document_json}>
												{#if b_document_json_writable}
													Overwrite JSON
												{:else if b_document_json_valid}
													JSON is unchanged
												{:else}
													Invalid JSON
												{/if}
											</button>
										</div>
									{/if}
									<div>
										<h4>
											{#if k_document}
												Reset document metadata to a preset: 
											{:else}
												Convert this page to become the document cover page of a new document:
											{/if}
										</h4>
										<button class="ve-button-primary" on:click={() => k_document? create_document(H_PATHS_CLIPPER): reset_document(H_PATHS_CLIPPER)}>Clipper preset</button>
										<button class="ve-button-primary" on:click={() => k_document? create_document(H_PATHS_MSR): reset_document(H_PATHS_MSR)}>MSR preset</button>
									</div>
								</section>
								<section>
									<h3>Page <a href="/pages/editpage.action?pageId={k_page?.pageId}">(edit page natively)</a></h3>
									<div>
										<h4>
											Edit page metadata:
										</h4>

										<p>
											<textarea bind:value={sx_page_metadata_local} class="code-edit" spellcheck="false" />
										</p>
										<button class="ve-button-primary" disabled={b_read_only_page || !b_page_json_writable} on:click={overwrite_page_json}>
											{#if b_page_json_writable}
												Overwrite JSON
											{:else if b_page_json_valid}
												JSON is unchanged
											{:else}
												Invalid JSON
											{/if}
										</button>
									</div>

									<div>
										<h4>Reset page metadata:</h4>
										<span>
											<button class="ve-button-primary" disabled={b_read_only_page} on:click={() => reset_page()}>Clear all unused objects</button>
											<button class="ve-button-primary" disabled={b_read_only_page} on:click={() => reset_page(true)}>Force reset metadata</button>
										</span>
									</div>

									<div>
										<h4>
											Edit page content:
										</h4>

										<p>
											<textarea bind:value={sx_page_content_local} class="code-edit" spellcheck="false" />
										</p>
										<button class="ve-button-primary" disabled={b_read_only_page || !b_page_content_writable} on:click={overwrite_page_content}>
											{#if b_page_content_writable}
												Overwrite Content
											{:else if b_page_content_valid}
												Content is unchanged
											{:else}
												Invalid Content
											{/if}
										</button>
									</div>
								</section>
							</div>
						</TabPanel>
					{/if}
				</Tabs>
			</div>
		{/if}
	</header>
	{#if warning}
		<div class="ve-browser-warning">
			<Fa icon={faExclamationTriangle} size="sm" primaryColor="#F29E20" /><p>{@html lang.basic.browser_warning || "Browser not supported" }</p>
			<button on:click={() => show_warning = false}>
				<Fa icon={faTimes} />
			</button>
		</div>
	{/if}
{/if}