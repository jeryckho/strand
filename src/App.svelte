<script>
	import { error } from "tauri-plugin-log-api";
	import Database from "tauri-plugin-sql-api";
	import Router from "svelte-spa-router";
	import Home from "./routes/Home.svelte";
	import Node from "./routes/Node.svelte";
	import Edge from "./routes/Edge.svelte";
	import Edges from "./routes/Edges.svelte";
	import Import from "./routes/Import.svelte";
	import Graph from "./routes/Graph.svelte";
	import { db, inited, File } from "./stores/store";
	import { Schema } from "./libs/queries";

	let file = "";

	const routes = {
		"/Home": Home,
		"/Edges": Edges,
		"/Import": Import,
		"/Node/:id": Node,
		"/Edge/:source/:target": Edge,
		"/Graph": Graph,
		"*": Graph,
	};

	const Start = async () => {
		try {
			const path = $File;
			db.set(await Database.load(`sqlite://${path}`));
			await $db.execute(Schema);
			inited.set(true);
		} catch (err) {
			error(err);
		}
	};

	const Open = async () => {
		try {
			db.set(await Database.load(`sqlite://${file}`));
			await $db.execute(Schema);
			File.set(file);
		} catch (err) {
			error(err);
		}
	};

	const Close = async () => {
		await $db.close();
		db.set(null);
	};

	Start();
</script>

<main>
	{#if $db}
		<nav class="navbar is-light block">
			<div class="navbar-brand">
				<a class="navbar-item" href="#/Graph"> Graph </a>
				<a class="navbar-item" href="#/Home"> Nodes </a>
				<a class="navbar-item" href="#/Edges"> Edges </a>
				<a class="navbar-item" href="#/Import"> Import </a>
				<a class="navbar-item" href="#/"  on:click={Close}> Close </a>
			</div>
		</nav>
		<Router {routes} />
	{:else if $inited}
		<nav class="navbar is-light block">
			<div class="navbar-brand">
				<a class="navbar-item" href="#/"> Open </a>
			</div>
		</nav>
		<div class="columns">
			<div class="column is-full">
				<nav class="panel">
					<p class="panel-heading">Open</p>
					<div class="panel-block">
						<div class="field has-addons">
							<div class="control">
							  <input class="input" type="text" bind:value={file} placeholder="enter file path">
							</div>
							<div class="control">
							  <button class="button is-warning" on:click={Open}>
								Connecter
							  </button>
							</div>
						 </div>
					</div>
				</nav>
			</div>
		</div>
	{:else}
	... Waiting ...
	{/if}
</main>
