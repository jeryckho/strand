<script>
    import { db } from "$lib/store";
    
    const setPrj = async (/** @type {any} */ { target }) => {
        const formData = new FormData(target);
        let /** @type {any} */ frm = {};
        for (let [key, value] of formData) {
            frm[key] = value;
        }
        target.reset();
        if (frm.name != "") {
            try {
                await $db.setProject(frm.name);
            } catch (/** @type {any} */ err) {
                console.log(err)
            }
        }
    };
</script>

<div class="columns">
    <div class="column is-full content">
        <nav class="panel">
            <p class="panel-heading">Projects</p>
            <div class="panel-block content">
				<form
					method="post"
					action="/set/prj"
					autocomplete="off"
					on:submit|preventDefault={setPrj}
				>
					<div class="field has-addons">
						<div class="control">
							<input
								class="input"
								type="text"
								autocomplete="off"
								placeholder="Project name"
								name="name"
								value=""
							/>
						</div>
						<div class="control">
							<button class="button is-info" type="submit">
								Set
							</button>
						</div>
					</div>
				</form>
            </div>
        </nav>
        <a href="/" class="button">Bck</a>
    </div>
</div>
