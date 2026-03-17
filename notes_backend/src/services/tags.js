'use strict';

/**
 * Tags service module.
 * Encapsulates all database operations for tags.
 */

const { getDb } = require('./db');

/**
 * Fetch all tags ordered by name.
 *
 * @returns {Array<Object>} Array of tag objects ({ id, name, createdAt }).
 */
// PUBLIC_INTERFACE
function getAllTags() {
  const db = getDb();
  return db.prepare('SELECT id, name, created_at FROM tags ORDER BY name ASC')
    .all()
    .map(normalizeTag);
}

/**
 * Fetch a single tag by its ID.
 *
 * @param {number|string} id - The tag ID.
 * @returns {Object|null} Tag object, or null if not found.
 */
// PUBLIC_INTERFACE
function getTagById(id) {
  const db = getDb();
  const row = db.prepare('SELECT id, name, created_at FROM tags WHERE id = ?').get(Number(id));
  return row ? normalizeTag(row) : null;
}

/**
 * Create a new tag.
 *
 * @param {string} name - The unique tag name.
 * @returns {Object} The newly created tag.
 * @throws {Error} If the tag name already exists.
 */
// PUBLIC_INTERFACE
function createTag(name) {
  const db = getDb();
  try {
    const info = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name.trim());
    return getTagById(info.lastInsertRowid);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      const conflict = new Error(`Tag '${name}' already exists`);
      conflict.code = 'DUPLICATE_TAG';
      throw conflict;
    }
    throw err;
  }
}

/**
 * Delete a tag by ID.  Cascades – removes all note_tags associations.
 *
 * @param {number|string} id - The tag ID to delete.
 * @returns {boolean} True if a row was deleted, false if not found.
 */
// PUBLIC_INTERFACE
function deleteTag(id) {
  const db = getDb();
  const info = db.prepare('DELETE FROM tags WHERE id = ?').run(Number(id));
  return info.changes > 0;
}

/**
 * Fetch all notes that have the specified tag.
 *
 * @param {number|string} id - Tag ID.
 * @returns {Array<Object>} Array of note objects associated with this tag.
 */
// PUBLIC_INTERFACE
function getNotesByTagId(id) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      n.id,
      n.title,
      n.content,
      n.created_at,
      n.updated_at,
      GROUP_CONCAT(t2.name, ',') AS tags
    FROM notes n
    JOIN note_tags nt  ON nt.note_id = n.id
    JOIN tags t        ON t.id = nt.tag_id AND t.id = ?
    LEFT JOIN note_tags nt2 ON nt2.note_id = n.id
    LEFT JOIN tags t2       ON t2.id = nt2.tag_id
    GROUP BY n.id
    ORDER BY n.updated_at DESC
  `).all(Number(id));
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a raw DB tag row into a clean tag object.
 *
 * @param {Object} row - Raw SQLite row.
 * @returns {Object} Normalized tag.
 */
function normalizeTag(row) {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

module.exports = { getAllTags, getTagById, createTag, deleteTag, getNotesByTagId };
