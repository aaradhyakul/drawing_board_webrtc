<script>
	import Toolbar from '$lib/components/Toolbar.svelte';
</script>

<Toolbar />
<slot />

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		background: none;
		outline: none;
		list-style: none;
	}
	:global(html) {
		height: 100vh;
	}
	:global(body) {
		height: 100%;
		overflow: hidden;
	}
</style>
