<script>
	import { error } from "tauri-plugin-log-api";
	import Database from "tauri-plugin-sql-api";
	import Router from "svelte-spa-router";
	import Home from "./lib/Home.svelte";
	import Node from "./lib/Node.svelte";
	import { db } from "./stores/store";

	const routes = {
		"/": Home,
		"/Node/:id": Node,
		"*": Home
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

<main class="container">
	{#if $db}
		<Router {routes} />
	{/if}
</main>
