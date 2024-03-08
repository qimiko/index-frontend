<script lang="ts">
	import { IndexService } from '$lib/api/index-service';
	import type { ModID } from '$lib/api/models';
	import placeholderLogo from '$lib/assets/logoPlaceholder.png';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';

	export let modId: ModID;

	const index = IndexService.getContext();
	let logoData: string | null = null;

	onMount(async () => {
		const mod = await index.mods.get(modId, true);
		const data = await mod.getLogoData();
		logoData = URL.createObjectURL(data);
	});
</script>

<object data={logoData} type="image/png" title="mod icon" class={cn('mod-icon', $$props.class)}>
	<img src={placeholderLogo} alt="default mod icon" class={cn('mod-icon', $$props.class)} />
</object>

<style lang="postcss" scoped>
	.mod-icon {
		@apply w-auto;
	}
</style>
