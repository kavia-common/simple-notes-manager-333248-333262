'use strict';

/**
 * Main router.
 * Aggregates all sub-routers and exposes the health check endpoint.
 */

const express = require('express');
const healthController = require('../controllers/health');
const notesRouter = require('./notes');
const tagsRouter  = require('./tags');

const router = express.Router();

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/', healthController.check.bind(healthController));

// ---------------------------------------------------------------------------
// Feature routers
// ---------------------------------------------------------------------------
router.use('/notes', notesRouter);
router.use('/tags',  tagsRouter);

module.exports = router;
