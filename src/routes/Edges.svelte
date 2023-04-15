<script>
	import { onMount } from "svelte";
	import { info, error } from "tauri-plugin-log-api";
	import { ask } from "@tauri-apps/api/dialog";
	import { db } from "../stores/store";
	let data = { edges: [] };

	const start = async () => {
		const edges = (
			await $db.select("SELECT * FROM edges")
		).map(({source, target, properties}) => ({
			source,
			target,
			properties: Object.keys(JSON.parse(properties)).length
		}));
		info(edges);
		data = {  edges };
	};

	const delEdge = async (edge) => {
		const confirm = await ask("Are you sure ?", {
			title: "Tauri",
			type: "warning",
		});
		if (confirm) {
			const origIn = data.edges;
			const origT = data.targets;
			try {
				data.edges = data.edges.filter(
					(e) => !(e.source == edge.source && e.target == edge.target)
				);
				if (edge.out) {
					data.targets = [...data.targets, edge.target];
				}
				await $db.execute(
					"DELETE FROM edges WHERE source = ? AND target = ?",
					[edge.source, edge.target]
				);
			} catch (err) {
				error(err);
				data.edges = origIn;
				data.targets = origT;
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
							<th>Source</th>
							<th>Target</th>
							<th>Properties</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.edges as edge}
							<tr>
								<td>{edge.source}</td>
								<td>{edge.target}</td>
								<td>{edge.properties}</td>
								<td>
									<a
										href="#/Edge/{edge.source}/{edge.target}"
										class="button is-info is-small is-responsive is-rounded"
										><i class="fa fa-arrow-right" /></a
									>
									<button
										class="button is-danger is-light is-small is-responsive is-rounded"
										on:click={() => delEdge(edge)}
										><i class="fa fa-trash" /></button
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</nav>
	</div>
</div>
