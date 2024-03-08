<script lang="ts">
	import type { ModDeveloper } from '$lib/api/models';

	export let developers: ModDeveloper[];

	const developerString = developers.map((d) => d.displayName).join(', ');
</script>

<p class={$$props.class}>{developerString}</p>
