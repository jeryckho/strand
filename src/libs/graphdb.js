import Database from "tauri-plugin-sql-api";

const Schema = `CREATE TABLE IF NOT EXISTS nodes (
    project TEXT,
    body TEXT,
    alt  TEXT DEFAULT '{}',
    id   TEXT GENERATED ALWAYS AS (json_extract(body, '$.name')) NOT NULL,
    cle  TEXT GENERATED ALWAYS AS (concat(project,':', id)) UNIQUE
);
CREATE INDEX IF NOT EXISTS id_idx ON nodes(project, id);

CREATE TABLE IF NOT EXISTS edges (
    project    TEXT,
    source     TEXT,
    target     TEXT,
    properties TEXT,
    UNIQUE(project, source, target) ON CONFLICT REPLACE
);
CREATE INDEX IF NOT EXISTS source_idx ON edges(project, source);
CREATE INDEX IF NOT EXISTS target_idx ON edges(project, target);`

const Specific = "";

const jFrom = (JsOStr) => JsOStr ? (typeof JsOStr === "string" ? JsOStr : JSON.stringify(JsOStr)) : undefined;
const Query = ( /** @type {string} */ k, /** @type {string} */ s, o = {s:[], p: []} ) => {
    if (k) {
        o.s.push(s);
        o.p.push(k);
    }
    return o;
}

export class GraphDb {
    constructor({ path = "test.db", project = "default" } = {}) {
        this.conf = { path };
        this.project = project;
        this.db = null;
    }

    isOn() { return this.db ? true : false; }

    setProject(project="default") {
        this.project = project;
    }

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
            return await this.db.select("SELECT * FROM edges WHERE project = ?", [this.project])
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
                "SELECT * FROM edges WHERE (source LIKE ? OR target LIKE ?) AND project = ?",
                [edge, edge, this.project]
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
                return await this.db.select("SELECT * FROM edges WHERE (source = ? AND target = ?) AND project = ?", [source, target, this.project])
            else if (source)
                return await this.db.select("SELECT * FROM edges WHERE source = ? AND project = ?", [source, this.project])
            else if (target)
                return await this.db.select("SELECT * FROM edges WHERE target = ? AND project = ?", [target, this.project])
            else throw "Can't select";
        } else throw "Can't select";
    }

    /**
     * InsertEdge
     * Insert particular edge
     * @param {{ source:string, target:string, properties:string|any }} data
    */
    async InsertEdge({ source, target, properties }) {
        const json = jFrom(properties);
        if (this.db && source && target && json)
            await this.db.execute(
                "INSERT INTO edges (project, source, target, properties) VALUES(?, ?, ?, json(?))",
                [this.project, source, target, json]
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
                "DELETE FROM edges WHERE source = ? AND target = ? AND project = ?",
                [source, target, this.project]
            );
        else throw "Can't execute";
    }

    /**
     * DeleteLinkedEdges
     * Delete particular edge
     * @param {{ id:string }} data
    */
    async DeleteLinkedEdges({ id }) {
        if (this.db && id)
            await this.db.execute(
                "DELETE FROM edges WHERE (source = ? OR target = ?) AND project = ?",
                [id, id, this.project]
            );
        else throw "Can't execute";
    }

    /**
     * DeleteAllEdges
     * Delete every edge
    */
    async DeleteAllEdges() {
        if (this.db)
            await this.db.execute("DELETE FROM edges WHERE project = ?", [this.project]);
        else throw "Can't execute";
    }

    /**
     * AllNodes
     * Find every node
     * @returns {Promise<{id:string, body:string, alt?:string}[]>}
    */
    async AllNodes() {
        if (this.db)
            return await this.db.select("SELECT * FROM nodes WHERE project = ?", [this.project])
        else throw "Can't select"
    }

    /**
     * FindNode
     * Find particular node
     * @param {{ id:string }} data
     * @returns {Promise<{id:string, body:string, alt?:string}[]>}
    */
    async FindNode({ id }) {
        if (this.db && id)
            return await this.db.select("SELECT * FROM nodes WHERE id LIKE ? AND project = ?", [id, this.project])
        else throw "Can't select"
    }

    /**
     * InsertNode
     * Insert particular node
     * @param {{ body:string|any, alt?:string|any }} data
    */
    async InsertNode({ body, alt }) {
        const json = jFrom(body);
        const sAlt = jFrom(alt);
        if (this.db && json)
            sAlt ? await this.db.execute("INSERT INTO nodes (project, body, alt) VALUES(?, json(?), ?)", [this.project, json, sAlt])
                : await this.db.execute("INSERT INTO nodes (project, body) VALUES(?, json(?))", [this.project, json]);
        else throw "Can't execute"
    }

    /**
     * UpdateNode
     * Update particular node
     * @param {{ id:string, body?:string|any, alt?:string|any }} data
    */
    async UpdateNode({ id, body, alt }) {
        const json = jFrom(body);
        const sAlt = jFrom(alt);
        if (this.db && id && (json || sAlt)) {
            let Q = {s:[], p:[]};
            if (json) Q = Query(json, "body = json(?)", Q);
            if (sAlt) Q = Query(sAlt, "alt = ?", Q);
            Q.p.push(id);
            Q.p.push(this.project);
            await this.db.execute(`UPDATE nodes SET ${Q.s.join(", ")} WHERE id = ? AND project = ?`, Q.p);
        } else throw "Can't execute"
    }

    /**
     * DeleteNode
     * Delete particular node
     * @param {{ id:string }} data
    */
    async DeleteNode({ id }) {
        if (this.db && id)
            await this.db.execute(
                "DELETE FROM nodes WHERE id = ? AND project = ?",
                [id, this.project]
            )
        else throw "Can't execute"
    }

    /**
     * DeleteAllNodes
     * Delete every node
    */
    async DeleteAllNodes() {
        if (this.db)
            await this.db.execute("DELETE FROM nodes WHERE project = ?",
                [this.project])
        else throw "Can't execute"
    }
}
