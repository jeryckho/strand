<script>
	import { onMount } from "svelte";
	import { info, error } from "tauri-plugin-log-api";
	import { ask } from "@tauri-apps/api/dialog";
	import { db } from "../stores/store";
	let data = { nodes: [], edges: [] };

	const start = async () => {
		const edges = await $db.select(
			"SELECT * FROM edges"
		);
		info(edges);
		const nodes = (
			await $db.select("SELECT id, body FROM nodes")
		).map(({ id, body }) => ({
			id,
			properties: Object.keys(JSON.parse(body)).length,
			edges: edges.filter((e) => e.source == id)?.length ?? 0,
		}));
		info(nodes);
		data = { nodes, edges };
	};

	let loading = "";

	const addNode = async ({ target }) => {
		const formData = new FormData(target);
		let frm = {};
		for (let [key, value] of formData) {
			frm[key] = value;
		}
		target.reset();

		const orig = data.nodes;
		try {
			data.nodes = [
				...data.nodes,
				{ id: frm.name, properties: 1, edges: 0 },
			];
			await $db.execute("INSERT INTO nodes VALUES(json(?))", [
				JSON.stringify(frm),
			]);
		} catch (err) {
			error(err);
			data.nodes = orig;
		}
	};

	const delNode = async (id) => {
		const confirm = await ask("Are you sure ?", {
			title: "Tauri",
			type: "warning",
		});
		if (confirm) {
			const orig = data.nodes;
			try {
				data.nodes = data.nodes.filter((n) => n.id != id);
				await $db.execute("DELETE FROM nodes WHERE id = ?", [id]);
			} catch (err) {
				error(err);
				data.nodes = orig;
			}
		}
	};

	onMount(() => {
		if ($db) {
			start();
		} else {
			setTimeout(start, 250);
		}
	});
</script>

<div class="columns">
	<div class="column is-full">
		<nav class="panel">
			<p class="panel-heading">Nodes</p>
			<div class="panel-block">
				<table class="table is-striped is-fullwidth">
					<thead>
						<tr>
							<th>Name</th>
							<th>Properties</th>
							<th>Edges</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.nodes as node}
							<tr>
								<td>{node.id}</td>
								<td>{node.properties}</td>
								<td>{node.edges}</td>
								<td>
									<a
										href="#/Node/{node.id}"
										class="button is-primary is-small is-responsive is-rounded"
										class:is-loading={loading == node.id}
										><i class="fa fa-eye" /></a
									>
									<button
										class="button is-danger is-light is-small is-responsive is-rounded"
										on:click={() => delNode(node.id)}
										><i class="fa fa-trash" /></button
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="panel-block">
				<form
					method="post"
					action="/api/node"
					on:submit|preventDefault={addNode}
				>
					<div class="field has-addons">
						<div class="control">
							<input
								class="input"
								type="text"
								placeholder="Node name"
								name="name"
								value=""
							/>
						</div>
						<div class="control">
							<button class="button is-info" type="submit"> Add </button>
						</div>
					</div>
				</form>
			</div>
		</nav>
	</div>
</div>
