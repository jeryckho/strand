<script>
	import { JSONEditor } from "svelte-jsoneditor";
	import { warn, error } from "tauri-plugin-log-api";
	import { db } from "../stores/store";
	export let params = {};
	let data = { id: "?", node: {}, edges: { in: [], out: [] }, targets: [] };

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

	const addEdge = async ({ target }) => {
		const formData = new FormData(target);
		let frm = {};
		for (let [key, value] of formData) {
			frm[key] = value;
		}
		target.reset();

		const origIn = data.edges.in;
		const origT = data.targets;
		try {
			data.edges.in = [
				...data.edges.in,
				{ source: params.id, target: frm.name, properties: 0 },
			];
			data.targets = data.targets.filter((v) => v !== frm.name);
			await $db.execute("INSERT INTO edges VALUES(?, ?, json(?))", [
				params.id,
				frm.name,
				"{}",
			]);
		} catch (err) {
			error(err);
			data.edges.in = origIn;
			data.targets = origT;
		}
	};

	const Start = async () => {
		const edges = (
			await $db.select(
				"SELECT * FROM edges WHERE source LIKE ? OR target LIKE ?",
				[params.id, params.id]
			)
		)?.reduce(
			(acc, current) => {
				current.properties = Object.keys(
					JSON.parse(current.properties)
				).length;
				if (current.source === params.id) acc.in.push(current);
				else acc.out.push(current);
				return acc;
			},
			{ in: [], out: [] }
		);
		warn(JSON.stringify(edges));
		const node = await $db.select(
			"SELECT id, body FROM nodes WHERE id LIKE ?",
			[params.id]
		);
		warn(JSON.stringify(node));
		const doneTargets = edges.in.map((v) => v.target);
		const targets = (await $db.select("SELECT id FROM nodes"))?.reduce(
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
							<th />
							<th>Node</th>
							<th>Properties</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.edges.in as edge}
							<tr>
								<td>
									<a
										href="#/Node/{edge.target}"
										class="button is-info is-small is-responsive is-rounded"
										><i class="fa fa-arrow-right" /></a
									></td
								>
								<td>{edge.target}</td>
								<td>{edge.properties}</td>
								<td>
									<a
									href="#/Edge/{edge.source}/{edge.target}"
									class="button is-primary is-small is-responsive is-rounded"
									><i class="fa fa-eye" /></a
								>
								<button
									class="button is-danger is-light is-small is-responsive is-rounded"
									on:click={() => {}}
									><i class="fa fa-trash" /></button
								>
								</td>
							</tr>
						{/each}
						{#each data.edges.out as edge}
							<tr>
								<td
									><a
										href="#/Node/{edge.source}"
										class="button is-info is-light is-small is-responsive is-rounded"
										><i class="fa fa-arrow-left" /></a
									></td
								>
								<td>{edge.source}</td>
								<td>{edge.properties}</td>
								<td>
									<a
									href="#/Edge/{edge.source}/{edge.target}"
									class="button is-primary is-small is-responsive is-rounded"
									><i class="fa fa-eye" /></a
								>
								<button
									class="button is-danger is-light is-small is-responsive is-rounded"
									on:click={() => {}}
									><i class="fa fa-trash" /></button
								>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if data.targets?.length}
				<div class="panel-block">
					<form
						method="post"
						action="/api/node"
						on:submit|preventDefault={addEdge}
					>
						<div class="field has-addons">
							<div class="select">
								<select name="name">
									{#each data.targets as target}
										<option value={target}>
											{target}
										</option>
									{/each}
								</select>
							</div>
							<div class="control">
								<button class="button is-info" type="submit">
									Add
								</button>
							</div>
						</div>
					</form>
				</div>
			{/if}
		</nav>
	</div>
</div>

<style>
	.editor {
		width: 100%;
		height: 400px;
	}
</style>
