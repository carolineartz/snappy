import path from 'node:path';
import Database from 'better-sqlite3';
import { app } from 'electron';
import log from 'electron-log';
import {
  assignAutoTagColor,
  type HexColor,
  normalizeHex,
  type Tag,
  type TagColorSource,
  type TagName,
  type TagWithUsageCount,
} from '../shared/tag-colors';

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
  ocrText: string | null;
  classificationLabels: string | null;
  visualEmbedding: Buffer | null;
  lastOpenedAt: string | null;
  lastModifiedAt: string | null;
}

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'snap.db');
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
      thumbnailUpdatedAt TEXT DEFAULT NULL,
      ocrText    TEXT DEFAULT NULL,
      classificationLabels TEXT DEFAULT NULL,
      visualEmbedding BLOB DEFAULT NULL,
      lastOpenedAt TEXT DEFAULT NULL,
      lastModifiedAt TEXT DEFAULT NULL
    )
  `);

  // Migrations for existing databases
  const snapColumns = db.pragma('table_info(snaps)') as { name: string }[];
  const snapColumnNames = new Set(snapColumns.map((column) => column.name));

  if (!snapColumnNames.has('annotations')) {
    db.exec('ALTER TABLE snaps ADD COLUMN annotations TEXT DEFAULT NULL');
    log.info('Migrated: added annotations column');
  }

  if (!snapColumnNames.has('name')) {
    db.exec('ALTER TABLE snaps ADD COLUMN name TEXT DEFAULT NULL');
    log.info('Migrated: added name column');
  }

  if (!snapColumnNames.has('thumbnailUpdatedAt')) {
    db.exec(
      'ALTER TABLE snaps ADD COLUMN thumbnailUpdatedAt TEXT DEFAULT NULL',
    );
    log.info('Migrated: added thumbnailUpdatedAt column');
  }

  if (!snapColumnNames.has('ocrText')) {
    db.exec('ALTER TABLE snaps ADD COLUMN ocrText TEXT DEFAULT NULL');
    log.info('Migrated: added ocrText column');
  }

  if (!snapColumnNames.has('classificationLabels')) {
    db.exec(
      'ALTER TABLE snaps ADD COLUMN classificationLabels TEXT DEFAULT NULL',
    );
    log.info('Migrated: added classificationLabels column');
  }

  if (!snapColumnNames.has('visualEmbedding')) {
    db.exec('ALTER TABLE snaps ADD COLUMN visualEmbedding BLOB DEFAULT NULL');
    log.info('Migrated: added visualEmbedding column');
  }

  if (!snapColumnNames.has('lastOpenedAt')) {
    db.exec('ALTER TABLE snaps ADD COLUMN lastOpenedAt TEXT DEFAULT NULL');
    log.info('Migrated: added lastOpenedAt column');
  }

  if (!snapColumnNames.has('lastModifiedAt')) {
    db.exec('ALTER TABLE snaps ADD COLUMN lastModifiedAt TEXT DEFAULT NULL');
    log.info('Migrated: added lastModifiedAt column');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS snap_tags (
      snap_id  TEXT NOT NULL,
      tag      TEXT NOT NULL,
      PRIMARY KEY (snap_id, tag),
      FOREIGN KEY (snap_id) REFERENCES snaps(id) ON DELETE CASCADE
    )
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_snap_tags_tag ON snap_tags(tag)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      tag         TEXT PRIMARY KEY,
      color       TEXT DEFAULT NULL,
      colorSource TEXT DEFAULT NULL CHECK (colorSource IN ('auto', 'custom'))
    )
  `);

  const tagColumns = db.pragma('table_info(tags)') as { name: string }[];
  const tagColumnNames = new Set(tagColumns.map((column) => column.name));

  if (!tagColumnNames.has('color')) {
    db.exec('ALTER TABLE tags ADD COLUMN color TEXT DEFAULT NULL');
    log.info('Migrated: added color column to tags');
  }

  if (!tagColumnNames.has('colorSource')) {
    db.exec(
      "ALTER TABLE tags ADD COLUMN colorSource TEXT DEFAULT NULL CHECK (colorSource IN ('auto', 'custom'))",
    );
    log.info('Migrated: added colorSource column to tags');
  }

  log.info(`Database initialized at ${dbPath}`);
}

export function insertSnap(snap: SnapRecord): void {
  const statement = db.prepare(`
    INSERT INTO snaps (
      id,
      name,
      filePath,
      thumbPath,
      sourceApp,
      width,
      height,
      posX,
      posY,
      opacity,
      hasShadow,
      isOpen,
      createdAt,
      annotations,
      thumbnailUpdatedAt,
      ocrText,
      classificationLabels,
      visualEmbedding
    )
    VALUES (
      @id,
      @name,
      @filePath,
      @thumbPath,
      @sourceApp,
      @width,
      @height,
      @posX,
      @posY,
      @opacity,
      @hasShadow,
      @isOpen,
      @createdAt,
      @annotations,
      @thumbnailUpdatedAt,
      @ocrText,
      @classificationLabels,
      @visualEmbedding
    )
  `);

  statement.run(snap);
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
      | 'ocrText'
      | 'classificationLabels'
      | 'visualEmbedding'
      | 'lastOpenedAt'
      | 'lastModifiedAt'
    >
  >,
): void {
  const assignments: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const [fieldName, value] of Object.entries(fields)) {
    if (value !== undefined) {
      assignments.push(`${fieldName} = @${fieldName}`);
      values[fieldName] = value;
    }
  }

  if (assignments.length === 0) {
    return;
  }

  const statement = db.prepare(`
    UPDATE snaps
    SET ${assignments.join(', ')}
    WHERE id = @id
  `);

  statement.run(values);
}

export function getSnap(id: string): SnapRecord | undefined {
  const statement = db.prepare('SELECT * FROM snaps WHERE id = ?');
  return statement.get(id) as SnapRecord | undefined;
}

export function getAllSnaps(): SnapRecord[] {
  const statement = db.prepare('SELECT * FROM snaps ORDER BY createdAt DESC');
  return statement.all() as SnapRecord[];
}

export function deleteSnap(id: string): void {
  const statement = db.prepare('DELETE FROM snaps WHERE id = ?');
  statement.run(id);
}

export function getSnapsMissingVision(): SnapRecord[] {
  const statement = db.prepare(
    `SELECT * FROM snaps
     WHERE ocrText IS NULL
        OR classificationLabels IS NULL
        OR visualEmbedding IS NULL
     ORDER BY createdAt DESC`,
  );
  return statement.all() as SnapRecord[];
}

export function duplicateSnap(
  originalId: string,
  newId: string,
  newFilePath: string,
  newThumbPath: string,
): void {
  const statement = db.prepare(`
    INSERT INTO snaps (
      id,
      name,
      filePath,
      thumbPath,
      sourceApp,
      width,
      height,
      posX,
      posY,
      opacity,
      hasShadow,
      isOpen,
      createdAt,
      annotations,
      thumbnailUpdatedAt,
      ocrText,
      classificationLabels,
      visualEmbedding
    )
    SELECT
      @newId,
      name,
      @newFilePath,
      @newThumbPath,
      sourceApp,
      width,
      height,
      NULL,
      NULL,
      1.0,
      1,
      1,
      createdAt,
      annotations,
      thumbnailUpdatedAt,
      ocrText,
      classificationLabels,
      visualEmbedding
    FROM snaps
    WHERE id = @originalId
  `);

  statement.run({ originalId, newId, newFilePath, newThumbPath });
}

// --- Tag operations ---

export function getTag(name: TagName): Tag | undefined {
  const statement = db.prepare(`
    SELECT
      tag AS name,
      color,
      colorSource
    FROM tags
    WHERE tag = ?
  `);

  return statement.get(name) as Tag | undefined;
}

export function getAllTagMetadata(): Tag[] {
  const statement = db.prepare(`
    SELECT
      tag AS name,
      color,
      colorSource
    FROM tags
    ORDER BY tag
  `);

  return statement.all() as Tag[];
}

export function ensureTagExists(name: TagName): Tag {
  const existingTag = getTag(name);

  if (existingTag) {
    return existingTag;
  }

  const assignedColor = assignAutoTagColor(getAllTagMetadata());

  const statement = db.prepare(`
    INSERT INTO tags (tag, color, colorSource)
    VALUES (?, ?, ?)
  `);

  statement.run(name, assignedColor.baseColor, assignedColor.colorSource);

  return getTag(name)!;
}

export function getTagNamesForSnap(snapId: string): TagName[] {
  const statement = db.prepare(`
    SELECT tag
    FROM snap_tags
    WHERE snap_id = ?
    ORDER BY tag
  `);

  const rows = statement.all(snapId) as Array<{ tag: TagName }>;
  return rows.map((row) => row.tag);
}

export function addTagToSnap(snapId: string, tagName: TagName): void {
  ensureTagExists(tagName);

  const statement = db.prepare(`
    INSERT OR IGNORE INTO snap_tags (snap_id, tag)
    VALUES (?, ?)
  `);

  statement.run(snapId, tagName);
}

export function removeTagFromSnap(snapId: string, tagName: TagName): void {
  const statement = db.prepare(`
    DELETE FROM snap_tags
    WHERE snap_id = ? AND tag = ?
  `);

  statement.run(snapId, tagName);
}

export function getAllTagsWithUsageCount(): TagWithUsageCount[] {
  const statement = db.prepare(`
    SELECT
      st.tag AS name,
      COUNT(*) AS usageCount,
      t.color AS color,
      t.colorSource AS colorSource
    FROM snap_tags st
    LEFT JOIN tags t ON t.tag = st.tag
    GROUP BY st.tag
    ORDER BY st.tag
  `);

  return statement.all() as TagWithUsageCount[];
}

export function getSnapIdsForTag(tagName: TagName): string[] {
  const statement = db.prepare(`
    SELECT snap_id
    FROM snap_tags
    WHERE tag = ?
  `);

  const rows = statement.all(tagName) as Array<{ snap_id: string }>;
  return rows.map((row) => row.snap_id);
}

export function updateTagColor(
  tagName: TagName,
  color: HexColor,
  colorSource: TagColorSource = 'custom',
): void {
  const normalizedColor = normalizeHex(color);

  const statement = db.prepare(`
    UPDATE tags
    SET color = ?, colorSource = ?
    WHERE tag = ?
  `);

  statement.run(normalizedColor, colorSource, tagName);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    log.info('Database closed');
  }
}
