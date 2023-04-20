<script>
	import { onMount } from "svelte";
	import * as d3 from "d3";
	import { db } from "../stores/store";
	import { AllEdges, AllNodes, InsertNode, DeleteNode } from "../libs/queries";

	let data = { nodes: [], edges: [] };

	const start = async () => {
		const edges = (
			await $db.select(AllEdges)
		).map(({ source, target, properties }) => ({ source, target, properties, type: Object.keys(JSON.parse(properties)).length.toString(10) }));
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

	let forceChart = (data, width, height, location, invalidation) => {
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
			.attr("viewBox", [-width / 2, -height / 2, width, height])
			.style("font", "12px sans-serif");

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
			.attr("stroke", (d) => color(d.type))
			.attr("marker-end", d => `url(#arrow-${d.type})`);

		const node = svg
			.append("g")
			.attr("fill", "currentColor")
			.attr("stroke-linecap", "round")
			.attr("stroke-linejoin", "round")
			.selectAll("g")
			.data(nodes)
			.join("g")
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
			let chart = forceChart(data, innerWidth-100, innerHeight-100, "TEST", null);
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

<div bind:this={el} class="chart" />

<div>
	Width: {innerWidth}
</div>
