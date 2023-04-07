<script>
	import { onMount } from "svelte";
	import { JSONEditor } from "svelte-jsoneditor";
	import { warn } from "tauri-plugin-log-api";
	import { db } from "../stores/store";
	export let params = {};
	let data = { id: "?", node: {}, edges: [] };

	let loading = false;

	async function handleChange(
		updatedContent,
		previousContent,
		{ contentErrors }
	) {
		if (!contentErrors) {
			const content =
				updatedContent.text !== undefined
					? updatedContent.text
					: JSON.stringify(updatedContent.json);
			if (content) {
				await $db.execute("UPDATE nodes SET body = json(?) WHERE id = ?", [
					content,
					data.id,
				]);
			}
		}
	}

	const Start = async () => {
		const edges = await $db.select(
			"SELECT * FROM edges WHERE source LIKE ? OR target LIKE ?",
			[params.id, params.id]
		);
		warn(JSON.stringify(edges));
		const node = await $db.select(
			"SELECT id, body FROM nodes WHERE id LIKE ?",
			[params.id]
		);
		warn(JSON.stringify(node));
		data = { id: params.id, node: node[0], edges };
	};

	onMount(() => {
		if ($db) {
			Start();
		} else {
			setTimeout(Start, 250);
		}
	});
</script>

<div class="columns">
	<div class="column is-half">
		<nav class="panel">
			<p class="panel-heading">
				Node &lt;{data.id}&gt;
				<a
					class="delete is-pulled-right"
					class:is-loading={loading}
					href="#/"
					aria-label="close"
				/>
			</p>
			<div class="panel-block">
				<div class="editor">
					<JSONEditor
						content={{ text: data.node?.body, json: undefined }}
						onChange={handleChange}
					/>
				</div>
			</div>
		</nav>
	</div>
	<div class="column is-half">
		<nav class="panel">
			<p class="panel-heading">Nodes</p>
			<div class="panel-block">
				<table class="table is-striped is-fullwidth">
					<thead>
						<tr>
							<th>Source</th>
							<th>Target</th>
							<th>Properties</th>
						</tr>
					</thead>
					<tbody>
						{#each data.edges as edge}
							<tr>
								<td>{edge.source}</td>
								<td>{edge.target}</td>
								<td>{edge.properties}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</nav>
	</div>
</div>

<style>
	.editor {
		width: 100%;
		height: 400px;
	}
</style>
