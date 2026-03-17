'use strict';

/**
 * Tags controller.
 * Maps HTTP requests to the tags service and formats JSON responses.
 */

const tagsService = require('../services/tags');

class TagsController {
  /**
   * GET /tags
   * Return all tags.
   */
  // PUBLIC_INTERFACE
  list(req, res) {
    try {
      const tags = tagsService.getAllTags();
      return res.status(200).json({ data: tags });
    } catch (err) {
      console.error('[TagsController.list]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to retrieve tags' });
    }
  }

  /**
   * GET /tags/:id
   * Return a single tag by ID.
   */
  // PUBLIC_INTERFACE
  get(req, res) {
    try {
      const tag = tagsService.getTagById(req.params.id);
      if (!tag) {
        return res.status(404).json({ status: 'error', message: 'Tag not found' });
      }
      return res.status(200).json({ data: tag });
    } catch (err) {
      console.error('[TagsController.get]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to retrieve tag' });
    }
  }

  /**
   * POST /tags
   * Create a new tag.
   */
  // PUBLIC_INTERFACE
  create(req, res) {
    try {
      const { name } = req.body || {};
      if (!name || !name.trim()) {
        return res.status(400).json({ status: 'error', message: 'name is required' });
      }
      const tag = tagsService.createTag(name);
      return res.status(201).json({ data: tag });
    } catch (err) {
      if (err.code === 'DUPLICATE_TAG') {
        return res.status(409).json({ status: 'error', message: err.message });
      }
      console.error('[TagsController.create]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to create tag' });
    }
  }

  /**
   * DELETE /tags/:id
   * Delete a tag and its note associations.
   */
  // PUBLIC_INTERFACE
  remove(req, res) {
    try {
      const deleted = tagsService.deleteTag(req.params.id);
      if (!deleted) {
        return res.status(404).json({ status: 'error', message: 'Tag not found' });
      }
      return res.status(200).json({ status: 'ok', message: 'Tag deleted' });
    } catch (err) {
      console.error('[TagsController.remove]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to delete tag' });
    }
  }

  /**
   * GET /tags/:id/notes
   * Return all notes associated with a tag.
   */
  // PUBLIC_INTERFACE
  getNotes(req, res) {
    try {
      const tag = tagsService.getTagById(req.params.id);
      if (!tag) {
        return res.status(404).json({ status: 'error', message: 'Tag not found' });
      }
      const notes = tagsService.getNotesByTagId(req.params.id);
      return res.status(200).json({ data: notes });
    } catch (err) {
      console.error('[TagsController.getNotes]', err);
      return res.status(500).json({ status: 'error', message: 'Failed to retrieve notes for tag' });
    }
  }
}

module.exports = new TagsController();
