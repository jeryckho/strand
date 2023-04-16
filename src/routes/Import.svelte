<script>
	import { AllEdges, AllNodes, DeleteAllEdges, DeleteAllNodes, InsertEdge, InsertNode } from "../libs/queries";
	import { warn, error } from "tauri-plugin-log-api";
	import Editor from "../components/Editor.svelte";
	import { ask } from "@tauri-apps/api/dialog";
	import { db } from "../stores/store";

	let content = "";

	let data = {
		nodes: [],
		edges: [],
	};

	async function importAll() {
		const confirm = await ask("Are you sure ?", {
			title: "Strand",
			type: "warning",
		});
		if (confirm) {
			const toAdd = JSON.parse(content);
			for (const node of toAdd.nodes) {
				try {
					await $db.execute(InsertNode, [JSON.stringify(node)]);
				} catch (err) {
					error(err);
				}
			}
			for (const edge of toAdd.edges) {
				try {
					await $db.execute(InsertEdge, [edge.source, edge.target, JSON.stringify(edge.properties)]);
				} catch (err) {
					error(err);
				}
			}
		}
	}

	async function delAll() {
		const confirm = await ask("Are you sure ?", {
			title: "Strand",
			type: "warning",
		});
		if (confirm) {
			try {
				await $db.execute(DeleteAllEdges, []);
				await $db.execute(DeleteAllNodes, []);
			} catch (err) {
				error(err);
			}
		}
	}

	async function handleChange({ detail }) {
		if (detail?.content) {
			warn(detail?.content);
			content = detail.content;
		}
	}

	const Start = async () => {
		const nodes = await $db.select(AllNodes, []);
		const edges = await $db.select(AllEdges, []);
		data = {
			nodes: nodes.map(({ body }) => JSON.parse(body)),
			edges: edges.map(({ source, target, properties }) => ({
				source,
				target,
				properties: JSON.parse(properties),
			})),
		};
	};

	$: {
		Start();
	}
</script>

<div class="columns">
	<div class="column is-full">
		<nav class="panel">
			<p class="panel-heading">Nodes &amp; Edges</p>
			<div class="panel-block">
				<Editor jsonText={JSON.stringify(data)} on:change={handleChange} />
			</div>
			<div class="panel-block">
				<div class="buttons is-right">
					<button class="button is-warning" on:click={importAll}>Importer</button>
					<button class="button is-danger" on:click={delAll}>Détruire</button>
				</div>
			</div>
		</nav>
	</div>
</div>
