<script>
	import { error } from "tauri-plugin-log-api";
	import Database from "tauri-plugin-sql-api";
	import Router from "svelte-spa-router";
	import Home from "./routes/Home.svelte";
	import Node from "./routes/Node.svelte";
	import Edge from "./routes/Edge.svelte";
	import Edges from "./routes/Edges.svelte";
	import { db } from "./stores/store";
	import { Schema } from "./libs/queries";

	const routes = {
		"/": Home,
		"/Edges": Edges,
		"/Node/:id": Node,
		"/Edge/:source/:target": Edge,
		"*": Home,
	};

	const Start = async () => {
		try {
			db.set(await Database.load("sqlite:test.db"));
			await $db.execute(Schema);
		} catch (err) {
			error(err);
		}

		// await db.close();
	};

	Start();
</script>

<main>
	<nav class="navbar is-light block">
		<div class="navbar-brand">
			<a class="navbar-item" href="#/"> Nodes </a>
			<a class="navbar-item" href="#/Edges"> Edges </a>
		</div>
	</nav>
	{#if $db}
		<Router {routes} />
	{/if}
</main>
