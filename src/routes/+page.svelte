<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	import Fa from 'svelte-fa';
	import { faSearch } from '@fortawesome/free-solid-svg-icons';

	import { Input, type FormInputEvent } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Pagination from '$lib/components/ui/pagination';

	import { IndexService } from '$lib/api/index-service';
	import type { ModID, Platform } from '$lib/api/models';
	import ModItem from '$lib/components/ModItem.svelte';
	import { ModSort } from '$lib/api/index-repository';
	import { user } from '$lib/stores/user';

	const index = IndexService.getContext();

	let mods: ModID[] = [];
	let modCount = 0;

	const modsPerPage = 10;
	let currentPage = 1;
	let showPending = false;

	let inLoading = true;
	let loadError = '';

	let modQueryIntermediate = '';
	let modQuery = '';

	const validSorts = [
		{ label: 'Downloads', value: ModSort.Downloads },
		{ label: 'Recently Updated', value: ModSort.RecentlyUpdated },
		{ label: 'Recently Published', value: ModSort.RecentlyPublished },
		{ label: 'Name', value: ModSort.Name },
		{ label: 'Name (Reversed)', value: ModSort.NameReverse }
	];

	let modSort = validSorts[0];

	function parseQuery() {
		const words = modQuery.split(' ');
		let query = [];

		let featured = undefined;
		let developer = undefined;
		let platforms: Platform[] = [];
		let tags: string[] = [];

		for (const word of words) {
			if (word.includes(':')) {
				// kinda messy code but whatever
				if (word.startsWith('featured:')) {
					const value = word.substring(9);
					featured = value == 'true' || value == '1';
				} else if (word.startsWith('developer:')) {
					const value = word.substring(10);
					developer = value;
				} else if (word.startsWith('platforms:')) {
					const value = word.substring(10);
					platforms = platforms.concat(value.split(',') as Platform[]);
				} else if (word.startsWith('platform:')) {
					const value = word.substring(9);
					platforms.push(value as Platform);
				} else if (word.startsWith('tags:')) {
					const value = word.substring(5);
					tags = tags.concat(value.split(','));
				} else if (word.startsWith('tag:')) {
					const value = word.substring(4);
					tags.push(value);
				}
			} else {
				query.push(word);
			}
		}

		return {
			query: query.join(' '),
			featured,
			developer,
			tags: tags.length ? tags : undefined,
			platforms: platforms.length ? platforms : undefined
		};
	}

	async function loadMods() {
		if (inLoading) {
			return;
		}

		loadError = '';
		inLoading = true;

		mods = [];

		if (filtersChanged) {
			currentPage = 1;
			filtersChanged = false;
		}

		try {
			const options = parseQuery();

			const { data, count } = await index.mods.search({
				page: currentPage,
				pendingValidation: showPending,
				sort: modSort.value,
				...options
			});

			mods = data.map((m) => m.id);
			modCount = count;
		} catch (e) {
			if (e instanceof Error) {
				loadError = e.message;
			} else {
				loadError = 'unexpected failure';
			}
		}

		inLoading = false;
	}

	onMount(async () => {
		inLoading = false;
		await loadMods();
	});

	function updateQuery(newValue: string) {
		modQuery = newValue;
		modQueryIntermediate = newValue;
	}

	function onSearch() {
		modQuery = modQueryIntermediate;
	}

	function onSearchKeydown(event: FormInputEvent<KeyboardEvent>) {
		if (event.key == 'Enter') {
			onSearch();
		}
	}

	$: {
		const pageQuery = $page.url.searchParams.get('query') ?? '';
		updateQuery(pageQuery);
	}

	let filtersChanged = false;
	$: modSort, showPending, modQuery, (filtersChanged = true);
	$: modSort, showPending, modQuery, currentPage, loadMods();

	let currentUser = $user;
	$: currentUser = $user;
</script>

<div class="container mx-auto">
	<h1 class="header">Mods</h1>

	<div class="my-3 flex flex-col gap-3 max-w-lg">
		<div class="flex flex-row gap-2">
			<Input
				type="search"
				placeholder="Search..."
				bind:value={modQueryIntermediate}
				on:keydown={onSearchKeydown}
			/>
			<Button variant="outline" size="icon" on:click={onSearch}>
				<Fa icon={faSearch} />
			</Button>
		</div>
		<div class="flex flex-row gap-2 flex-wrap">
			<Select.Root bind:selected={modSort}>
				<Select.Trigger class="max-w-48">
					<Select.Value placeholder="Sort By" />
				</Select.Trigger>
				<Select.Content>
					{#each validSorts as sort}
						<Select.Item value={sort.value} label={sort.label} />
					{/each}
				</Select.Content>
			</Select.Root>

			{#if currentUser?.admin}
				<div class="flex flex-row gap-1 items-center">
					<Checkbox id="filter-unverified" bind:checked={showPending} />
					<Label
						for="filter-unverified"
						class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						Show unverified mods
					</Label>
				</div>
			{/if}
		</div>

		{#if loadError}
			<small>Failed to load page: {loadError}</small>
		{/if}

		{#if inLoading}
			<p>Loading...</p>
		{/if}
	</div>

	{#each mods as mod}
		<ModItem modId={mod} showDownloadCount={!showPending} />
	{/each}

	{#if mods.length > 0}
		<div class="flow flow-row items-center mt-2 mb-4">
			<Pagination.Root
				count={modCount}
				perPage={modsPerPage}
				siblingCount={3}
				bind:page={currentPage}
				let:pages
				let:currentPage
			>
				<Pagination.Content>
					<Pagination.Item>
						<Pagination.PrevButton />
					</Pagination.Item>
					{#each pages as page (page.key)}
						{#if page.type === 'ellipsis'}
							<Pagination.Item>
								<Pagination.Ellipsis />
							</Pagination.Item>
						{:else}
							<Pagination.Item>
								<Pagination.Link {page} isActive={currentPage == page.value}>
									{page.value}
								</Pagination.Link>
							</Pagination.Item>
						{/if}
					{/each}
					<Pagination.Item>
						<Pagination.NextButton />
					</Pagination.Item>
				</Pagination.Content>
			</Pagination.Root>
		</div>
	{:else if !inLoading}
		<i>No mods found!</i>
	{/if}
</div>
