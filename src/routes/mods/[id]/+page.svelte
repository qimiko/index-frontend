<script lang="ts">
	import { onMount } from 'svelte';
	import SvelteMarkdown from 'svelte-markdown';
	import { page } from '$app/stores';

	import Fa from 'svelte-fa';
	import { faAndroid, faWindows, faApple } from '@fortawesome/free-brands-svg-icons';
	import { faCodeBranch, faDownload, faStar, faSpinner } from '@fortawesome/free-solid-svg-icons';

	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';

	import { IndexService } from '$lib/api/index-service';
	import type { Mod, ModVersion } from '$lib/api/models';
	import ModItem from '$lib/components/ModItem.svelte';
	import ModIcon from '$lib/components/ModIcon.svelte';
	import DeveloperLine from '$lib/components/DeveloperLine.svelte';
	import TagRow from '$lib/components/TagRow.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	const index = IndexService.getContext();

	let modId = $page.params.id;
	let modVersion = $page.url.searchParams.get('version') ?? 'latest';

	let mod: Mod | null = null;
	let version: ModVersion | null = null;

	// let otherMods: string[] = [];
	let otherVersions: string[] = [];

	let performingAction = false;

	// let performingDownloadAction = false;
	let performingFeatureAction = false;
	let performingAcceptAction = false;
	let performingRejectAction = false;

	let actionError = '';
	let loadModError = '';

	async function performFeature() {
		if (!mod) {
			return;
		}

		actionError = '';
		performingAction = true;
		performingFeatureAction = true;

		try {
			await mod.setFeatured(!mod.featured);
			mod = mod;
		} catch (e) {
			if (e instanceof Error) {
				actionError = e.message;
			} else {
				actionError = 'unknown';
			}
		}

		performingAction = false;
		performingFeatureAction = false;
	}

	async function performValidation(validated: boolean) {
		if (!version) {
			return;
		}

		actionError = '';
		performingAction = true;
		if (validated) {
			performingAcceptAction = true;
		} else {
			performingRejectAction = true;
		}

		try {
			await version.setValidated(validated);
			version = version;
		} catch (e) {
			if (e instanceof Error) {
				actionError = e.message;
			} else {
				actionError = 'unknown';
			}
		}

		performingAction = false;
		performingAcceptAction = false;
		performingRejectAction = false;
	}

	/*
	async function updateDeveloperMods() {
		if (!mod || otherMods.length != 0) {
			return;
		}

		const otherModData = await index.mods.search({
			developer: mod.developers.owner.username
		});
		otherMods = otherModData.data.flatMap((m) => (m.id == modId ? [] : [m.id]));
	}
	*/

	/*
	async function triggerInvalidModDownload() {
		if (!mod || !version) {
			return;
		}

		performingDownloadAction = true;

		try {
			const data = await version.getDownloadData();
			const url = URL.createObjectURL(data);

			// so unsvelte-like
			const downloadLink = document.createElement('a');
			downloadLink.style.display = 'none';
			downloadLink.href = url;
			downloadLink.download = `${mod.id}.geode`;

			downloadLink.click();

			URL.revokeObjectURL(url);
		} catch (e) {
			if (e instanceof Error) {
				actionError = e.message;
			} else {
				actionError = 'unknown download error';
			}
		}

		performingDownloadAction = false;
	}
	*/

	async function updateVersion() {
		if (mod == null) {
			return;
		}

		if (modVersion == 'latest') {
			const versionPreFetch = await mod.versions.latest();
			version = versionPreFetch;

			await versionPreFetch.fetch();
			version = versionPreFetch;
		} else {
			const versionPreFetch = await mod.versions.get(modVersion);
			version = versionPreFetch;

			await versionPreFetch.fetch();
			version = versionPreFetch;
		}

		otherVersions = mod.versions
			.list()
			.flatMap((v) => (v.version == version?.version ? [] : [v.version]));
	}

	async function loadMod() {
		if (mod != null) {
			await updateVersion();
			return;
		}

		try {
			const modPreFetch = await index.mods.get(modId);
			mod = modPreFetch;

			await modPreFetch.fetch();
			mod = modPreFetch;
		} catch (e) {
			if (e instanceof Error) {
				loadModError = e.message;
			} else {
				loadModError = 'unknown mod loading failure';
			}
		}

		try {
			await updateVersion();
		} catch (e) {
			if (e instanceof Error) {
				loadModError = e.message;
			} else {
				loadModError = 'unknown version loading failure';
			}
		}
	}

	onMount(() => {
		return page.subscribe((p) => {
			if (p.params.id != modId) {
				mod = null;
				// otherMods = [];
				otherVersions = [];
				modId = $page.params.id;
			}

			const newVersion = p.url.searchParams.get('version') ?? 'latest';
			if (newVersion != modVersion) {
				version = null;
				modVersion = $page.url.searchParams.get('version') ?? 'latest';
			}

			loadMod();
		});
	});
</script>

<div class="container mx-auto">
	{#if mod && version}
		<div class="flex flex-row gap-4 flex-wrap items-center">
			<ModIcon modId={mod.id} class="h-32 lg:h-28 mx-auto md:mx-0" />
			<div class="flex flex-col gap-2 text-center sm:text-left">
				<div class="flex flex-col">
					<h1 class="header mb-0">
						{#if mod.featured}⭐️{/if}
						{version.name} v{version.version}
					</h1>
					<DeveloperLine developers={mod.developers.list()} class="text-2xl md:text-md" />
					<i>{version.description}</i>
					<TagRow tags={mod.tags} class="py-1" />
				</div>

				<div class="flex flex-row gap-1 flex-wrap">
					<Button href={version.downloadLink}>
						<Fa icon={faDownload} class="inline pr-1" />
						Download
					</Button>
					<Button variant="secondary" disabled={performingAction} on:click={performFeature}>
						{#if performingFeatureAction}
							<Fa icon={faSpinner} class="mr-1 inline" spin />
						{:else}
							<Fa icon={faStar} class="mr-1 inline" />
						{/if}
						{#if mod.featured}
							Unfeature
						{:else}
							Feature
						{/if}
					</Button>
					{#if !version.validated}
						<Button
							variant="outline"
							disabled={performingAction}
							on:click={() => performValidation(true)}
						>
							{#if performingAcceptAction}
								<Fa icon={faSpinner} class="mr-1 inline" spin />
							{/if}
							Accept
						</Button>
					{/if}
					{#if version.validated || version.validated == undefined}
						<Button
							variant="outline"
							disabled={performingAction}
							on:click={() => performValidation(false)}
						>
							{#if performingRejectAction}
								<Fa icon={faSpinner} class="mr-1 inline" spin />
							{/if}
							Reject
						</Button>
					{/if}
				</div>
				{#if actionError}
					<div>
						<small>Error: {actionError}</small>
					</div>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap my-4 gap-2">
			<Tabs.Root value="about" class="max-w-prose">
				<Tabs.List>
					<Tabs.Trigger value="about">About</Tabs.Trigger>
					<Tabs.Trigger value="changelog">Changelog</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="about">
					{#if mod.about}
						<SvelteMarkdown source={mod.about} />
					{:else}
						<i>No about provided.</i>
					{/if}
				</Tabs.Content>
				<Tabs.Content value="changelog">
					{#if mod.changelog}
						<SvelteMarkdown source={mod.changelog} />
					{:else}
						<i>No changelog provided.</i>
					{/if}
				</Tabs.Content>
			</Tabs.Root>

			<div class="flex flex-col gap-2 self-start md:ml-auto">
				<h3>Additional Information</h3>

				<p>
					Created {mod.createdAt.toLocaleDateString(undefined, {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})} <br />
					Last updated {mod.updatedAt.toLocaleDateString(undefined, {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}
				</p>

				<div>
					{version.downloadCount}/{mod.downloadCount} downloads
				</div>

				{#if mod.repository}
					<div>
						<Fa icon={faCodeBranch} class="inline pr-1" />
						<a href={mod.repository.toString()}>{mod.repository.hostname}</a>
					</div>
				{/if}

				<div>
					{#if version.api}
						<Badge variant="secondary">API</Badge>
					{/if}
					{#if version.earlyLoad}
						<Badge variant="secondary">Early load</Badge>
					{/if}
				</div>

				<a href={`/?query=${encodeURIComponent(`developer:${mod.developers.owner.username}`)}`}>
					Other mods by this developer
				</a>

				<h3>Platform Support</h3>

				<div>Geode v{version.geode}</div>
				<div>
					{#if version.gd.win}<div>
							<Fa icon={faWindows} class="inline-block pr-1" fw /> Windows: {version.gd.win}
						</div>{/if}
					{#if version.gd.mac}<div>
							<Fa icon={faApple} class="inline-block pr-1" fw /> macOS: {version.gd.mac}
						</div>{/if}
					{#if version.gd.android64}<div>
							<Fa icon={faAndroid} class="inline-block pr-1" fw /> Android: {version.gd.android64}
						</div>{/if}
					{#if version.gd.android32}<div>
							<Fa icon={faAndroid} class="inline-block pr-1" fw /> Android (32-bit): {version.gd
								.android32}
						</div>{/if}
					{#if version.gd.ios}<div>
							<Fa icon={faApple} class="inline-block pr-1" fw /> iOS: {version.gd.ios}
						</div>{/if}
				</div>

				{#if version.dependencies}
					<div>
						{#if version.dependencies.length > 0}
							<h4>Dependencies</h4>
							{#each version.dependencies as dependency (dependency.modId)}
								<p>
									<a href={`/mods/${dependency.modId}`} class="link">
										({dependency.importance.substring(0, 3)})
										{dependency.modId}
										{dependency.version}
									</a>
								</p>
							{/each}
						{/if}
					</div>
				{:else}
					<p>Loading dependencies...</p>
				{/if}

				{#if version.incompatibilities}
					<div>
						{#if version.incompatibilities.length > 0}
							<h4>Incompatibilities</h4>
							{#each version.incompatibilities as incompatibility (incompatibility.modId)}
								<p>
									<a href={`/mods/${incompatibility.modId}`} class="link">
										({incompatibility.importance[0]})
										{incompatibility.modId}
										{incompatibility.version}
									</a>
								</p>
							{/each}
						{/if}
					</div>
				{:else}
					<p>Loading incompatibilities...</p>
				{/if}

				{#if otherVersions.length > 0}
					<div class="max-w-max">
						<h3>Other Versions</h3>
						{#each otherVersions as version}
							<ModItem {modId} {version} slim={true} />
						{/each}
					</div>
				{/if}

				<p class="muted">{mod.id}</p>
			</div>
		</div>
	{:else if loadModError}
		<p>Failed to load: {loadModError}</p>
	{:else}
		<p>Loading...</p>
	{/if}
</div>
