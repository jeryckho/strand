<script>
	import { createEventDispatcher } from "svelte";
	const dispatch = createEventDispatcher();
	import { JSONEditor } from "svelte-jsoneditor";
	import { faTrash, faPalette } from "@fortawesome/free-solid-svg-icons";
	import jsonata from "jsonata";
	export let jsonText = "{}";
	export let readOnly = false;
	export let hasDel = false;
	export let hasCol = false;
	export let info = {};
	let jsonTextFinal = "{}";

	function Since(date, dureeMs) {
		const dateOrigin = new Date(date.replace(/\//g, "-"));
		const dateNow = new Date();
		return (dateNow.getTime() - dateOrigin.getTime()) / dureeMs;
	}

	function addColor(items) {
		const itemsWithoutSpace = items.slice(0, items.length - 1);
		return itemsWithoutSpace.concat([
			{
				separator: true,
			},
			{
				onClick: () => dispatch("col", { info }),
				icon: faPalette,
				title: "Color",
				className: "custom-col-button",
			},
			{
				space: true,
			},
		]);
	}

	function addDel(items) {
		const itemsWithoutSpace = items.slice(0, items.length - 1);
		return itemsWithoutSpace.concat([
			{
				separator: true,
			},
			{
				onClick: () => dispatch("del", { info }),
				icon: faTrash,
				title: "Delete",
				className: "custom-del-button",
			},
			{
				space: true,
			},
		]);
	}

	function handleRenderMenu(items, context) {
		if (hasCol) { items = addColor(items); }
		if (hasDel) { items = addDel(items); }
		return items;
	}

	function handleChange(updatedContent, previousContent, { contentErrors }) {
		if (!contentErrors) {
			const content =
				updatedContent.text !== undefined
					? updatedContent.text
					: JSON.stringify(updatedContent.json);
			if (content && content != jsonText) {
				dispatch("change", { content, info });
			}
		}
	}
	async function reformat(jText) {
		const parsed = JSON.parse(jText);
		let rfmt = {};
		for (const [Key, Value] of Object.entries(parsed)) {
			if (Key.startsWith("$")) {
				try {
					const expression = jsonata(Value);
					expression.registerFunction("years", (dt) => Since(dt, 1000*60*60*24*365.25));
					expression.registerFunction("months", (dt) => Since(dt, 1000*60*60*24*30));
					expression.registerFunction("weeks", (dt) => Since(dt, 1000*60*60*24*7));
					expression.registerFunction("days", (dt) => Since(dt, 1000*60*60*24));
					rfmt[Key.substring(1)] = await expression.evaluate(parsed);				
				} catch (error) {}
			}
		}
		return JSON.stringify({...parsed, ...rfmt});
	}

	$: {
		reformat(jsonText)
			.then(res => { jsonTextFinal = res; } )
	}
</script>

<div class="editor">
	<JSONEditor
		content={{ text: jsonTextFinal, json: undefined }}
		onChange={handleChange}
		onRenderMenu={handleRenderMenu}
		{readOnly}
	/>
</div>

<style>
	.editor {
		width: 100%;
		height: 400px;
	}
</style>
