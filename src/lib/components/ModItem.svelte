<script lang="ts">
	import type { Mod, ModID, ModVersion, SimpleMod, SimpleModVersion } from '$lib/api/models';
	import { onMount } from 'svelte';
	import { IndexService } from '$lib/api/index-service';
	import placeholderLogo from '$lib/assets/logoPlaceholder.png';
	import TagRow from './TagRow.svelte';
	import ModIcon from './ModIcon.svelte';
	import DeveloperLine from './DeveloperLine.svelte';

	export let modId: ModID;
	export let version = 'latest';

	/// If the mode is to be displayed with context, hide properties that are going to known anyways
	export let slim = false;
	const height = slim ? 'min-h-18' : 'min-h-24';

	const index = IndexService.getContext();

	let mod: Mod | SimpleMod | null = null;
	let versionObj: ModVersion | SimpleModVersion | null = null;
	const baseUrl = `/mods/${modId}`;
	const url = version == 'latest' ? baseUrl : `${baseUrl}?version=${version}`;

	onMount(async () => {
		mod = await index.mods.get(modId, true);

		if (version == 'latest') {
			versionObj = await mod.versions.latest();
		} else {
			versionObj = await mod.versions.get(version);
		}
	});
</script>

<div class={`${height} flex flex-row p-2 gap-2 items-center border-b`}>
	{#if mod && versionObj}
		{#if !slim}
			<ModIcon modId={mod.id} class="h-16" />
		{/if}

		<div class="flex flex-col">
			<a class="link" href={url}>
				{#if mod.featured}⭐️{/if}
				{versionObj.name} v{versionObj.version}
			</a>

			{#if !slim}
				<DeveloperLine developers={mod.developers.list()} />
				{#if 'description' in versionObj && versionObj.description}
					<i>{versionObj.description}</i>
				{/if}
				{#if 'tags' in mod && mod.tags.length}
					<TagRow tags={mod.tags} />
				{/if}
				<p class="muted">{mod.id}</p>
			{/if}
		</div>
	{:else}
		<img src={placeholderLogo} alt="default mod icon" class="mod-icon" />
		<div>
			<p>Loading mod cell...</p>
		</div>
	{/if}
</div>

<style lang="postcss" scoped>
	.mod-icon {
		@apply h-16 w-auto aspect-square;
	}
</style>
