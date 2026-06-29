<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { pwaInfo } from 'virtual:pwa-info'
	let { children } = $props();

	const webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '')
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{@html webManifest}
</svelte:head>

{@render children()}

{#await import('$lib') then { ReloadPrompt: ReloadPrompt } }
	<ReloadPrompt />
{/await}
