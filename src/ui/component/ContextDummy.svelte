<script lang="ts">
	import {
		createEventDispatcher,
		getContext,
		onMount,
	} from "svelte";

	const g_context = getContext('simple-modal');

	const f_dispatch = createEventDispatcher();

	onMount(() => {
		f_dispatch('acquire', g_context);
	});
</script>
