<script lang="ts">
    import { getContext, onMount } from 'svelte';
    import G_META from '../common/meta';

    import {
        qs,
        dm_main,
    } from '../util/dom';

    import {
        slide,
    } from 'svelte/transition';

    export let G_CONTEXT: import('../common/ve4').Ve4ComponentContext;
	const {
		k_sparql,
	} = G_CONTEXT;


	// import { Tabs, TabList, TabPanel, Tab } from 'svelte-tabs';

    let b_ready = false;
    let b_read_only = false;
    let dm_bar: HTMLDivElement;
    let b_collapsed = true;

    onMount(() => {
        b_ready = true;

        // user does not have write permisisons
        if('READ_WRITE' !== G_META.access_mode) {
            b_read_only = true;
        }

        queueMicrotask(() => {
            dm_bar.style.marginLeft = dm_main.style.marginLeft || '';
        });
    });

    function toggle_collapse() {
        if(b_collapsed) {
            b_collapsed = !b_collapsed;
        }
    }
</script>

<style lang="less">
    .ve4-control-bar {
        background-color: #404040;
        font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        color: #ffffff;

        .heading {
            line-height: 19px;
            display: inline-flex;
            align-items: center;
            min-height: 38px;
            margin-left: 20px;
            
            .title {
                font-weight: bold;
                font-size: 16px;
            }
        }

        .expanded {

        }
    }

    .hidden {
        display: none;
    }
</style>

{#if b_ready}
    <div class="ve4-control-bar" bind:this={dm_bar} transition:slide={{}} on:click={toggle_collapse}>
        <div class="heading">
            <span class="title">
                {lang.basic.app_title}
            </span>
            {#if b_read_only}
                <span>
                    read-only
                </span>
            {/if}
            <span>
            </span>
        </div>
        {#if !b_collapsed}
            <div class="expanded" transition:slide={{}}>
                Hello
                <!-- <Tabs>
                    <TabList>
                        <Tab>Status</Tab>
                    </TabList>
                </Tabs>

                <TabPanel>
                    <p>New updates are available every Friday at 10:00 PM</p>
                    <span>
                        Table placeholder
                    </span>
                </TabPanel> -->
            </div>
        {/if}
    </div>
{/if}