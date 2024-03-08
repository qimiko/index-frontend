<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import Fa from 'svelte-fa';
	import { faX } from '@fortawesome/free-solid-svg-icons';

	import { IndexService } from '$lib/api/index-service.js';
	import { login } from '$lib/stores/login.js';
	import { token } from '$lib/stores/token.js';
	import { user } from '$lib/stores/user';
	import { fromBase } from '$lib/utils';
	import Button from '$lib/components/ui/button/button.svelte';

	const index = IndexService.getContext();
	let pollInterval: number | undefined = undefined;
	let isChecking = false;

	function createInterval() {
		if (pollInterval || !index.activeLogin) {
			return;
		}

		pollInterval = setInterval(
			async () => {
				const loginToken = await index.pollLogin();
				if (loginToken) {
					token.set(loginToken);
					login.set(null);

					clearInterval(pollInterval);
				}
				// increase the interval slightly (account for network delays, kinda)
			},
			index.activeLogin.interval * 1000 + 500
		);
	}

	async function beginLogin() {
		// load synced login if it happened
		const loginSession = await index.beginLogin();
		login.set(loginSession);
		createInterval();
	}

	onMount(async () => {
		if (index.loggedIn() || index.activeLogin) {
			return;
		}

		if ($login) {
			index.activeLogin = $login;
			createInterval();
		}

		await beginLogin();
	});

	onDestroy(() => {
		clearInterval(pollInterval);
	});

	async function resetLogin() {
		index.cancelLogin();
		login.set(null);

		if (index.loggedIn() || index.activeLogin) {
			return;
		}

		clearInterval(pollInterval);
		await beginLogin();
	}
</script>

<div class="container">
	<h1 class="header">Index Login</h1>

	{#if index.activeLogin}
		<p>
			Please visit the following url <i>in another tab</i>: <br />
			<a href={index.activeLogin.uri} target="”_blank”" class="link">{index.activeLogin.uri}</a>
			<br />
		</p>

		<p>Once there, enter the code below:</p>
		<pre class="code-display">{index.activeLogin.code}</pre>

		<p>Afterwards, return to this page and wait.</p>

		{#if isChecking}
			<p>Checking for finished login...</p>
		{:else}
			<p class="py-2">
				<Button variant="destructive" on:click={resetLogin}>
					<Fa icon={faX} class="inline-block pr-1" />
					Reset Code
				</Button>
			</p>
		{/if}
	{:else if $user}
		<p>
			You're logged in! <br />
			<a href={fromBase('/')} class="link">View mod listing</a>
		</p>
	{:else}
		<div>Waiting for response from index...</div>
	{/if}
	<small> (ﾉ&gt;ω&lt;)ﾉ :｡･:*:･ﾟ’★ </small>
</div>

<style lang="postcss" scoped>
	.code-display {
		@apply text-2xl font-mono border rounded max-w-min p-2 border-gray-300 dark:border-gray-700 select-all m-2;
	}

	p {
		@apply mb-1;
	}
</style>
