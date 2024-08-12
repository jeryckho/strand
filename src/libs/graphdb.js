import Database from "tauri-plugin-sql-api";

const Schema = `CREATE TABLE IF NOT EXISTS nodes (
	body TEXT,
	id   TEXT GENERATED ALWAYS AS (json_extract(body, '$.name')) VIRTUAL NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS id_idx ON nodes(id);

CREATE TABLE IF NOT EXISTS edges (
	source     TEXT,
	target     TEXT,
	properties TEXT,
	UNIQUE(source, target) ON CONFLICT REPLACE,
	FOREIGN KEY(source) REFERENCES nodes(id) ON DELETE CASCADE ON UPDATE CASCADE,
	FOREIGN KEY(target) REFERENCES nodes(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS source_idx ON edges(source);
CREATE INDEX IF NOT EXISTS target_idx ON edges(target);`

const Specific = "";

export class GraphDb {
    constructor({ path = "test.db" } = {}) {
        this.conf = { path };
        this.db = null;
    }

    isOn() { return this.db ? true : false; }

    async close() { if (this.db) await this.db.close(); }

    /**
     * load
     * Open and init a db
     * @param {string|undefined} path
     * @returns {Promise<GraphDb>}
    */
    async load(path) {
        await this.close();
        if (path) this.conf.path = path;
        this.db = await Database.load(`sqlite:${this.conf.path}`);
        await this.db.execute(Schema + Specific);
        return this;
    }

    /**
     * AllEdge
     * Find every edge
     * @returns {Promise<{source:string, target:string, properties:string}[]>}
    */
    async AllEdge() {
        if (this.db)
            return await this.db.select("SELECT * FROM edges")
        else throw "Can't select"
    }

    /**
     * FindNearEdge
     * Find every occurrence of an edge
     * @param {{ edge:string }} data
     * @returns {Promise<{source:string, target:string, properties:string}[]>}
    */
    async FindNearEdge({ edge }) {
        if (this.db && edge)
            return await this.db.select(
                "SELECT * FROM edges WHERE source LIKE ? OR target LIKE ?",
                [edge, edge]
            )
        else throw "Can't select";
    }

    /**
     * FindEdge
     * Find particular edge
     * @param {{ source?:string|undefined, target?:string|undefined }} data
     * @returns {Promise<{source:string, target:string, properties:string}[]>}
    */
    async FindEdge({ source, target }) {
        if (this.db) {
            if (source && target)
                return await this.db.select("SELECT * FROM edges WHERE source = ? AND target = ?", [source, target])
            else if (source)
                return await this.db.select("SELECT * FROM edges WHERE source = ?", [source])
            else if (target)
                return await this.db.select("SELECT * FROM edges WHERE target = ?", [target])
            else throw "Can't select";
        } else throw "Can't select";
    }

    /**
     * InsertEdge
     * Insert particular edge
     * @param {{ source:string, target:string, properties:string|any }} data
    */
    async InsertEdge({ source, target, properties }) {
        const json = (typeof properties === "string") ? properties : JSON.stringify(properties);
        if (this.db && source && target && json)
            await this.db.execute(
                "INSERT INTO edges VALUES(?, ?, json(?))",
                [source, target, json]
            );
        else throw "Can't execute";
    }

    /**
     * DeleteEdge
     * Delete particular edge
     * @param {{ source:string, target:string }} data
    */
    async DeleteEdge({ source, target }) {
        if (this.db && source && target)
            await this.db.execute(
                "DELETE FROM edges WHERE source = ? AND target = ?",
                [source, target]
            );
        else throw "Can't execute";
    }

    /**
     * DeleteAllEdges
     * Delete every edge
    */
    async DeleteAllEdges() {
        if (this.db)
            await this.db.execute("DELETE FROM edges");
        else throw "Can't execute";
    }

    /**
     * AllNodes
     * Find every node
     * @returns {Promise<{id:string, body:string}[]>}
    */
    async AllNodes() {
        if (this.db)
            return await this.db.select("SELECT * FROM nodes")
        else throw "Can't select"
    }

    /**
     * FindNode
     * Find particular node
     * @param {{ id:string }} data
     * @returns {Promise<{id:string, body:string}[]>}
    */
    async FindNode({ id }) {
        if (this.db && id)
            return await this.db.select("SELECT id, body FROM nodes WHERE id LIKE ?", [id])
        else throw "Can't select"
    }

    /**
     * InsertNode
     * Insert particular node
     * @param {{ body:string|any }} data
    */
    async InsertNode({ body }) {
        const json = (typeof body === "string") ? body : JSON.stringify(body);
        if (this.db && json)
            await this.db.execute(
                "INSERT INTO nodes VALUES(json(?))",
                [json]
            )
        else throw "Can't execute"
    }

    /**
     * UpdateNode
     * Update particular node
     * @param {{ id:string, body:string|any }} data
    */
    async UpdateNode({ id, body }) {
        const json = (typeof body === "string") ? body : JSON.stringify(body);
        if (this.db && id && json)
            await this.db.execute(
                "UPDATE nodes SET body = json(?) WHERE id = ?",
                [json, id]
            )
        else throw "Can't execute"
    }

    /**
     * DeleteNode
     * Delete particular node
     * @param {{ id:string }} data
    */
    async DeleteNode({ id }) {
        if (this.db && id)
            await this.db.execute(
                "DELETE FROM nodes WHERE id = ?",
                [id]
            )
        else throw "Can't execute"
    }

    /**
     * DeleteAllNodes
     * Delete every node
    */
    async DeleteAllNodes() {
        if (this.db)
            await this.db.execute("DELETE FROM nodes")
        else throw "Can't execute"
    }
}
