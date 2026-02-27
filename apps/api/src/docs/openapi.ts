export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Eli CMS API',
    version: '0.1.0',
    description: 'Headless CMS with dynamic Custom Post Types stored as JSON — zero migration per new content type.',
  },
  servers: [{ url: 'http://localhost:8080', description: 'Local development' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object' as const,
        properties: {
          success: { type: 'boolean' as const },
          data: {},
          error: { type: 'string' as const },
          meta: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
      PaginationMeta: {
        type: 'object' as const,
        properties: {
          page: { type: 'integer' as const },
          limit: { type: 'integer' as const },
          total: { type: 'integer' as const },
          totalPages: { type: 'integer' as const },
        },
      },
      User: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          email: { type: 'string' as const, format: 'email' },
          role: { type: 'string' as const, enum: ['admin', 'editor'] },
          createdAt: { type: 'string' as const, format: 'date-time' },
          updatedAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      TokenPair: {
        type: 'object' as const,
        properties: {
          accessToken: { type: 'string' as const },
          refreshToken: { type: 'string' as const },
        },
      },
      FieldDefinition: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
          type: { type: 'string' as const, enum: ['text', 'textarea', 'number', 'boolean', 'date', 'email', 'url', 'select'] },
          required: { type: 'boolean' as const },
          label: { type: 'string' as const },
          options: { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['name', 'type', 'required', 'label'],
      },
      ContentType: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          slug: { type: 'string' as const },
          name: { type: 'string' as const },
          fields: { type: 'array' as const, items: { $ref: '#/components/schemas/FieldDefinition' } },
          createdAt: { type: 'string' as const, format: 'date-time' },
          updatedAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      Content: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          contentTypeId: { type: 'string' as const, format: 'uuid' },
          status: { type: 'string' as const, enum: ['draft', 'published'] },
          data: { type: 'object' as const },
          createdAt: { type: 'string' as const, format: 'date-time' },
          updatedAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      ContentRelation: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          sourceId: { type: 'string' as const, format: 'uuid' },
          targetId: { type: 'string' as const, format: 'uuid' },
          relationType: { type: 'string' as const, enum: ['reference', 'parent', 'related'] },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      ContentVersion: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          contentId: { type: 'string' as const, format: 'uuid' },
          versionNumber: { type: 'integer' as const },
          data: { type: 'object' as const },
          status: { type: 'string' as const },
          editedBy: { type: 'string' as const, format: 'uuid' },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      Media: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          filename: { type: 'string' as const },
          originalName: { type: 'string' as const },
          mimeType: { type: 'string' as const },
          size: { type: 'integer' as const },
          storageKey: { type: 'string' as const },
          storageType: { type: 'string' as const, enum: ['local', 's3'] },
          createdBy: { type: 'string' as const, format: 'uuid' },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      StorageConfig: {
        type: 'object' as const,
        properties: {
          activeStorage: { type: 'string' as const, enum: ['local', 's3'] },
          s3: {
            type: 'object' as const,
            properties: {
              bucket: { type: 'string' as const },
              region: { type: 'string' as const },
              accessKeyId: { type: 'string' as const },
              secretAccessKey: { type: 'string' as const },
              endpoint: { type: 'string' as const },
            },
          },
        },
      },
    },
  },
  paths: {
    // ── Auth ──────────────────────────────────────────────
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, required: ['email', 'password'], properties: { email: { type: 'string' as const, format: 'email' }, password: { type: 'string' as const, minLength: 6 }, role: { type: 'string' as const, enum: ['admin', 'editor'], default: 'editor' } } } } },
        },
        responses: { '201': { description: 'User registered' }, '400': { description: 'Validation error' }, '409': { description: 'Email already exists' } },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive tokens',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, required: ['email', 'password'], properties: { email: { type: 'string' as const }, password: { type: 'string' as const } } } } },
        },
        responses: { '200': { description: 'Token pair returned' }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          content: { 'application/json': { schema: { type: 'object' as const, properties: { refreshToken: { type: 'string' as const } } } } },
        },
        responses: { '200': { description: 'New token pair' }, '401': { description: 'Invalid refresh token' } },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout current session',
        security: [{ bearerAuth: [] }],
        responses: { '204': { description: 'Logged out' } },
      },
    },
    '/api/v1/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Logout all sessions',
        security: [{ bearerAuth: [] }],
        responses: { '204': { description: 'All sessions revoked' } },
      },
    },
    '/api/v1/auth/change-password': {
      put: {
        tags: ['Auth'],
        summary: 'Change password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' as const }, newPassword: { type: 'string' as const } } } } },
        },
        responses: { '200': { description: 'Password changed' }, '401': { description: 'Current password wrong' } },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Current user' } },
      },
    },

    // ── Users ─────────────────────────────────────────────
    '/api/v1/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'role', in: 'query' as const, schema: { type: 'string' as const, enum: ['admin', 'editor'] } },
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const } },
        ],
        responses: { '200': { description: 'Paginated user list' }, '403': { description: 'Not admin' } },
      },
    },
    '/api/v1/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        responses: { '200': { description: 'User details' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },

    // ── Content Types ─────────────────────────────────────
    '/api/v1/content-types': {
      get: {
        tags: ['Content Types'],
        summary: 'List content types',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const } },
        ],
        responses: { '200': { description: 'Paginated content type list' } },
      },
      post: {
        tags: ['Content Types'],
        summary: 'Create content type (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, required: ['slug', 'name', 'fields'], properties: { slug: { type: 'string' as const }, name: { type: 'string' as const }, fields: { type: 'array' as const, items: { $ref: '#/components/schemas/FieldDefinition' } } } } } },
        },
        responses: { '201': { description: 'Created' }, '409': { description: 'Slug already exists' } },
      },
    },
    '/api/v1/content-types/{id}': {
      get: {
        tags: ['Content Types'],
        summary: 'Get content type by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        responses: { '200': { description: 'Content type details' }, '404': { description: 'Not found' } },
      },
      put: {
        tags: ['Content Types'],
        summary: 'Update content type (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object' as const, properties: { slug: { type: 'string' as const }, name: { type: 'string' as const }, fields: { type: 'array' as const, items: { $ref: '#/components/schemas/FieldDefinition' } } } } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Content Types'],
        summary: 'Delete content type (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },

    // ── Contents ──────────────────────────────────────────
    '/api/v1/contents': {
      get: {
        tags: ['Contents'],
        summary: 'List contents',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'contentTypeId', in: 'query' as const, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'status', in: 'query' as const, schema: { type: 'string' as const, enum: ['draft', 'published'] } },
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const } },
          { name: 'sortBy', in: 'query' as const, schema: { type: 'string' as const, enum: ['createdAt', 'updatedAt', 'status', 'relevance'], default: 'createdAt' } },
          { name: 'sortOrder', in: 'query' as const, schema: { type: 'string' as const, enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: { '200': { description: 'Paginated content list' } },
      },
      post: {
        tags: ['Contents'],
        summary: 'Create content',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, required: ['contentTypeId', 'data'], properties: { contentTypeId: { type: 'string' as const, format: 'uuid' }, status: { type: 'string' as const, enum: ['draft', 'published'], default: 'draft' }, data: { type: 'object' as const } } } } },
        },
        responses: { '201': { description: 'Created' }, '400': { description: 'Validation error' } },
      },
    },
    '/api/v1/contents/{id}': {
      get: {
        tags: ['Contents'],
        summary: 'Get content by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        responses: { '200': { description: 'Content details' }, '404': { description: 'Not found' } },
      },
      put: {
        tags: ['Contents'],
        summary: 'Update content (auto-versions)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object' as const, properties: { status: { type: 'string' as const, enum: ['draft', 'published'] }, data: { type: 'object' as const } } } } },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Contents'],
        summary: 'Delete content',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },

    // ── Content Relations ─────────────────────────────────
    '/api/v1/contents/{id}/relations': {
      post: {
        tags: ['Relations'],
        summary: 'Create a relation from this content',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, required: ['targetId', 'relationType'], properties: { targetId: { type: 'string' as const, format: 'uuid' }, relationType: { type: 'string' as const, enum: ['reference', 'parent', 'related'] } } } } },
        },
        responses: { '201': { description: 'Relation created' }, '400': { description: 'Self-relation' }, '404': { description: 'Source or target not found' }, '409': { description: 'Duplicate' } },
      },
      get: {
        tags: ['Relations'],
        summary: 'List relations for a content',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'relationType', in: 'query' as const, schema: { type: 'string' as const, enum: ['reference', 'parent', 'related'] } },
        ],
        responses: { '200': { description: 'Paginated relations' } },
      },
    },
    '/api/v1/contents/{id}/relations/{relationId}': {
      delete: {
        tags: ['Relations'],
        summary: 'Delete a relation',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'relationId', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },

    // ── Content Versions ──────────────────────────────────
    '/api/v1/contents/{id}/versions': {
      get: {
        tags: ['Versions'],
        summary: 'List versions for a content',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
        ],
        responses: { '200': { description: 'Paginated version list' } },
      },
    },
    '/api/v1/contents/{id}/versions/{versionId}': {
      get: {
        tags: ['Versions'],
        summary: 'Get a specific version',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'versionId', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '200': { description: 'Version details' }, '404': { description: 'Not found' } },
      },
    },
    '/api/v1/contents/{id}/versions/{versionId}/restore': {
      post: {
        tags: ['Versions'],
        summary: 'Restore a previous version',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'versionId', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '200': { description: 'Content restored' }, '404': { description: 'Version not found' } },
      },
    },

    // ── Uploads ───────────────────────────────────────────
    '/api/v1/uploads': {
      get: {
        tags: ['Uploads'],
        summary: 'List uploaded files',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'mimeType', in: 'query' as const, schema: { type: 'string' as const } },
          { name: 'createdBy', in: 'query' as const, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '200': { description: 'Paginated media list' } },
      },
      post: {
        tags: ['Uploads'],
        summary: 'Upload a file (rate limited, MIME validated)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object' as const, properties: { file: { type: 'string' as const, format: 'binary' } } } } },
        },
        responses: { '201': { description: 'File uploaded' }, '400': { description: 'No file or invalid type' } },
      },
    },
    '/api/v1/uploads/{id}': {
      get: {
        tags: ['Uploads'],
        summary: 'Get file metadata',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        responses: { '200': { description: 'Media metadata' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Uploads'],
        summary: 'Delete file (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/api/v1/uploads/{id}/file': {
      get: {
        tags: ['Uploads'],
        summary: 'Serve file content (public)',
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        responses: { '200': { description: 'File stream' }, '404': { description: 'Not found' } },
      },
    },

    // ── Settings ──────────────────────────────────────────
    '/api/v1/settings/storage': {
      get: {
        tags: ['Settings'],
        summary: 'Get storage config (admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Storage configuration' } },
      },
      put: {
        tags: ['Settings'],
        summary: 'Update storage config (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/StorageConfig' } } },
        },
        responses: { '200': { description: 'Updated' }, '400': { description: 'Validation error' } },
      },
    },

    // ── Public ────────────────────────────────────────────
    '/api/v1/public/content-types': {
      get: {
        tags: ['Public'],
        summary: 'List content types (public)',
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
        ],
        responses: { '200': { description: 'Content types' } },
      },
    },
    '/api/v1/public/content-types/{slug}': {
      get: {
        tags: ['Public'],
        summary: 'Get content type by slug (public)',
        parameters: [{ name: 'slug', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: { '200': { description: 'Content type' }, '404': { description: 'Not found' } },
      },
    },
    '/api/v1/public/contents': {
      get: {
        tags: ['Public'],
        summary: 'List published contents (public)',
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const } },
          { name: 'sortBy', in: 'query' as const, schema: { type: 'string' as const, enum: ['createdAt', 'updatedAt', 'relevance'] } },
          { name: 'sortOrder', in: 'query' as const, schema: { type: 'string' as const, enum: ['asc', 'desc'] } },
        ],
        responses: { '200': { description: 'Published contents' } },
      },
    },
    '/api/v1/public/contents/by-type/{slug}': {
      get: {
        tags: ['Public'],
        summary: 'List published contents by type slug (public)',
        parameters: [
          { name: 'slug', in: 'path' as const, required: true, schema: { type: 'string' as const } },
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
        ],
        responses: { '200': { description: 'Contents for type' } },
      },
    },
    '/api/v1/public/contents/{id}': {
      get: {
        tags: ['Public'],
        summary: 'Get published content by ID (public)',
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } }],
        responses: { '200': { description: 'Content' }, '404': { description: 'Not found' } },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication & user session' },
    { name: 'Users', description: 'User management (admin)' },
    { name: 'Content Types', description: 'CPT definitions' },
    { name: 'Contents', description: 'Content entries' },
    { name: 'Relations', description: 'Content-to-content relations' },
    { name: 'Versions', description: 'Content version history' },
    { name: 'Uploads', description: 'File uploads & media' },
    { name: 'Settings', description: 'System settings' },
    { name: 'Public', description: 'Public read-only API' },
  ],
};
