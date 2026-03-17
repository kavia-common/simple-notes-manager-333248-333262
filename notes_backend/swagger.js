'use strict';

/**
 * Swagger / OpenAPI specification generator.
 * Uses swagger-jsdoc to build the spec from JSDoc comments in the route files.
 */

const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Simple Notes Manager API',
      version: '1.0.0',
      description:
        'RESTful API for creating, editing, deleting, listing, and searching notes with tag support.',
    },
    tags: [
      { name: 'Health', description: 'Service health check' },
      { name: 'Notes',  description: 'Note management endpoints' },
      { name: 'Tags',   description: 'Tag management endpoints' },
    ],
  },
  // Scan all route files for @swagger JSDoc comments
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
