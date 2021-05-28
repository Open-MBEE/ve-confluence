<script lang="ts">
    import Select from 'svelte-select';
    
    import G_META from '../common/meta';
    import {lang} from '../common/static';

    import Fa from 'svelte-fa';
    import {
        faCheckCircle,
        faCircleNotch,
    } from '@fortawesome/free-solid-svg-icons';
    
    export let G_CONTEXT: import('../common/ve4').Ve4ComponentContext;
	// const {
	// 	k_sparql,
	// } = G_CONTEXT;

    interface SelectOption {
        value: string;
        label: string;
        group: string;
    }

    interface Source {
        label: string;
        versions: SelectOption[];
        selected: SelectOption | null;
        select_version(dv: CustomEvent<SelectOption>): void;
        status_elmt: HTMLSpanElement | null;
    }

    const G_SOURCE_DNG: Source = {
        label: 'DNG Requirements',
        versions: [
            {
                value: '3/27/21',
                label: 'Mar 27, 2021',
                group: 'master',
            },
            {
                value: '3/28/21',
                label: 'Mar 28, 2021',
                group: 'master',
            },
        ] as SelectOption[],

        selected: null,

        select_version(dv_event: CustomEvent<SelectOption>) {
            G_SOURCE_DNG.selected = dv_event.detail;
        },

        status_elmt: null,
    };

    const G_SOURCE_HELIX: Source = {
        label: 'Helix Commands',
        versions: [
            {
                value: '3/27/21',
                label: 'Mar 27, 2021',
                group: 'master',
            },
            {
                value: '3/28/21',
                label: 'Mar 28, 2021',
                group: 'master',
            },
        ] as SelectOption[],

        selected: null,

        select_version(dv_event: CustomEvent<SelectOption>) {
            G_SOURCE_DNG.selected = dv_event.detail;
        },

        status_elmt: null,
    };

    const A_SOURCES: Source[] = [
        G_SOURCE_DNG,
        G_SOURCE_HELIX,
    ];
</script>

<style lang="less">
    table {
        text-align: left;
        margin: 1em 0;
        border-spacing: 3pt;
        
        thead {
            line-height: 10px;

            tr {
                th {
                    font-weight: 400;
                    font-size: 9pt;
                    color: var(--ve-color-medium-light-text);
                    min-width: 14em;
                    padding-bottom: 2pt;
                }
            }
        }

        tbody {
            tr {
                // border-top: 1px solid var(--ve-color-medium-light-text);

                &.hr {
                    padding: 0;
                    margin: 0;

                    hr {
                        margin: 0;
                        color: var(--ve-color-medium-light-text);
                    }
                }

                &.data {
                    td {
                        &:nth-child(n-1) {
                            padding-right: 14pt;
                        }

                        --padding: 0;
                        // --inputPadding: 0;
                        --height: 20px;
                        --itemColor: var(--ve-color-dark-text);
                        --itemHoverBG: var(--ve-color-medium-light-text);

                        // --itemActiveBackground: var(--ve-color-light-text);
                        --itemIsActiveColor:  var(--ve-color-dark-text);
                        --itemIsActiveBG:  var(--ve-color-light-text);
                        --itemPadding: 2px 20px;

                        :global(.selectContainer) {
                            color: var(--ve-color-dark-text);
                        }

                        :global(.selectContainer .listContainer) {
                            margin-left: -1px;
                            margin-top: -5px;
                        }

                        // :global(.selectContainer div .active:before) {
                        //     display: inline-block;
                        //     text-rendering: auto;
                        //     -webkit-font-smoothing: antialiased;
                        //     font-family: "Font Awesome 5 Free";
                        //     content: "\f00c";
                        //     position: absolute;
                        //     left: 6px;
                        // }

                        span.status {
                            background-color: var(--ve-color-dark-text);
                            color: var(--ve-color-light-text);
                            font-size: 10px;
                            text-transform: uppercase;
                            font-weight: 500;
                            letter-spacing: 0.05em;
                            padding: 4pt 8pt;
                            border-radius: 2pt;

                            .text {
                                padding-left: 4pt;
                            }
                        }
                    }
                }
            }
        }
    }
</style>

<div>
    <table>
        <thead>
            <tr>
                <th>Data Type</th>
                <th>Version</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            {#each A_SOURCES as g_source}
                <tr class="hr">
                    <td colspan="3">
                        <hr>
                    </td>
                </tr>
                <tr class="data">
                    <td>{g_source.label}</td>
                    <td>
                        <Select
                            items={g_source.versions}
                            isClearable={false}
                            placeholder="Loading..."
                        ></Select>
                    </td>
                    <td>
                        <span class="status" bind:this={g_source.status_elmt}>
                            <i class="fas fa-circle-notch fa-spin"></i>
                            <span class="text">
                                Connecting...
                            </span>
                        </span>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>