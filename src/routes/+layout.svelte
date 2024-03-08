<script lang="ts">
	import Fa from 'svelte-fa';
	import { faList, faSpinner, faUser } from '@fortawesome/free-solid-svg-icons';

	import { IndexService } from '$lib/api/index-service.js';
	import { token } from '$lib/stores/token.js';
	import { user } from '$lib/stores/user.js';

	import '../app.pcss';

	IndexService.createContext();

	const index = IndexService.getContext();

	let loadingAuthentication = true;
	token.subscribe(async (v) => {
		if (v) {
			try {
				await index.login(v);
			} catch (e) {
				// clear token if invalid
				token.set(null);
			}
			user.set(index.user);
		} else {
			loadingAuthentication = false;
		}
	});
</script>

<nav class="mb-2 flex">
	<div class="nav-link">
		<a href="/">
			<Fa icon={faList} class="inline pr-1" fw /> Mod Listing
		</a>
	</div>

	<div class="grow"></div>

	<div class="nav-link">
		{#if $user}
			<a href="/me">
				<Fa icon={faUser} class="inline" fw />
				{$user.displayName}
			</a>
		{:else if loadingAuthentication}
			<Fa icon={faSpinner} class="inline" spin />
			Loading...
		{:else}
			<a href="/login">
				<Fa icon={faUser} class="inline" fw /> Login
			</a>
		{/if}
	</div>
</nav>

<slot />

<style lang="postcss" scoped>
	.nav-link {
		@apply m-3;
	}

	.nav-link a {
		@apply p-2 text-black dark:text-white hover:bg-gray-200 hover:dark:bg-gray-700 rounded hover:no-underline;
	}
</style>
