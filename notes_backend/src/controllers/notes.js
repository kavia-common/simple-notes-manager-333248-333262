'use strict';

/**
 * Notes controller.
 * Maps HTTP requests to the notes service and formats JSON responses.
 */

const notesService = require('../services/notes');

class NotesController {
  /**
   * GET /notes
   * Return all notes.
   */
  // PUBLIC_INTERFACE
  list(req, res) {
    try {
      const notes = notesService.getAllNotes();
      return res.status(200).json({ data: notes });
    } catch (err) {
      console.error('[NotesController.list]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to retrieve notes' });
    }
  }

  /**
   * GET /notes/search?q=...&tags=tag1,tag2
   * Search notes by text and/or tags.
   */
  // PUBLIC_INTERFACE
  search(req, res) {
    try {
      const query = (req.query.q || '').trim();
      const tagParam = req.query.tags || '';
      const tagNames = tagParam ? tagParam.split(',').map(t => t.trim()).filter(Boolean) : [];

      const notes = notesService.searchNotes(query, tagNames);
      return res.status(200).json({ data: notes });
    } catch (err) {
      console.error('[NotesController.search]', err);
      return res.status(500).json({ status: 'error', message: 'Search failed' });
    }
  }

  /**
   * GET /notes/:id
   * Return a single note by ID.
   */
  // PUBLIC_INTERFACE
  get(req, res) {
    try {
      const note = notesService.getNoteById(req.params.id);
      if (!note) {
        return res.status(404).json({ status: 'error', message: 'Note not found' });
      }
      return res.status(200).json({ data: note });
    } catch (err) {
      console.error('[NotesController.get]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to retrieve note' });
    }
  }

  /**
   * POST /notes
   * Create a new note.
   */
  // PUBLIC_INTERFACE
  create(req, res) {
    try {
      const { title, content, tags } = req.body || {};
      if (!title && !content) {
        return res.status(400).json({ status: 'error', message: 'title or content is required' });
      }
      const note = notesService.createNote(title, content, Array.isArray(tags) ? tags : []);
      return res.status(201).json({ data: note });
    } catch (err) {
      console.error('[NotesController.create]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to create note' });
    }
  }

  /**
   * PUT /notes/:id
   * Replace a note (full update).
   */
  // PUBLIC_INTERFACE
  update(req, res) {
    try {
      const { title, content, tags } = req.body || {};
      const note = notesService.updateNote(
        req.params.id,
        title,
        content,
        Array.isArray(tags) ? tags : undefined
      );
      if (!note) {
        return res.status(404).json({ status: 'error', message: 'Note not found' });
      }
      return res.status(200).json({ data: note });
    } catch (err) {
      console.error('[NotesController.update]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to update note' });
    }
  }

  /**
   * PATCH /notes/:id
   * Partially update a note.
   */
  // PUBLIC_INTERFACE
  patch(req, res) {
    return this.update(req, res);
  }

  /**
   * DELETE /notes/:id
   * Delete a note.
   */
  // PUBLIC_INTERFACE
  remove(req, res) {
    try {
      const deleted = notesService.deleteNote(req.params.id);
      if (!deleted) {
        return res.status(404).json({ status: 'error', message: 'Note not found' });
      }
      return res.status(200).json({ status: 'ok', message: 'Note deleted' });
    } catch (err) {
      console.error('[NotesController.remove]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to delete note' });
    }
  }
}

module.exports = new NotesController();
