<script>
	import { createEventDispatcher } from "svelte";
	const dispatch = createEventDispatcher();
	import { JSONEditor } from "svelte-jsoneditor";
	export let jsonText = "{}";
	export let readOnly = false;

	function handleChange(updatedContent, previousContent, { contentErrors }) {
		if (!contentErrors) {
			const content =
				updatedContent.text !== undefined
					? updatedContent.text
					: JSON.stringify(updatedContent.json);
			if (content) {
				dispatch("change", { content });
			}
		}
	}
</script>

<div class="editor">
	<JSONEditor
		content={{ text: jsonText, json: undefined }}
		onChange={handleChange}
		{readOnly}
	/>
</div>

<style>
	.editor {
		width: 100%;
		height: 400px;
	}
</style>
