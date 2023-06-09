<script>
	import { warn, error } from "tauri-plugin-log-api";
	import Editor from "../components/Editor.svelte";
	import { ask } from "@tauri-apps/api/dialog";
	import Typeahead from "svelte-typeahead";
	import { db } from "../stores/store";
	import { UpdateNode, InsertEdge, DeleteEdge, FindNearEdges, FindNode, AllNodes } from "../libs/queries";
	export let params = {};
	let data = { id: "?", node: {}, edges: [], targets: [] };

	let all = false;

	async function handleChange({detail}) {
		if (detail?.content) {
			await $db.execute(
				UpdateNode,
				[detail.content, data.id]
			);
		}
	}

	const addEdge = async (name) => {
		const origIn = data.edges;
		const origT = data.targets;
		try {
			data.edges = [
				...data.edges,
				{ source: params.id, target: name, properties: 0, out: true },
			];
			data.targets = data.targets.filter((v) => v !== name);
			await $db.execute(InsertEdge, [
				params.id,
				name,
				"{}",
			]);
		} catch (err) {
			error(err);
			data.edges = origIn;
			data.targets = origT;
		}
	};

	const delEdge = async (edge) => {
		const confirm = await ask("Are you sure ?", {
			title: "Strand",
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
					DeleteEdge,
					[edge.source, edge.target]
				);
			} catch (err) {
				error(err);
				data.edges = origIn;
				data.targets = origT;
			}
		}
	};

	const Start = async () => {
		const edges = (
			await $db.select(
				FindNearEdges,
				[params.id, params.id]
			)
		)?.reduce((acc, current) => {
			current.properties = Object.keys(
				JSON.parse(current.properties)
			).length;
			current.out = current.source === params.id;
			acc.push(current);
			return acc;
		}, []);
		warn(JSON.stringify(edges));
		const node = await $db.select(
			FindNode,
			[params.id]
		);
		warn(JSON.stringify(node));
		const doneTargets = edges?.reduce((acc, current) => {
			if (current.out) {
				acc.push(current.target);
			}
			return acc;
		}, []);
		const targets = (await $db.select(AllNodes))?.reduce(
			(acc, current) => {
				if (!doneTargets.includes(current.id)) acc.push(current.id);
				return acc;
			},
			[]
		);
		warn(JSON.stringify(targets));
		data = { id: params.id, node: node[0], edges, targets };
	};

	$: {
		let Id = params.id;
		Start();
	}
</script>

<div class="columns">
	<div class="column is-half">
		<nav class="panel">
			<p class="panel-heading">
				Node &lt;{data.id}&gt;
				<a
					href="#/"
					class="button is-primary is-small is-responsive is-rounded is-pulled-right"
					><i class="fa fa-reply" /></a
				>
			</p>
			<div class="panel-block">
				<Editor jsonText={data.node?.body} on:change={handleChange} />
			</div>
		</nav>
	</div>
	<div class="column is-half">
		<nav class="panel">
			<p class="panel-heading">
				Nodes
				<button
					on:click={() => (all = !all)}
					class="button is-primary is-small is-responsive is-rounded is-pulled-right"
					><i
						class={all ? "fa fa-arrow-right" : "fa fa-arrow-left"}
					/></button
				>
			</p>
			<div class="panel-block">
				<table class="table is-striped is-fullwidth">
					<thead>
						<tr>
							<th>Node</th>
							<th>Properties</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.edges as edge}
							{#if all || edge.out}
								<tr>
									<td>{edge.out ? edge.target : edge.source}</td>
									<td>{edge.properties}</td>
									<td>
										<a
											href="#/Edge/{edge.source}/{edge.target}"
											class="button is-info is-small is-responsive is-rounded"
											class:is-light={!edge.out}
											><i
												class={edge.out
													? "fa fa-arrow-right"
													: "fa fa-arrow-left"}
											/></a
										>
										<button
											class="button is-danger is-light is-small is-responsive is-rounded"
											on:click={() => delEdge(edge)}
											><i class="fa fa-trash" /></button
										>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
			{#if data.targets?.length}
				<div class="panel-block">
					<form method="post" action="/api/node">
						<div class="field has-addons">
							<Typeahead
								class="input"
								name="name"
								label="Nodes"
								hideLabel
								showDropdownOnFocus
								inputAfterSelect="clear"
								data={data.targets}
								on:select={({ detail }) => { addEdge(detail.selected) }}
							/>
						</div>
					</form>
				</div>
			{/if}
		</nav>
	</div>
</div>
