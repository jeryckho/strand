<script>
    import "bulma/css/bulma.min.css";
    import "@mdi/font/css/materialdesignicons.min.css";
    // @ts-ignore
    import { goto } from "$app/navigation";
    // @ts-ignore
    import { db, File } from "$lib/store";
    import { onMount } from "svelte";
    import { listen } from "@tauri-apps/api/event";
    import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";
    import { open, save, ask } from "@tauri-apps/api/dialog";
    import { appWindow } from "@tauri-apps/api/window";

    const Goto = async (dest, waiting = true) => {
        if (waiting) await goto("/waiting");
        await goto(dest);
    }

    // @ts-ignore
    onMount(async () => {
        appWindow.setTitle(`Strand (${$File})`);
        const unlisten = await listen("backend", async (event) => {
            try {
                switch (event.payload.message) {
                    case "open":
                        const openPath = await open({ multiple: false });
                        if (openPath) {
                            db.set(await $db.load(openPath));
                            File.set(openPath);
                            appWindow.setTitle(`Strand (${$File})`);
                            await Goto("/");
                        }

                        break;
                    case "new":
                        const newPath = await save();
                        if (newPath) {
                            db.set(await $db.load(newPath));
                            File.set(newPath);
                            appWindow.setTitle(`Strand (${$File})`);
                            await Goto("/");
                        }
                        break;
                    case "clean":
                        const confirm = await ask("Are you sure ?", {
                            title: "Strand",
                            type: "warning",
                        });
                        if (confirm) {
                            await $db.DeleteAllEdges();
                            await $db.DeleteAllNodes();
                            await Goto("/");
                        }
                        break;
                    case "export":
                        const nodes = await $db.AllNodes();
                        const edges = await $db.AllEdge();
                        const content = JSON.stringify({
                            nodes: nodes.map(({ body }) => JSON.parse(body)),
                            edges: edges.map(
                                ({ source, target, properties }) => ({
                                    source,
                                    target,
                                    properties: JSON.parse(properties),
                                }),
                            ),
                        });
                        const exportPath = await save({
                            filters: [
                                {
                                    name: "Json",
                                    extensions: ["json"],
                                },
                            ],
                        });
                        if (exportPath) {
                            await writeTextFile(exportPath, content);
                            await Goto("/");
                        }

                        break;
                    case "import":
                        const importPath = await open({
                            multiple: false,
                            filters: [
                                {
                                    name: "Json",
                                    extensions: ["json"],
                                },
                            ],
                        });
                        if (importPath) {
                            // @ts-ignore
                            const content = await readTextFile(importPath);
                            const toAdd = JSON.parse(content);
                            for (const node of toAdd.nodes) {
                                try {
                                    await $db.InsertNode({
                                        body: JSON.stringify(node),
                                    });
                                } catch (err) {
                                    console.log(err);
                                }
                            }
                            for (const edge of toAdd.edges) {
                                try {
                                    await $db.InsertEdge({
                                        source: edge.source,
                                        target: edge.target,
                                        properties: edge.properties,
                                    });
                                } catch (err) {
                                    console.log(err);
                                }
                            }
                            await Goto("/");
                        }
                        break;
                    case "todo":
                        await Goto("/todo", false);
                        break;
                    default:
                        break;
                }
            } catch (err) {
                console.log(err);
                // error(err);
            }
        });
        return unlisten;
    });
</script>

<slot />
