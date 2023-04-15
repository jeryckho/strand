<script>
	import { error } from "tauri-plugin-log-api";
	import Database from "tauri-plugin-sql-api";
	import Router from "svelte-spa-router";
	import Home from "./routes/Home.svelte";
	import Node from "./routes/Node.svelte";
	import Edge from "./routes/Edge.svelte";
	import Edges from "./routes/Edges.svelte";
	import { db } from "./stores/store";

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
			await $db.execute(`
		CREATE TABLE IF NOT EXISTS nodes (
    body TEXT,
    id   TEXT GENERATED ALWAYS AS (json_extract(body, '$.name')) VIRTUAL NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS id_idx ON nodes(id);

CREATE TABLE IF NOT EXISTS edges (
    source     TEXT,
    target     TEXT,
    properties TEXT,
    UNIQUE(source, target) ON CONFLICT REPLACE,
    FOREIGN KEY(source) REFERENCES nodes(id),
    FOREIGN KEY(target) REFERENCES nodes(id)
);
CREATE INDEX IF NOT EXISTS source_idx ON edges(source);
CREATE INDEX IF NOT EXISTS target_idx ON edges(target);`);
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
