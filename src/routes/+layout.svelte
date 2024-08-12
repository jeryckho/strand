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

    // @ts-ignore
    onMount(async () => {
        appWindow.setTitle(`Strand (${$File})`)
        const unlisten = await listen("backend", async (event) => {
            try {
                if (event.payload.message === "open") {
                    const filePath = await open({ multiple: false });
                    if (filePath) {
                        db.set(await $db.load(filePath));
                        File.set(filePath);
                        appWindow.setTitle(`Strand (${$File})`)
                        await goto("/waiting");
                        await goto("/");
                    }
                } else if (event.payload.message === "new") {
                    const filePath = await save();
                    if (filePath) {
                        db.set(await $db.load(filePath));
                        File.set(filePath);
                        appWindow.setTitle(`Strand (${$File})`)
                        await goto("/waiting");
                        await goto("/");
                    }
                } else if (event.payload.message === "clean") {
                    const confirm = await ask("Are you sure ?", {
                        title: "Strand",
                        type: "warning",
                    });
                    if (confirm) {
                        await $db.DeleteAllEdges();
                        await $db.DeleteAllNodes();
                        await goto("/waiting");
                        await goto("/");
                    }
                } else if (event.payload.message === "export") {
                    console.log("before");
                    const nodes = await $db.AllNodes();
                    const edges = await $db.AllEdge();
                    console.log("after");
                    const content = JSON.stringify({
                        nodes: nodes.map(({ body }) => JSON.parse(body)),
                        edges: edges.map(({ source, target, properties }) => ({
                            source,
                            target,
                            properties: JSON.parse(properties),
                        })),
                    });
                    console.log("save");
                    const filePath = await save({
                        filters: [
                            {
                                name: "Json",
                                extensions: ["json"],
                            },
                        ],
                    });
                    if (filePath) {
                        // const fPath = await resolveResource(filePath);
                        // const fName = await basename(filePath);
                        await writeTextFile(filePath, content);
                        await goto("/waiting");
                        await goto("/");
                    }
                } else if (event.payload.message === "import") {
                    const filePath = await open({
                        multiple: false,
                        filters: [
                            {
                                name: "Json",
                                extensions: ["json"],
                            },
                        ],
                    });
                    if (filePath) {
                        // @ts-ignore
                        const content = await readTextFile(filePath);
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
                                }); //$db.execute(InsertEdge, [edge.source, edge.target, JSON.stringify(edge.properties)]);
                            } catch (err) {
                                console.log(err);
                            }
                        }
                        await goto("/waiting");
                        await goto("/");
                    }
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
