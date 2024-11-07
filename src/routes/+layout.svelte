<script>
	import Toolbar from '$lib/components/Toolbar.svelte';
</script>
<style>
	:global(*){
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}
	:global(html) {
		height: 100vh;
	}
	:global(body) {
		height: 100%;
	}
</style>

<Toolbar />
<slot/>