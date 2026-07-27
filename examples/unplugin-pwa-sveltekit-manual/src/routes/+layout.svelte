<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	// import { browser, dev } from '$app/environment'
	import { pwaInfo } from 'virtual:pwa-info'
	// import { onMount } from 'svelte';

	console.log(pwaInfo)

	let { children } = $props();

	// const scriptTag = $derived(pwaInfo && !dev ? pwaInfo.registerSW?.scriptTag || '' : '')
	// const webManifest = $derived(pwaInfo && !dev ? pwaInfo.webManifest.linkTag : '')
	const webManifest = $derived(pwaInfo  ? pwaInfo.webManifest.linkTag : '')

	/*if (browser && dev) {
		import('@vitejs/devtools/client/inject').then(() => {
			console.log('Vite Devtools injected')
		})
	}*/

	/*onMount(async () => {
		console.log(browser)
		if (browser) {
			import('virtual:pwa-entry-point-loaded').then(({
				registerDevSW
			}) => {
				registerDevSW()
			})
		}
	});*/

</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{@html webManifest}
	<!--{@html scriptTag}-->
</svelte:head>

{@render children()}

{#await import('#lib') then { ReloadPrompt: ReloadPrompt } }
	<ReloadPrompt />
{/await}
