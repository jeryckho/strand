<script>
	// @ts-nocheck

	import * as d3 from "d3";
	import { onMount } from "svelte";
	import { db, zoom, File } from "$lib/store";
	import Editor from "$lib/Editor.svelte";
	import Typeahead from "svelte-typeahead";
	import { error } from "tauri-plugin-log-api";
	import { ask } from "@tauri-apps/api/dialog";

	let Inited = false;
	let /** @type {any} */ targets = [];
	let data = { nodes: [], edges: [] };

	/**
	 * @type {any[]}
	 */
	let ClickedNodes = [];
	let /** @type {any} */ Panels = {
			LefNode: {},
			MidEdge: {},
			RigNode: {},
		};

	const addNode = async (/** @type {any} */ { target }) => {
		const formData = new FormData(target);
		let /** @type {any} */ frm = {};
		for (let [key, value] of formData) {
			frm[key] = value;
		}
		target.reset();
		if (frm.name != "") {
			try {
				await $db.InsertNode({ body: frm });
				await start();
				AddClickedNode(frm.name);
			} catch (/** @type {any} */ err) {
				await error(err);
				await ask("Arf");
			}
		}
	};

	const delNode = async (/** @type {any} */ { detail }) => {
		const confirm = await ask("Are you sure ?", {
			title: "Strand",
			type: "warning",
		});
		if (confirm) {
			try {
				await $db.DeleteNode({ id: detail.info.id });
				await start();
				EmptyCLickedNodes();
			} catch (/** @type {any} */ err) {
				await error(err);
				await ask("Ouch");
			}
		}
	};

	const addEdge = async (/** @type {any} */ src, /** @type {any} */ tgt) => {
		try {
			await $db.InsertEdge({ source: src, target: tgt, properties: {} });
			await start();
			SetClickedEdge(src, tgt);
		} catch (/** @type {any} */ err) {
			await error(err);
			await ask("Arf");
		}
	};

	const delEdge = async (/** @type {any} */ { detail }) => {
		const confirm = await ask("Are you sure ?", {
			title: "Strand",
			type: "warning",
		});
		if (confirm) {
			try {
				await $db.DeleteEdge({
					source: detail.info.edge.source,
					target: detail.info.edge.target,
				});
				await start();
				EmptyCLickedNodes();
			} catch (/** @type {any} */ err) {
				await error(err);
				await ask("Ouch");
			}
		}
	};

	async function handleChange(/** @type {any} */ { detail }) {
		console.log(detail);
		if (detail?.content) {
			if (detail.info?.id) {
				try {
					await $db.UpdateNode({
						id: detail.info.id,
						body: detail.content,
					});
					const /** @type {any} */ node = data.nodes.find(
							({ id }) => id === detail.info?.id,
						);
					console.log(node);
					node.body = detail.content;
					node.id = JSON.parse(detail.content).name;
					console.log(node);
				} catch (/** @type {any} */ err) {
					await error(err);
					await ask("Ouch");
				}
			} else if (detail.info?.edge) {
				try {
					await $db.InsertEdge({
						source: detail.info.edge.source,
						target: detail.info.edge.target,
						properties: detail.content,
					});
					const /** @type {any} */ edge = data.edges.find(
							({ source, target }) =>
								source === detail.info.edge.source &&
								target === detail.info.edge.target,
						);
					edge.properties = detail.content;
				} catch (/** @type {any} */ err) {
					await error(err);
					await ask("Ouch");
				}
			}
		}
	}

	const AddClickedNode = (/** @type {any} */ id) => {
		ClickedNodes = [...ClickedNodes, id].slice(-2);
		if (ClickedNodes?.[0]) {
			Panels.LefNode = data.nodes.find(
				({ id }) => id === ClickedNodes[0],
			);
		}
		if (ClickedNodes?.[1]) {
			Panels.RigNode = data.nodes.find(
				({ id }) => id === ClickedNodes[1],
			);
			Panels.MidEdge =
				data.edges.find(
					({ source, target }) =>
						source === ClickedNodes[0] &&
						target === ClickedNodes[1],
				) ?? {};
		}
		focusOn(id);
	};
	const SetClickedEdge = (/** @type {any} */ src, /** @type {any} */ tgt) => {
		ClickedNodes = [src, tgt];
		Panels.LefNode = data.nodes.find(({ id }) => id === src);
		Panels.RigNode = data.nodes.find(({ id }) => id === tgt);
		Panels.MidEdge = data.edges.find(
			({ source, target }) => source === src && target === tgt,
		);
	};
	const EmptyCLickedNodes = () => {
		ClickedNodes = [];
		Panels.LefNode = {};
		Panels.RigNode = {};
		Panels.MidEdge = {};
	};

	const start = async () => {
		const /** @type {any} */ edges = (await $db.AllEdge()).map(
				({ source, target, properties }) => ({
					source,
					target,
					properties,
					type: Object.keys(JSON.parse(properties)).length.toString(
						10,
					),
				}),
			);
		const /** @type {any} */ nodes = await $db.AllNodes();
		data = { nodes, edges };
		targets = nodes.map((/** @type {any} */ { id }) => id);
		Draw();
	};

	let drag = (
		/** @type {{ alphaTarget: (arg0: number) => { (): any; new (): any; restart: { (): void; new (): any; }; }; }} */ simulation,
	) => {
		/**
		 * @param {{ active: any; }} event
		 * @param {{ fx: any; x: any; fy: any; y: any; }} d
		 */
		function dragstarted(event, d) {
			if (!event.active) simulation.alphaTarget(0.3).restart();
			d.fx = d.x;
			d.fy = d.y;
		}

		/**
		 * @param {{ x: any; y: any; }} event
		 * @param {{ fx: any; fy: any; }} d
		 */
		function dragged(event, d) {
			d.fx = event.x;
			d.fy = event.y;
		}

		/**
		 * @param {{ active: any; }} event
		 * @param {{ fx: null; fy: null; }} d
		 */
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

	/**
	 * @param {{ target: { x: number; y: number; }; source: { x: number; y: number; }; }} d
	 */
	function linkArc(d) {
		const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
		return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
  `;
	}

	/**
	 * @param {{ stopPropagation: () => void; }} e
	 * @param {{ source: { id: any; }; target: { id: any; }; }} d
	 */
	function clickLink(e, d) {
		SetClickedEdge(d.source.id, d.target.id);
		e.stopPropagation();
	}

	/**
	 * @param {{ stopPropagation: () => void; }} e
	 * @param {{ id: any; }} d
	 */
	function clickNode(e, d) {
		AddClickedNode(d.id);
		e.stopPropagation();
	}

	/**
	 * @param {any} e
	 * @param {any} d
	 */
	function clickOutside(e, d) {
		EmptyCLickedNodes();
	}

	/**
	 * @param {any} e
	 */
	function dblClickOutside(e) {
		EmptyCLickedNodes();
	}

	let forceChart = (
		/** @type {{ nodes: any; edges: any; }} */ data,
		/** @type {number} */ width,
		/** @type {number} */ height,
		/** @type {Promise<any> | null} */ invalidation,
	) => {
		const types = Array.from(
			new Set(
				data.edges.map((/** @type {{ type: any; }} */ d) => d.type),
			),
		);
		const color = d3.scaleOrdinal(types, d3.schemeCategory10);
		const links = data.edges.map((/** @type {object | null} */ d) =>
			Object.create(d),
		);
		const nodes = data.nodes.map((/** @type {object | null} */ d) =>
			Object.create(d),
		);

		const simulation = d3
			.forceSimulation(nodes)
			.force(
				"link",
				d3.forceLink(links).id((/** @type {{ id: any; }} */ d) => d.id),
			)
			.force("charge", d3.forceManyBody().strength(-400))
			.force("x", d3.forceX())
			.force("y", d3.forceY());

		const svg = d3
			.create("svg")
			.attr("width", width)
			.attr("height", height)
			.attr("viewBox", [
				-(width / $zoom) / 2,
				-(height / $zoom) / 2,
				width / $zoom,
				height / $zoom,
			])
			.style("font", "12px sans-serif")
			.on("dblclick", dblClickOutside)
			.on("click", clickOutside)
			.on(
				"contextmenu",
				function (/** @type {{ preventDefault: () => void; }} */ d) {
					d.preventDefault();
					zoom.set(1);
					svg.attr("viewBox", [
						-(width / $zoom) / 2,
						-(height / $zoom) / 2,
						width / $zoom,
						height / $zoom,
					]);
				},
			);

		// Per-type markers, as they don't inherit styles.
		svg.append("defs")
			.selectAll("marker")
			.data(types)
			.join("marker")
			.attr("id", (/** @type {any} */ d) => `arrow-${d}`)
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
			.attr("stroke", (/** @type {{ type: any; }} */ d) => color(d.type))
			.attr(
				"marker-end",
				(/** @type {{ type: any; }} */ d) => `url(#arrow-${d.type})`,
			);

		const node = svg
			.append("g")
			.attr("fill", "currentColor")
			.attr("stroke-linecap", "round")
			.attr("stroke-linejoin", "round")
			.selectAll("g")
			.data(nodes)
			.join("g")
			.attr("id", (/** @type {{ id: string; }} */ d) => "N" + d.id)
			.on("click", clickNode)
			.call(drag(simulation));

		node.append("circle")
			.attr("stroke", "white")
			.attr("stroke-width", 1.5)
			.attr("r", 4);

		node.append("text")
			.attr("x", 8)
			.attr("y", "0.31em")
			.text((/** @type {{ id: any; }} */ d) => d.id)
			.clone(true)
			.lower()
			.attr("fill", "none")
			.attr("stroke", "white")
			.attr("stroke-width", 3);

		simulation.on("tick", () => {
			link.attr("d", linkArc);
			node.attr(
				"transform",
				(/** @type {{ x: any; y: any; }} */ d) =>
					`translate(${d.x},${d.y})`,
			);
		});

		if (invalidation != null) invalidation.then(() => simulation.stop());

		return svg.node();
	};

	/**
	 * @type {any}
	 */
	let el;

	function Draw() {
		let chart = forceChart(data, window.innerWidth - 50, 400, null);
		d3.select(el).selectAll("*").remove();
		d3.select(el).append(() => chart);
	}

	function setViewPort() {
		const width = window.innerWidth - 50;
		const height = 400;
		d3.select(el)
			.select("svg")
			.attr("viewBox", [
				-(width / $zoom) / 2,
				-(height / $zoom) / 2,
				width / $zoom,
				height / $zoom,
			]);
	}

	/**
	 * @param {number} f
	 */
	function zoomOn(f) {
		zoom.set($zoom * f);
		setViewPort();
	}

	/**
	 * @param {string} id
	 */
	function focusOn(id) {
		const g = d3
			.select(el)
			.select("#N" + id)
			.node();
		const { e, f } = g.transform.baseVal.consolidate().matrix;
		console.log(JSON.stringify({ e, f }));
	}

	// @ts-ignore
	onMount(async () => {
		Inited = false;
		if (!$db.isOn()) db.set(await $db.load($File));

		window.addEventListener("resize", Draw); // setViewPort
		Inited = true;
		start();
		return () => window.removeEventListener("resize", Draw); // setViewPort
	});
</script>

<div class="columns">
	<div class="column is-full">
		<nav class="panel">
			<p class="panel-heading">
				Graph
				<span class="mdi-set is-pulled-right">
					<button
						on:click={() => zoomOn(1.25)}
						class="mdi-magnify-plus"
					></button>
					<button
						on:click={() => zoomOn(0.8)}
						class="mdi-magnify-minus"
					></button>
				</span>
			</p>
			<div bind:this={el} class="panel-block" />
			<div class="panel-block">
				<p class="control has-icons-left" class:is-loading={false}>
					<Typeahead
						class="input is-warning"
						name="name"
						label="Nodes"
						placeholder="Search"
						hideLabel
						showDropdownOnFocus
						inputAfterSelect="clear"
						data={targets}
						on:select={({ detail }) =>
							AddClickedNode(detail.selected)}
					/>
					<span class="icon is-left">
						<i
							class="mdi mdi-file-search-outline"
							aria-hidden="true"
						></i>
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
					<Editor
						jsonText={Panels.LefNode?.body}
						info={{ id: Panels.LefNode.id }}
						on:change={handleChange}
						hasDel={true}
						on:del={delNode}
					/>
				</div>
			</nav>
		{:else}
			<div class="panel-block">
				<form
					method="post"
					action="/api/node"
					autocomplete="off"
					on:submit|preventDefault={addNode}
				>
					<div class="field has-addons">
						<div class="control">
							<input
								class="input"
								type="text"
								autocomplete="off"
								placeholder="Node name"
								name="name"
								value=""
							/>
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
	</div>
	<div class="column is-third">
		{#if Panels.MidEdge?.source}
			<nav class="panel">
				<p class="panel-heading">Edge &lt;=&gt;</p>
				<div class="panel-block">
					<Editor
						jsonText={Panels.MidEdge?.properties}
						info={{ edge: Panels.MidEdge }}
						on:change={handleChange}
						hasDel={true}
						on:del={delEdge}
					/>
				</div>
			</nav>
		{:else if Panels.RigNode?.id && Panels.LefNode?.id}
			<div class="box has-text-centered">
				<div class="control has-text-centered">
					<button
						class="button is-info"
						on:click={() =>
							addEdge(Panels.LefNode?.id, Panels.RigNode?.id)}
					>
						Add
					</button>
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
					<Editor
						jsonText={Panels.RigNode?.body}
						info={{ id: Panels.RigNode.id }}
						on:change={handleChange}
						hasDel={true}
						on:del={delNode}
					/>
				</div>
			</nav>
		{/if}
	</div>
</div>
