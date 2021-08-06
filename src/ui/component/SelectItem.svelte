<script>
	export let isActive = false;
	export let isFirst = false;
	export let isHover = false;
	export let getOptionLabel;
	export let item;
	export let filterText = '';

	let itemClasses = '';

	$: {
		const classes = [];
		if(isActive) classes.push('active');
		if(isFirst) classes.push('first');
		if(isHover) classes.push('hover');
		if(item.isGroupHeader) classes.push('groupHeader');
		if(item.isGroupItem) classes.push('groupItem');
		itemClasses = classes.join(' ');
	}

	import Fa from 'svelte-fa';

	import {
		faCheck,
	} from '@fortawesome/free-solid-svg-icons';
</script>

<style lang="less">
	.item {
		cursor: default;
		height: var(--height, 42px);
		line-height: var(--height, 42px);
		padding: var(--itemPadding, 0 20px);
		color: var(--itemColor, inherit);
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}
	.groupHeader {
		text-transform: var(--groupTitleTextTransform, uppercase);
	}
	.groupItem {
		padding-left: var(--groupItemPaddingLeft, 40px);
	}
	.item:active {
		background: var(--itemActiveBackground, #b9daff);
	}
	.item.active {
		background: var(--itemIsActiveBG, #007aff);
		color: var(--itemIsActiveColor, #fff);
	}
	.item.first {
		border-radius: var(--itemFirstBorderRadius, 4px 4px 0 0);
	}
	.item.hover:not(.active) {
		background: var(--itemHoverBG, #e7f2ff);
	}

	.item {
		.state-indicator {
			display: inline-block;
			width: 12px;

			:global(svg) {
				transform: scale(0.7);
			}
		}
	}
</style>



<div class="item {itemClasses}">
	<span class="state-indicator">
		{#if isActive}
			<Fa icon={faCheck} size="xs" />
		{:else}
			<i class="fa-fw" />
		{/if}
	</span>
	{@html getOptionLabel(item, filterText)}
</div>