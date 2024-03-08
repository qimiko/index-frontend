<script lang="ts">
	import { onMount } from 'svelte';
	import { IndexService } from '$lib/api/index-service.js';
	import { goto } from '$app/navigation';

	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input, type FormInputEvent } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	import Fa from 'svelte-fa';
	import { faGithub } from '@fortawesome/free-brands-svg-icons';
	import { faCheck, faPlus, faSpinner, faStar } from '@fortawesome/free-solid-svg-icons';

	import type { SimpleMod } from '$lib/api/models';
	import ModItem from '$lib/components/ModItem.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { user } from '$lib/stores/user';

	const index = IndexService.getContext();

	let currentUser = $user;

	let displayName = currentUser?.displayName ?? '';
	let displayNameValue = displayName;

	function updateUserValues() {
		displayName = currentUser?.displayName ?? '';
		displayNameValue = displayName;
	}

	let newModDownloadUrl = '';
	let selfModListing: SimpleMod[] = [];
	let isLoadingModListing = true;
	let showNeedsValidation = false;

	let createModDialog = false;
	let isCreatingMod = false;
	let modCreationFailure = '';

	async function onLogout() {
		try {
			await index.logout();
		} catch (_) {
			// ...
		}

		await goto('/', {
			invalidateAll: true
		});
	}

	async function onLogoutAll() {
		try {
			await index.logoutAll();
		} catch (_) {
			// ...
		}

		await goto('/', {
			invalidateAll: true
		});
	}

	async function onUpdateDisplayName() {
		await index.updateSelf({ displayName: displayNameValue });

		if ($user) {
			$user.displayName = displayNameValue;
			user.set($user);
		}

		displayName = displayNameValue;
	}

	async function updateSelfMods() {
		if (isLoadingModListing || !currentUser) {
			return;
		}

		isLoadingModListing = true;
		selfModListing = [];

		try {
			selfModListing = await index.mods.bySelf({ validated: !showNeedsValidation });
		} catch (_) {
			// ...
		}

		isLoadingModListing = false;
	}

	async function createMod() {
		isCreatingMod = true;
		modCreationFailure = '';

		try {
			await index.mods.create(newModDownloadUrl);

			createModDialog = true;
			newModDownloadUrl = '';
			await updateSelfMods();
		} catch (e) {
			if (e instanceof Error) {
				modCreationFailure = e.message;
			} else {
				modCreationFailure = 'unknown';
			}
		}

		isCreatingMod = false;
	}

	async function onSubmitKeydown(event: FormInputEvent<KeyboardEvent>) {
		if (isCreatingMod || !newModDownloadUrl) {
			return;
		}

		if (event.key == 'Enter') {
			await createMod();
		}
	}

	onMount(async () => {
		isLoadingModListing = false;
		await updateSelfMods();
	});

	$: {
		currentUser = $user;
		updateUserValues();
		updateSelfMods();
	}

	$: showNeedsValidation, updateSelfMods();
</script>

<div class="container">
	{#if !currentUser}
		<p>You must be <a href="/login">logged in</a> to view this page.</p>
	{:else}
		<Card.Root class="max-w-sm">
			<Card.Header>
				<Card.Title>
					{#if currentUser.admin}
						<Fa icon={faStar} class="mr-1 inline" fw />
					{/if}
					{#if currentUser.verified}
						<Fa icon={faCheck} class="mr-1 inline" fw />
					{/if}
					{displayName}
				</Card.Title>
				<Card.Description>
					<a href={`https://github.com/${currentUser.username}`} class="flex gap-1 items-center">
						<Fa icon={faGithub} />
						@{currentUser.username}
					</a>
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form>
					<div class="grid w-full items-center gap-4">
						<div class="flex flex-col space-y-1.5">
							<Label for="display-name">Update display name</Label>
							<div class="flex flex-row gap-2">
								<Input
									id="display-name"
									placeholder="New display name"
									bind:value={displayNameValue}
								/>
								<div>
									<Button on:click={onUpdateDisplayName}>Update</Button>
								</div>
							</div>
						</div>
					</div>
				</form>
			</Card.Content>
			<Card.Footer class="flex justify-between">
				<Button variant="destructive" on:click={onLogoutAll}>Delete all tokens</Button>
				<Button variant="secondary" on:click={onLogout}>Logout</Button>
			</Card.Footer>
		</Card.Root>

		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2 mt-3">
				<h3 class="my-0 py-0">Your mods</h3>

				<Dialog.Root bind:open={createModDialog}>
					<Dialog.Trigger>
						<Button variant="outline">
							<Fa icon={faPlus} class="mr-1" />
							New mod
						</Button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Upload new mod</Dialog.Title>
						</Dialog.Header>
						<div class="grid gap-4 py-4">
							<div class="grid grid-cols-4 items-center gap-4">
								<Label for="download-url" class="text-right">Download URL</Label>
								<Input
									id="download-url"
									placeholder="Enter URL..."
									class="col-span-3"
									type="url"
									bind:value={newModDownloadUrl}
									on:keydown={onSubmitKeydown}
								/>
								{#if modCreationFailure}
									<small class="col-span-4">Error: {modCreationFailure}</small>
								{/if}
							</div>
						</div>
						<Dialog.Footer>
							<Button
								class="self-end"
								type="submit"
								on:click={createMod}
								disabled={isCreatingMod || !newModDownloadUrl}
							>
								{#if isCreatingMod}
									<Fa icon={faSpinner} class="mr-1 inline" spin />
								{/if}
								Upload
							</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</div>

			<div class="flex flex-row gap-1 items-center">
				<Checkbox id="filter-unverified" bind:checked={showNeedsValidation} />
				<Label
					for="filter-unverified"
					class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					Show unverified mods
				</Label>
			</div>

			{#if isLoadingModListing}
				<p>Loading...</p>
			{:else if !selfModListing.length}
				<i>No mods found.</i>
			{:else}
				{#each selfModListing as mod (mod.id)}
					<ModItem modId={mod.id} />
				{/each}
			{/if}
		</div>
	{/if}
</div>
