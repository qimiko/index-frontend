<script lang="ts">
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import Fa from 'svelte-fa';
	import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	type $$Props = PaginationPrimitive.PrevButtonProps;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	type $$Events = PaginationPrimitive.PrevButtonEvents;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<PaginationPrimitive.PrevButton asChild let:builder>
	<Button
		variant="ghost"
		class={cn('gap-1 pl-2.5', className)}
		builders={[builder]}
		on:click
		{...$$restProps}
	>
		<slot>
			<Fa icon={faChevronLeft} class="h-4 w-4" />
			<span>Previous</span>
		</slot>
	</Button>
</PaginationPrimitive.PrevButton>
