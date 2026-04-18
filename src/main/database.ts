import path from 'node:path';
import Database from 'better-sqlite3';
import { app } from 'electron';
import log from 'electron-log';

let db: Database.Database;

export interface SnapRecord {
  id: string;
  name: string | null;
  filePath: string;
  thumbPath: string;
  sourceApp: string | null;
  width: number;
  height: number;
  posX: number | null;
  posY: number | null;
  opacity: number;
  hasShadow: number;
  isOpen: number;
  createdAt: string;
  annotations: string | null;
  thumbnailUpdatedAt: string | null;
}

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'snappy.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS snaps (
      id         TEXT PRIMARY KEY,
      name       TEXT DEFAULT NULL,
      filePath   TEXT NOT NULL,
      thumbPath  TEXT NOT NULL,
      sourceApp  TEXT,
      width      INTEGER NOT NULL,
      height     INTEGER NOT NULL,
      posX       INTEGER,
      posY       INTEGER,
      opacity    REAL DEFAULT 1.0,
      hasShadow  INTEGER DEFAULT 1,
      isOpen     INTEGER DEFAULT 1,
      createdAt  TEXT NOT NULL,
      annotations TEXT DEFAULT NULL,
      thumbnailUpdatedAt TEXT DEFAULT NULL
    )
  `);

  // Migrations for existing databases
  const columns = db.pragma('table_info(snaps)') as { name: string }[];
  const columnNames = new Set(columns.map((col) => col.name));

  if (!columnNames.has('annotations')) {
    db.exec('ALTER TABLE snaps ADD COLUMN annotations TEXT DEFAULT NULL');
    log.info('Migrated: added annotations column');
  }
  if (!columnNames.has('name')) {
    db.exec('ALTER TABLE snaps ADD COLUMN name TEXT DEFAULT NULL');
    log.info('Migrated: added name column');
  }
  if (!columnNames.has('thumbnailUpdatedAt')) {
    db.exec(
      'ALTER TABLE snaps ADD COLUMN thumbnailUpdatedAt TEXT DEFAULT NULL',
    );
    log.info('Migrated: added thumbnailUpdatedAt column');
  }

  // Tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS snap_tags (
      snap_id  TEXT NOT NULL,
      tag      TEXT NOT NULL,
      PRIMARY KEY (snap_id, tag),
      FOREIGN KEY (snap_id) REFERENCES snaps(id) ON DELETE CASCADE
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_snap_tags_tag ON snap_tags(tag)');

  log.info(`Database initialized at ${dbPath}`);
}

export function insertSnap(snap: SnapRecord): void {
  const stmt = db.prepare(`
    INSERT INTO snaps (id, name, filePath, thumbPath, sourceApp, width, height, posX, posY, opacity, hasShadow, isOpen, createdAt, annotations, thumbnailUpdatedAt)
    VALUES (@id, @name, @filePath, @thumbPath, @sourceApp, @width, @height, @posX, @posY, @opacity, @hasShadow, @isOpen, @createdAt, @annotations, @thumbnailUpdatedAt)
  `);
  stmt.run(snap);
}

export function updateSnap(
  id: string,
  fields: Partial<
    Pick<
      SnapRecord,
      | 'name'
      | 'posX'
      | 'posY'
      | 'opacity'
      | 'hasShadow'
      | 'isOpen'
      | 'annotations'
      | 'thumbnailUpdatedAt'
    >
  >,
): void {
  const sets: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${key} = @${key}`);
      values[key] = value;
    }
  }

  if (sets.length === 0) return;

  const stmt = db.prepare(`UPDATE snaps SET ${sets.join(', ')} WHERE id = @id`);
  stmt.run(values);
}

export function getSnap(id: string): SnapRecord | undefined {
  const stmt = db.prepare('SELECT * FROM snaps WHERE id = ?');
  return stmt.get(id) as SnapRecord | undefined;
}

export function getAllSnaps(): SnapRecord[] {
  const stmt = db.prepare('SELECT * FROM snaps ORDER BY createdAt DESC');
  return stmt.all() as SnapRecord[];
}

export function deleteSnap(id: string): void {
  const stmt = db.prepare('DELETE FROM snaps WHERE id = ?');
  stmt.run(id);
}

export function duplicateSnap(
  originalId: string,
  newId: string,
  newFilePath: string,
  newThumbPath: string,
): void {
  const stmt = db.prepare(`
    INSERT INTO snaps (id, name, filePath, thumbPath, sourceApp, width, height, posX, posY, opacity, hasShadow, isOpen, createdAt, annotations, thumbnailUpdatedAt)
    SELECT @newId, name, @newFilePath, @newThumbPath, sourceApp, width, height, NULL, NULL, 1.0, 1, 1, createdAt, annotations, thumbnailUpdatedAt
    FROM snaps WHERE id = @originalId
  `);
  stmt.run({ originalId, newId, newFilePath, newThumbPath });
}

// --- Tag operations ---

export function getTagsForSnap(snapId: string): string[] {
  const stmt = db.prepare('SELECT tag FROM snap_tags WHERE snap_id = ?');
  const rows = stmt.all(snapId) as { tag: string }[];
  return rows.map((r) => r.tag);
}

export function addTagToSnap(snapId: string, tag: string): void {
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO snap_tags (snap_id, tag) VALUES (?, ?)',
  );
  stmt.run(snapId, tag);
}

export function removeTagFromSnap(snapId: string, tag: string): void {
  const stmt = db.prepare(
    'DELETE FROM snap_tags WHERE snap_id = ? AND tag = ?',
  );
  stmt.run(snapId, tag);
}

export function getAllTags(): { tag: string; count: number }[] {
  const stmt = db.prepare(
    'SELECT tag, COUNT(*) as count FROM snap_tags GROUP BY tag ORDER BY tag',
  );
  return stmt.all() as { tag: string; count: number }[];
}

export function getSnapsWithTag(tag: string): string[] {
  const stmt = db.prepare('SELECT snap_id FROM snap_tags WHERE tag = ?');
  const rows = stmt.all(tag) as { snap_id: string }[];
  return rows.map((r) => r.snap_id);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    log.info('Database closed');
  }
}
