<script lang="ts">
	import { onMount } from 'svelte';
	import Fa from 'svelte-fa';
	import { faDownload } from '@fortawesome/free-solid-svg-icons';

	import type { Mod, ModID, ModVersion, SimpleMod, SimpleModVersion } from '$lib/api/models';
	import { IndexService } from '$lib/api/index-service';
	import placeholderLogo from '$lib/assets/logoPlaceholder.png';
	import { fromBase } from '$lib/utils';

	import TagRow from './TagRow.svelte';
	import ModIcon from './ModIcon.svelte';
	import DeveloperLine from './DeveloperLine.svelte';

	export let modId: ModID;
	export let version = 'latest';
	export let showDownloadCount = true;

	/// If the mode is to be displayed with context, hide properties that are going to known anyways
	export let slim = false;
	const height = slim ? 'min-h-18' : 'min-h-24';

	const index = IndexService.getContext();

	let mod: Mod | SimpleMod | null = null;
	let versionObj: ModVersion | SimpleModVersion | null = null;
	const baseUrl = fromBase(`/mods/${modId}`);
	const url = version == 'latest' ? baseUrl : `${baseUrl}?version=${version}`;
	let downloadCount = 0;
	$: {
		if (mod && versionObj) {
			downloadCount = version == 'latest' ? mod.downloadCount : versionObj.downloadCount;
		}
	}

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
			<div class="flex gap-1">
				<a class="link" href={url}>
					{#if mod.featured}⭐️{/if}
					{versionObj.name} v{versionObj.version}
				</a>
				{#if !slim}
					{#if 'tags' in mod && mod.tags.length}
						<TagRow tags={mod.tags} />
					{/if}
				{/if}
			</div>

			{#if slim && showDownloadCount}
				<div>
					<Fa icon={faDownload} class="inline mr-1" />
					{downloadCount}
					download{downloadCount == 1 ? '' : 's'}
				</div>
			{/if}

			{#if !slim}
				<DeveloperLine developers={mod.developers.list()} />
				{#if 'description' in versionObj && versionObj.description}
					<i>{versionObj.description}</i>
				{/if}
				{#if showDownloadCount}
					<div>
						<Fa icon={faDownload} class="inline mr-1" />
						{downloadCount}
						download{downloadCount == 1 ? '' : 's'}
					</div>
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
