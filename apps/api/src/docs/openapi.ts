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
      apiKeyAuth: {
        type: 'apiKey' as const,
        in: 'header' as const,
        name: 'X-API-Key',
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
          roleId: { type: 'string' as const, format: 'uuid' },
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
          type: {
            type: 'string' as const,
            enum: [
              'text',
              'textarea',
              'number',
              'boolean',
              'date',
              'email',
              'url',
              'select',
              'media',
              'richtext',
              'author',
            ],
          },
          required: { type: 'boolean' as const },
          label: { type: 'string' as const },
          options: { type: 'array' as const, items: { type: 'string' as const } },
          multiple: { type: 'boolean' as const },
          accept: { type: 'array' as const, items: { type: 'string' as const } },
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
          slug: { type: 'string' as const, nullable: true },
          status: { type: 'string' as const, enum: ['draft', 'in-review', 'approved', 'scheduled', 'published'] },
          data: { type: 'object' as const },
          publishedAt: { type: 'string' as const, format: 'date-time', nullable: true },
          editedBy: { type: 'string' as const, format: 'uuid', nullable: true },
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
      Role: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          name: { type: 'string' as const },
          slug: { type: 'string' as const },
          description: { type: 'string' as const, nullable: true },
          permissions: { type: 'array' as const, items: { type: 'string' as const } },
          isSystem: { type: 'boolean' as const },
          createdAt: { type: 'string' as const, format: 'date-time' },
          updatedAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      Webhook: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          name: { type: 'string' as const },
          url: { type: 'string' as const, format: 'uri' },
          secret: { type: 'string' as const },
          events: { type: 'array' as const, items: { type: 'string' as const } },
          isActive: { type: 'boolean' as const },
          createdBy: { type: 'string' as const, format: 'uuid' },
          createdAt: { type: 'string' as const, format: 'date-time' },
          updatedAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      WebhookDelivery: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          webhookId: { type: 'string' as const, format: 'uuid' },
          event: { type: 'string' as const },
          payload: { type: 'object' as const },
          status: { type: 'string' as const, enum: ['pending', 'success', 'failed'] },
          responseStatus: { type: 'integer' as const, nullable: true },
          attempts: { type: 'integer' as const },
          nextRetryAt: { type: 'string' as const, format: 'date-time', nullable: true },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      AuditLog: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          actorId: { type: 'string' as const },
          actorType: { type: 'string' as const, enum: ['user', 'api_key', 'system'] },
          action: { type: 'string' as const },
          resourceType: { type: 'string' as const },
          resourceId: { type: 'string' as const, nullable: true },
          metadata: { type: 'object' as const, nullable: true },
          ipAddress: { type: 'string' as const, nullable: true },
          userAgent: { type: 'string' as const, nullable: true },
          createdAt: { type: 'string' as const, format: 'date-time' },
        },
      },
      ApiKey: {
        type: 'object' as const,
        properties: {
          id: { type: 'string' as const, format: 'uuid' },
          name: { type: 'string' as const },
          keyPrefix: { type: 'string' as const },
          permissions: { type: 'array' as const, items: { type: 'string' as const } },
          createdBy: { type: 'string' as const, format: 'uuid' },
          expiresAt: { type: 'string' as const, format: 'date-time', nullable: true },
          lastUsedAt: { type: 'string' as const, format: 'date-time', nullable: true },
          isActive: { type: 'boolean' as const },
          createdAt: { type: 'string' as const, format: 'date-time' },
          updatedAt: { type: 'string' as const, format: 'date-time' },
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
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' as const, format: 'email' },
                  password: { type: 'string' as const, minLength: 6 },
                  role: { type: 'string' as const, enum: ['admin', 'editor'], default: 'editor' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User registered' },
          '400': { description: 'Validation error' },
          '409': { description: 'Email already exists' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['email', 'password'],
                properties: { email: { type: 'string' as const }, password: { type: 'string' as const } },
              },
            },
          },
        },
        responses: { '200': { description: 'Token pair returned' }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' as const, properties: { refreshToken: { type: 'string' as const } } },
            },
          },
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
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['currentPassword', 'newPassword'],
                properties: { currentPassword: { type: 'string' as const }, newPassword: { type: 'string' as const } },
              },
            },
          },
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
          { name: 'roleId', in: 'query' as const, schema: { type: 'string' as const, format: 'uuid' } },
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
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '200': { description: 'User details' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
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
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['slug', 'name', 'fields'],
                properties: {
                  slug: { type: 'string' as const },
                  name: { type: 'string' as const },
                  fields: { type: 'array' as const, items: { $ref: '#/components/schemas/FieldDefinition' } },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' }, '409': { description: 'Slug already exists' } },
      },
    },
    '/api/v1/content-types/{id}': {
      get: {
        tags: ['Content Types'],
        summary: 'Get content type by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '200': { description: 'Content type details' }, '404': { description: 'Not found' } },
      },
      put: {
        tags: ['Content Types'],
        summary: 'Update content type (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  slug: { type: 'string' as const },
                  name: { type: 'string' as const },
                  fields: { type: 'array' as const, items: { $ref: '#/components/schemas/FieldDefinition' } },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Content Types'],
        summary: 'Delete content type (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
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
          {
            name: 'status',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['draft', 'in-review', 'approved', 'scheduled', 'published'] },
          },
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const } },
          {
            name: 'sortBy',
            in: 'query' as const,
            schema: {
              type: 'string' as const,
              enum: ['createdAt', 'updatedAt', 'status', 'slug', 'relevance'],
              default: 'createdAt',
            },
          },
          {
            name: 'sortOrder',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['asc', 'desc'], default: 'desc' },
          },
        ],
        responses: { '200': { description: 'Paginated content list' } },
      },
      post: {
        tags: ['Contents'],
        summary: 'Create content',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['contentTypeId', 'data'],
                properties: {
                  contentTypeId: { type: 'string' as const, format: 'uuid' },
                  slug: { type: 'string' as const },
                  status: {
                    type: 'string' as const,
                    enum: ['draft', 'in-review', 'approved', 'scheduled', 'published'],
                    default: 'draft',
                  },
                  data: { type: 'object' as const },
                  publishedAt: { type: 'string' as const, format: 'date-time' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' }, '400': { description: 'Validation error' } },
      },
    },
    '/api/v1/contents/{id}': {
      get: {
        tags: ['Contents'],
        summary: 'Get content by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '200': { description: 'Content details' }, '404': { description: 'Not found' } },
      },
      put: {
        tags: ['Contents'],
        summary: 'Update content (auto-versions)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  slug: { type: 'string' as const, nullable: true },
                  status: {
                    type: 'string' as const,
                    enum: ['draft', 'in-review', 'approved', 'scheduled', 'published'],
                  },
                  data: { type: 'object' as const },
                  publishedAt: { type: 'string' as const, format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Contents'],
        summary: 'Delete content',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },

    // ── Content Relations ─────────────────────────────────
    '/api/v1/contents/{id}/relations': {
      post: {
        tags: ['Relations'],
        summary: 'Create a relation from this content',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['targetId', 'relationType'],
                properties: {
                  targetId: { type: 'string' as const, format: 'uuid' },
                  relationType: { type: 'string' as const, enum: ['reference', 'parent', 'related'] },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Relation created' },
          '400': { description: 'Self-relation' },
          '404': { description: 'Source or target not found' },
          '409': { description: 'Duplicate' },
        },
      },
      get: {
        tags: ['Relations'],
        summary: 'List relations for a content',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          {
            name: 'relationType',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['reference', 'parent', 'related'] },
          },
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
          {
            name: 'relationId',
            in: 'path' as const,
            required: true,
            schema: { type: 'string' as const, format: 'uuid' },
          },
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
          {
            name: 'versionId',
            in: 'path' as const,
            required: true,
            schema: { type: 'string' as const, format: 'uuid' },
          },
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
          {
            name: 'versionId',
            in: 'path' as const,
            required: true,
            schema: { type: 'string' as const, format: 'uuid' },
          },
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
          content: {
            'multipart/form-data': {
              schema: { type: 'object' as const, properties: { file: { type: 'string' as const, format: 'binary' } } },
            },
          },
        },
        responses: { '201': { description: 'File uploaded' }, '400': { description: 'No file or invalid type' } },
      },
    },
    '/api/v1/uploads/{id}': {
      get: {
        tags: ['Uploads'],
        summary: 'Get file metadata',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '200': { description: 'Media metadata' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Uploads'],
        summary: 'Delete file (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/api/v1/uploads/{id}/file': {
      get: {
        tags: ['Uploads'],
        summary: 'Serve file content (public)',
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
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

    // ── Setup ──────────────────────────────────────────────
    '/api/v1/setup/status': {
      get: {
        tags: ['Setup'],
        summary: 'Check if initial setup is needed',
        responses: { '200': { description: 'Setup status' } },
      },
    },
    '/api/v1/setup': {
      post: {
        tags: ['Setup'],
        summary: 'Initialize CMS with first admin account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['email', 'password', 'confirmPassword'],
                properties: {
                  email: { type: 'string' as const, format: 'email' },
                  password: { type: 'string' as const, minLength: 6 },
                  confirmPassword: { type: 'string' as const },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Admin account created, tokens returned' },
          '400': { description: 'Validation error or setup already completed' },
        },
      },
    },

    // ── Roles ─────────────────────────────────────────────
    '/api/v1/roles': {
      get: {
        tags: ['Roles'],
        summary: 'List roles',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const } },
        ],
        responses: { '200': { description: 'Paginated role list' } },
      },
      post: {
        tags: ['Roles'],
        summary: 'Create role',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['name', 'slug', 'permissions'],
                properties: {
                  name: { type: 'string' as const },
                  slug: { type: 'string' as const },
                  description: { type: 'string' as const, nullable: true },
                  permissions: { type: 'array' as const, items: { type: 'string' as const } },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' }, '409': { description: 'Slug exists' } },
      },
    },
    '/api/v1/roles/{id}': {
      get: {
        tags: ['Roles'],
        summary: 'Get role by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '200': { description: 'Role details' }, '404': { description: 'Not found' } },
      },
      put: {
        tags: ['Roles'],
        summary: 'Update role',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  name: { type: 'string' as const },
                  slug: { type: 'string' as const },
                  description: { type: 'string' as const, nullable: true },
                  permissions: { type: 'array' as const, items: { type: 'string' as const } },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Roles'],
        summary: 'Delete role',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },

    // ── Webhooks ──────────────────────────────────────────
    '/api/v1/webhooks': {
      get: {
        tags: ['Webhooks'],
        summary: 'List webhooks',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'isActive', in: 'query' as const, schema: { type: 'string' as const, enum: ['true', 'false'] } },
        ],
        responses: { '200': { description: 'Paginated webhook list' } },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Create webhook',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['name', 'url', 'secret', 'events'],
                properties: {
                  name: { type: 'string' as const },
                  url: { type: 'string' as const, format: 'uri' },
                  secret: { type: 'string' as const, minLength: 16 },
                  events: { type: 'array' as const, items: { type: 'string' as const } },
                  isActive: { type: 'boolean' as const, default: true },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/v1/webhooks/{id}': {
      get: {
        tags: ['Webhooks'],
        summary: 'Get webhook by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '200': { description: 'Webhook details' }, '404': { description: 'Not found' } },
      },
      put: {
        tags: ['Webhooks'],
        summary: 'Update webhook',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  name: { type: 'string' as const },
                  url: { type: 'string' as const, format: 'uri' },
                  secret: { type: 'string' as const, minLength: 16 },
                  events: { type: 'array' as const, items: { type: 'string' as const } },
                  isActive: { type: 'boolean' as const },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Webhooks'],
        summary: 'Delete webhook',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/api/v1/webhooks/{id}/deliveries': {
      get: {
        tags: ['Webhooks'],
        summary: 'List deliveries for a webhook',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          {
            name: 'status',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['pending', 'success', 'failed'] },
          },
        ],
        responses: { '200': { description: 'Paginated delivery list' } },
      },
    },

    // ── Audit Logs ────────────────────────────────────────
    '/api/v1/audit-logs': {
      get: {
        tags: ['Audit Logs'],
        summary: 'List audit logs',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'actorId', in: 'query' as const, schema: { type: 'string' as const } },
          { name: 'action', in: 'query' as const, schema: { type: 'string' as const } },
          { name: 'resourceType', in: 'query' as const, schema: { type: 'string' as const } },
          { name: 'from', in: 'query' as const, schema: { type: 'string' as const, format: 'date-time' } },
          { name: 'to', in: 'query' as const, schema: { type: 'string' as const, format: 'date-time' } },
        ],
        responses: { '200': { description: 'Paginated audit log list' } },
      },
    },

    // ── API Keys ──────────────────────────────────────────
    '/api/v1/api-keys': {
      get: {
        tags: ['API Keys'],
        summary: 'List API keys',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'isActive', in: 'query' as const, schema: { type: 'string' as const, enum: ['true', 'false'] } },
        ],
        responses: { '200': { description: 'Paginated API key list' } },
      },
      post: {
        tags: ['API Keys'],
        summary: 'Create API key',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['name', 'permissions'],
                properties: {
                  name: { type: 'string' as const },
                  permissions: { type: 'array' as const, items: { type: 'string' as const } },
                  expiresAt: { type: 'string' as const, format: 'date-time' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'API key created, raw key returned' } },
      },
    },
    '/api/v1/api-keys/{id}': {
      get: {
        tags: ['API Keys'],
        summary: 'Get API key by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '200': { description: 'API key details' }, '404': { description: 'Not found' } },
      },
      put: {
        tags: ['API Keys'],
        summary: 'Update API key',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  name: { type: 'string' as const },
                  permissions: { type: 'array' as const, items: { type: 'string' as const } },
                  isActive: { type: 'boolean' as const },
                  expiresAt: { type: 'string' as const, format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['API Keys'],
        summary: 'Delete API key',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
        ],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },

    // ── Bulk Action ───────────────────────────────────────
    '/api/v1/contents/bulk-action': {
      post: {
        tags: ['Contents'],
        summary: 'Perform bulk action on contents',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['ids', 'action'],
                properties: {
                  ids: {
                    type: 'array' as const,
                    items: { type: 'string' as const, format: 'uuid' },
                    minItems: 1,
                    maxItems: 100,
                  },
                  action: { type: 'string' as const, enum: ['delete', 'publish', 'unpublish'] },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Bulk action result' } },
      },
    },

    // ── Export/Import ─────────────────────────────────────
    '/api/v1/contents/export': {
      get: {
        tags: ['Contents'],
        summary: 'Export contents for a content type',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'contentTypeId',
            in: 'query' as const,
            required: true,
            schema: { type: 'string' as const, format: 'uuid' },
          },
          {
            name: 'format',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['json', 'csv', 'xml'], default: 'json' },
          },
          {
            name: 'status',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['draft', 'in-review', 'approved', 'scheduled', 'published'] },
          },
        ],
        responses: { '200': { description: 'File download' } },
      },
    },
    '/api/v1/contents/import': {
      post: {
        tags: ['Contents'],
        summary: 'Import contents from file',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object' as const,
                required: ['file', 'contentTypeId'],
                properties: {
                  file: { type: 'string' as const, format: 'binary' },
                  contentTypeId: { type: 'string' as const, format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Import result with imported/failed counts' },
          '400': { description: 'Invalid file or missing content type' },
        },
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
        summary: 'List published contents (public, rate limited)',
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const, default: 1 } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const, default: 20 } },
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const } },
          {
            name: 'sortBy',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['createdAt', 'updatedAt', 'publishedAt', 'relevance'] },
          },
          { name: 'sortOrder', in: 'query' as const, schema: { type: 'string' as const, enum: ['asc', 'desc'] } },
          {
            name: 'filter',
            in: 'query' as const,
            description: 'JSON-encoded filter object',
            schema: { type: 'string' as const },
          },
          {
            name: 'fields',
            in: 'query' as const,
            description: 'Comma-separated field names to include',
            schema: { type: 'string' as const },
          },
          { name: 'populate', in: 'query' as const, schema: { type: 'string' as const, enum: ['relations'] } },
          {
            name: 'preview',
            in: 'query' as const,
            description: 'Include non-published content (requires API key)',
            schema: { type: 'string' as const, enum: ['true', 'false'] },
          },
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
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const } },
          {
            name: 'sortBy',
            in: 'query' as const,
            schema: { type: 'string' as const, enum: ['createdAt', 'updatedAt', 'publishedAt', 'relevance'] },
          },
          { name: 'sortOrder', in: 'query' as const, schema: { type: 'string' as const, enum: ['asc', 'desc'] } },
          {
            name: 'filter',
            in: 'query' as const,
            description: 'JSON-encoded filter object',
            schema: { type: 'string' as const },
          },
          {
            name: 'fields',
            in: 'query' as const,
            description: 'Comma-separated field names to include',
            schema: { type: 'string' as const },
          },
          { name: 'populate', in: 'query' as const, schema: { type: 'string' as const, enum: ['relations'] } },
          { name: 'preview', in: 'query' as const, schema: { type: 'string' as const, enum: ['true', 'false'] } },
        ],
        responses: { '200': { description: 'Contents for type' } },
      },
    },
    '/api/v1/public/contents/{id}': {
      get: {
        tags: ['Public'],
        summary: 'Get published content by ID (public)',
        parameters: [
          { name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const, format: 'uuid' } },
          { name: 'fields', in: 'query' as const, schema: { type: 'string' as const } },
          { name: 'populate', in: 'query' as const, schema: { type: 'string' as const, enum: ['relations'] } },
        ],
        responses: { '200': { description: 'Content' }, '404': { description: 'Not found' } },
      },
    },
  },
  tags: [
    { name: 'Setup', description: 'Initial CMS setup' },
    { name: 'Auth', description: 'Authentication & user session' },
    { name: 'Users', description: 'User management' },
    { name: 'Roles', description: 'Role & permission management' },
    { name: 'Content Types', description: 'CPT definitions' },
    { name: 'Contents', description: 'Content entries, bulk actions, export/import' },
    { name: 'Relations', description: 'Content-to-content relations' },
    { name: 'Versions', description: 'Content version history' },
    { name: 'Uploads', description: 'File uploads & media' },
    { name: 'Settings', description: 'System settings' },
    { name: 'Webhooks', description: 'Webhook management & deliveries' },
    { name: 'Audit Logs', description: 'Action audit trail' },
    { name: 'API Keys', description: 'Programmatic API access' },
    { name: 'Public', description: 'Public read-only API (rate limited)' },
  ],
};
