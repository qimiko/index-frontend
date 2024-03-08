<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';

	export let tags: string[];
</script>

<div class={`flex flex-wrap gap-1 ${$$props.class}`}>
	{#each tags as tag}
		<Badge variant="outline">{tag}</Badge>
	{/each}
</div>
