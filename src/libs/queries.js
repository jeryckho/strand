export const Schema = 
`CREATE TABLE IF NOT EXISTS nodes (
	body TEXT,
	id   TEXT GENERATED ALWAYS AS (json_extract(body, '$.name')) VIRTUAL NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS id_idx ON nodes(id);

CREATE TABLE IF NOT EXISTS edges (
	source     TEXT,
	target     TEXT,
	properties TEXT,
	UNIQUE(source, target) ON CONFLICT REPLACE,
	FOREIGN KEY(source) REFERENCES nodes(id) ON UPDATE CASCADE ON DELETE CASCADE,
	FOREIGN KEY(target) REFERENCES nodes(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS source_idx ON edges(source);
CREATE INDEX IF NOT EXISTS target_idx ON edges(target);`;

export const AllEdges = "SELECT * FROM edges";

export const FindNearEdges = "SELECT * FROM edges WHERE source LIKE ? OR target LIKE ?";

export const FindEdge = "SELECT * FROM edges WHERE source = ? AND target = ?";

export const InsertEdge = "INSERT INTO edges VALUES(?, ?, json(?))";

export const DeleteEdge  = "DELETE FROM edges WHERE source = ? AND target = ?";

export const DeleteAllEdges = "DELETE FROM edges";

export const AllNodes = "SELECT * FROM nodes";

export const FindNode = "SELECT id, body FROM nodes WHERE id LIKE ?";

export const InsertNode = "INSERT INTO nodes VALUES(json(?))";

export const UpdateNode = "UPDATE nodes SET body = json(?) WHERE id = ?";

export const DeleteNode = "DELETE FROM nodes WHERE id = ?";

export const DeleteAllNodes = "DELETE FROM nodes";