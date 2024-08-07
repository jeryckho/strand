<script>
	import { onMount } from "svelte";
	import * as d3 from "d3";
	import { db, zoom } from "../stores/store";
	import { info, error } from "tauri-plugin-log-api";
	import { ask, message } from "@tauri-apps/api/dialog";
	import Editor from "../components/Editor.svelte";
	import { AllEdges, AllNodes, UpdateNode, InsertNode, DeleteNode, InsertEdge, DeleteEdge } from "../libs/queries";
	import Typeahead from "svelte-typeahead";

	let targets = [];
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
		if (frm.name != "") {
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

	const addEdge = async (src, tgt) => {
		try {
			await $db.execute(InsertEdge,
				[src, tgt, "{}"]
			);
			await start();
			SetClickedEdge(src, tgt);
		} catch (err) {
			await error(err);
			await ask("Arf");
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
		focusOn(id);
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
		targets = nodes.map(({id})=>id);
		Draw();
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
			.attr("viewBox", [-(width / $zoom) / 2, -(height / $zoom) / 2, width / $zoom, height / $zoom])
			.style("font", "12px sans-serif")
			.on("dblclick", dblClickOutside)
			.on("click", clickOutside)
			.on("contextmenu", function (d) {
				d.preventDefault();
				zoom.set(1);
				svg.attr("viewBox", [-(width / $zoom) / 2, -(height / $zoom) / 2, width / $zoom, height / $zoom]);
			})

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
			.attr("id", (d) => "N"+d.id)
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

	function Draw() {
		let chart = forceChart(data, (window.innerWidth - 50), 400, null);
		d3.select(el).selectAll("*").remove();
		d3.select(el).append(() => chart);
	}

	function setViewPort() {
		const width = window.innerWidth - 50;
		const height = 400;
		d3.select(el).select("svg").attr("viewBox", [-(width / $zoom) / 2, -(height / $zoom) / 2, width / $zoom, height / $zoom]);
	}

	function zoomOn(f) {
		zoom.set($zoom*f);
		setViewPort();
	}

	function focusOn(id) {
		const g = d3.select(el).select("#N"+id).node();
		const { e,f } = g.transform.baseVal.consolidate().matrix
		console.log(JSON.stringify({e,f}));
	}

	onMount(() => {
		if ($db) {
			start();
		} else {
			setTimeout(start, 250);
		}
		window.addEventListener("resize", setViewPort);
		return () => window.removeEventListener("resize", setViewPort);
	});
</script>

<div class="columns">
	<div class="column is-full">
		<nav class="panel">
			<p class="panel-heading">Graph <button on:click={()=>zoomOn(0.8)} class="button is-primary is-small is-responsive is-rounded is-pulled-right"><i class="fa fa-search-minus"/></button><button on:click={()=>zoomOn(1.25)} class="button is-primary is-small is-responsive is-rounded is-pulled-right"><i class="fa fa-search-plus"/></button></p>
			<div bind:this={el} class="panel-block" />
			<div class="panel-block">
				<p class="control has-icons-left"  class:is-loading={false}>
					<Typeahead
						class="input is-warning"
						name="name"
						label="Nodes"
						placeholder="Search"
						hideLabel
						showDropdownOnFocus
						inputAfterSelect="clear"
						data={targets}
						on:select={({ detail }) => AddClickedNode(detail.selected)}
					/>
					<span class="icon is-left">
						<i class="fa fa-search" aria-hidden="true"></i>
					</span>
				</p>
			</div>
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
				action="/api/node" autocomplete="off"
				on:submit|preventDefault={addNode}
			>
				<div class="field has-addons">
					<div class="control">
						<input
							class="input"
							type="text" autocomplete="off"
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
			<div class="control has-text-centered">
				<button class="button is-info" on:click={()=>addEdge(Panels.LefNode?.id, Panels.RigNode?.id)}> Add </button>
			</div>
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
