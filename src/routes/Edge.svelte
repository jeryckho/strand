<script>
	import { warn, error } from "tauri-plugin-log-api";
	import Editor from "../components/Editor.svelte";
	import { db } from "../stores/store";
	import { FindEdge, FindNode, InsertEdge } from "../libs/queries";
	export let params = {};
	let data = {
		id_source: "?",
		id_target: "?",
		source: {},
		edge: {},
		target: {},
	};

	async function handleChange({ detail }) {
		if (detail?.content) {
			warn(detail?.content);
			await $db.execute(InsertEdge, [
				params.source,
				params.target,
				detail.content,
			]);
		}
	}

	const Start = async () => {
		const source = await $db.select(
			FindNode,
			[params.source]
		);
		const target = await $db.select(
			FindNode,
			[params.target]
		);
		const edge = await $db.select(
			FindEdge,
			[params.source, params.target]
		);
		data = {
			id_source: params.source,
			id_target: params.target,
			source: source[0],
			edge: edge[0],
			target: target[0],
		};
	};

	$: {
		let Src = params.source;
		let Tgt = params.target;
		Start();
	}
</script>

<div class="columns">
	<div class="column is-third">
		<nav class="panel">
			<p class="panel-heading">
				Node &lt;{data.id_source}&gt;
				<a
					href="#/Node/{data.id_source}"
					class="button is-primary is-small is-responsive is-rounded is-pulled-right"
					><i class="fa fa-eye" /></a
				>
			</p>
			<div class="panel-block">
				<Editor jsonText={data.source?.body} readOnly={true} />
			</div>
		</nav>
	</div>
	<div class="column is-third">
		<nav class="panel">
			<p class="panel-heading">Edge &lt;=&gt;</p>
			<div class="panel-block">
				<Editor jsonText={data.edge?.properties} on:change={handleChange} />
			</div>
		</nav>
	</div>
	<div class="column is-third">
		<nav class="panel">
			<p class="panel-heading">
				Node &lt;{data.id_target}&gt;
				<a
					href="#/Node/{data.id_target}"
					class="button is-primary is-small is-responsive is-rounded is-pulled-right"
					><i class="fa fa-eye" /></a
				>
			</p>
			<div class="panel-block">
				<Editor jsonText={data.target?.body} readOnly={true} />
			</div>
		</nav>
	</div>
</div>
