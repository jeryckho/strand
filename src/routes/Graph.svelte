<script>
	import { onMount } from "svelte";
	import * as d3 from "d3";
	import { db } from "../stores/store";
	import { info, error } from "tauri-plugin-log-api";
	import { ask, message } from "@tauri-apps/api/dialog";
	import Editor from "../components/Editor.svelte";
	import { AllEdges, AllNodes, UpdateNode, InsertNode, DeleteNode, InsertEdge, DeleteEdge } from "../libs/queries";

	let data = { nodes: [], edges: [] };

	let ClickedNodes = [];
	let Panels = {
		LefNode: {},
		MidEdge: {},
		RigNode: {}
	};

	const addNode = async ({ target }) => {
		const formData = new FormData(target);
		let frm = {};
		for (let [key, value] of formData) {
			frm[key] = value;
		}
		target.reset();

		try {
			await $db.execute(InsertNode, [
				JSON.stringify(frm),
			]);
			await start();
			AddClickedNode(frm.name);
		} catch (err) {
			await error(err);
			await ask("Arf");
		}
	};
	
	const delNode = async ({detail}) => {
		const confirm = await ask("Are you sure ?", {
			title: "Strand",
			type: "warning",
		});
		if (confirm) {
			try {
				await $db.execute(DeleteNode, [detail.info.id]);
				await start();
				EmptyCLickedNodes();
			} catch (err) {
				await error(err);
				await ask("Ouch");
			}
		}
	};

	const delEdge = async ({detail}) => {
		const confirm = await ask("Are you sure ?", {
			title: "Strand",
			type: "warning",
		});
		if (confirm) {
			try {
				await $db.execute(DeleteEdge, [detail.info.edge.source, detail.info.edge.target]);
				await start();
				EmptyCLickedNodes();
			} catch (err) {
				await error(err);
				await ask("Ouch");
			}
		}
	};

	async function handleChange({detail}) {
		console.log(detail);
		if (detail?.content) {
			if (detail.info?.id) {
				try {
					await $db.execute(
						UpdateNode,
						[detail.content, detail.info.id]
					);
					const node = data.nodes.find(({id}) => id === detail.info?.id);
					console.log(node);
					node.body = detail.content;
					node.id = JSON.parse(detail.content).name;
					console.log(node);
					onResize();
				} catch (err) {
					await error(err);
					await ask("Ouch");
				}
			} else if (detail.info?.edge) {
				try {
					await $db.execute(
						InsertEdge,
						[detail.info.edge.source, detail.info.edge.target, detail.content]
					);	
					const edge = data.edges.find(({source, target}) => source === detail.info.edge.source && target === detail.info.edge.target);
					edge.properties = detail.content;
				} catch (err) {
					await error(err);
					await ask("Ouch");
				}
			}
		}
	}

	const AddClickedNode = (id) => {
		ClickedNodes = ([...ClickedNodes, id]).slice(-2);
		if (ClickedNodes?.[0]) {
			Panels.LefNode = data.nodes.find(({id}) => id === ClickedNodes[0]);
		}
		if (ClickedNodes?.[1]) {
			Panels.RigNode = data.nodes.find(({id}) => id === ClickedNodes[1]);
			Panels.MidEdge =  data.edges.find(({source, target}) => source === ClickedNodes[0] && target === ClickedNodes[1]) ?? {};
		}
	}
	const SetClickedEdge = (src, tgt) =>{
		ClickedNodes = [src, tgt];
		Panels.LefNode = data.nodes.find(({id}) => id === src);
		Panels.RigNode = data.nodes.find(({id}) => id === tgt);
		Panels.MidEdge =  data.edges.find(({source, target}) => source === src && target === tgt);
	}
	const EmptyCLickedNodes = () => {
		ClickedNodes = [];
		Panels.LefNode = {};
		Panels.RigNode = {};
		Panels.MidEdge = {};
	}

	const start = async () => {
		const edges = (await $db.select(AllEdges)).map(
			({ source, target, properties }) => ({
				source,
				target,
				properties,
				type: Object.keys(JSON.parse(properties)).length.toString(10),
			})
		);
		const nodes = await $db.select(AllNodes);
		data = { nodes, edges };
		onResize();
	};

	let drag = (simulation) => {
		function dragstarted(event, d) {
			if (!event.active) simulation.alphaTarget(0.3).restart();
			d.fx = d.x;
			d.fy = d.y;
		}

		function dragged(event, d) {
			d.fx = event.x;
			d.fy = event.y;
		}

		function dragended(event, d) {
			if (!event.active) simulation.alphaTarget(0);
			d.fx = null;
			d.fy = null;
		}

		return d3
			.drag()
			.on("start", dragstarted)
			.on("drag", dragged)
			.on("end", dragended);
	};

	function linkArc(d) {
		const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
		return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
  `;
	}

	function clickLink(e, d) {
		SetClickedEdge(d.source.id, d.target.id);
		e.stopPropagation();
	}

	function clickNode(e, d) {
		AddClickedNode(d.id);
		e.stopPropagation();
	}

	function clickOutside(e, d) {
		EmptyCLickedNodes();
	}

	function dblClickOutside(e) {
		EmptyCLickedNodes();
	}

	let forceChart = (data, width, height, invalidation) => {
		const types = Array.from(new Set(data.edges.map((d) => d.type)));
		const color = d3.scaleOrdinal(types, d3.schemeCategory10);
		const links = data.edges.map((d) => Object.create(d));
		const nodes = data.nodes.map((d) => Object.create(d));

		const simulation = d3
			.forceSimulation(nodes)
			.force(
				"link",
				d3.forceLink(links).id((d) => d.id)
			)
			.force("charge", d3.forceManyBody().strength(-400))
			.force("x", d3.forceX())
			.force("y", d3.forceY());

		const svg = d3
			.create("svg")
			.attr("width", width)
			.attr("height", height)
			.attr("viewBox", [-width / 2, -height / 2, width, height])
			.style("font", "12px sans-serif")
			.on("dblclick", dblClickOutside)
			.on("click", clickOutside)
			.on("contextmenu", function (d) {
				d.preventDefault();
				svg.attr("viewBox", [-width / 2, -height / 2, width, height]);
			})
			// .call(d3.zoom().on("zoom", zoomed));

		function zoomed(e) {
			svg.attr("viewBox", [
				-e.transform.x - width / e.transform.k / 2,
				-e.transform.y - height / e.transform.k / 2,
				width / e.transform.k,
				height / e.transform.k,
			]);
		}

		// Per-type markers, as they don't inherit styles.
		svg.append("defs")
			.selectAll("marker")
			.data(types)
			.join("marker")
			.attr("id", (d) => `arrow-${d}`)
			.attr("viewBox", "0 -5 10 10")
			.attr("refX", 15)
			.attr("refY", -0.5)
			.attr("markerWidth", 6)
			.attr("markerHeight", 6)
			.attr("orient", "auto")
			.append("path")
			.attr("fill", color)
			.attr("d", "M0,-5L10,0L0,5");

		const link = svg
			.append("g")
			.attr("fill", "none")
			.attr("stroke-width", 1.5)
			.selectAll("path")
			.data(links)
			.join("path")
			.on("click", clickLink)
			.attr("stroke", (d) => color(d.type))
			.attr("marker-end", (d) => `url(#arrow-${d.type})`);

		const node = svg
			.append("g")
			.attr("fill", "currentColor")
			.attr("stroke-linecap", "round")
			.attr("stroke-linejoin", "round")
			.selectAll("g")
			.data(nodes)
			.join("g")
			.on("click", clickNode)
			.call(drag(simulation));

		node
			.append("circle")
			.attr("stroke", "white")
			.attr("stroke-width", 1.5)
			.attr("r", 4);

		node
			.append("text")
			.attr("x", 8)
			.attr("y", "0.31em")
			.text((d) => d.id)
			.clone(true)
			.lower()
			.attr("fill", "none")
			.attr("stroke", "white")
			.attr("stroke-width", 3);

		simulation.on("tick", () => {
			link.attr("d", linkArc);
			node.attr("transform", (d) => `translate(${d.x},${d.y})`);
		});

		if (invalidation != null) invalidation.then(() => simulation.stop());

		return svg.node();
	};

	let el;

	let innerWidth;
	let innerHeight;

	function onResize() {
		innerWidth = window.innerWidth;
		innerHeight = window.innerHeight;
		let chart = forceChart(data, innerWidth - 50, 400, null);
		d3.select(el).selectAll("*").remove();
		d3.select(el).append(() => chart);
	}

	onMount(() => {
		if ($db) {
			start();
		} else {
			setTimeout(start, 250);
		}
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	});
</script>

<div class="columns">
	<div class="column is-full">
		<nav class="panel">
			<p class="panel-heading">Graph</p>
			<div bind:this={el} class="panel-block" />
		</nav>
	</div>
</div>
<div class="columns">
	<div class="column is-third">
		{#if Panels.LefNode?.id}
		<nav class="panel">
			<p class="panel-heading">
				Node &lt;{Panels.LefNode.id}&gt;
			</p>
			<div class="panel-block">
				<Editor jsonText={Panels.LefNode?.body} info={{id:Panels.LefNode.id}} on:change={handleChange} hasDel={true} on:del={delNode} />
			</div>
		</nav>
		{:else}
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
		{/if}
	</div>
	<div class="column is-third">
		{#if Panels.MidEdge?.source}
		<nav class="panel">
			<p class="panel-heading">Edge &lt;=&gt;</p>
			<div class="panel-block">
				<Editor jsonText={ Panels.MidEdge?.properties} info={{edge:Panels.MidEdge}} on:change={handleChange} hasDel={true} on:del={delEdge} />
			</div>
		</nav>
		{:else if (Panels.RigNode?.id && Panels.LefNode?.id)}
		<div class="box has-text-centered">
			<button class="button">Center me</button>
		 </div>
		{/if}
	</div>
	<div class="column is-third">
		{#if Panels.RigNode?.id}
		<nav class="panel">
			<p class="panel-heading">
				Node &lt;{Panels.RigNode.id}&gt;
			</p>
			<div class="panel-block">
				<Editor jsonText={Panels.RigNode?.body} info={{id:Panels.RigNode.id}} on:change={handleChange} hasDel={true} on:del={delNode} />
			</div>
		</nav>
		{/if}
	</div>
</div>
