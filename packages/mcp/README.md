# @eli-cms/mcp

Model Context Protocol (MCP) server for Eli CMS. Expose your CMS as tools for AI assistants (Claude, Cursor, Copilot, etc.).

## Tools

| Tool                  | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| `list_content_types`  | List all content types (paginated, search, includeCounts)  |
| `get_content_type`    | Get a content type by slug with full field definitions     |
| `create_content_type` | Create a new content type with field definitions           |
| `list_contents`       | List contents (filter by type, status, search, sort)       |
| `create_content`      | Create content entry (data validated against content type) |
| `list_components`     | List reusable component blocks                             |
| `get_schema`          | Full CMS schema dump — all types + components              |

## Setup

### 1. Build

```bash
pnpm build:mcp
```

### 2. Create an API key

In the Eli CMS admin panel, go to **Settings → API Keys** and create a key with the permissions you need (e.g. `content:read`, `content:create`, `content-types:read`, `content-types:create`, `components:read`).

### 3. Configure

Create a `.elicms.toml` file at the root of your project or in your home directory (`~/.elicms.toml`):

```toml
[api]
url = "http://localhost:8080"
key = "eli_your_api_key_here"
```

Alternatively, use environment variables:

```bash
export ELI_API_URL="http://localhost:8080"
export ELI_API_KEY="eli_your_api_key_here"
```

> **Priority order:** env vars > `./.elicms.toml` > `~/.elicms.toml`

### 4. Register in your AI tool

#### Claude Code

Add to `.mcp.json` at the root of your project:

```json
{
  "mcpServers": {
    "eli-cms": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"]
    }
  }
}
```

If you prefer env vars over `.elicms.toml`:

```json
{
  "mcpServers": {
    "eli-cms": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"],
      "env": {
        "ELI_API_URL": "http://localhost:8080",
        "ELI_API_KEY": "eli_..."
      }
    }
  }
}
```

#### Claude Desktop

Go to **Settings → Developer → Edit Config** and add:

```json
{
  "mcpServers": {
    "eli-cms": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp/dist/index.js"]
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "eli-cms": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"]
    }
  }
}
```

## Usage Examples

Once connected, you can ask your AI assistant:

- _"Liste tous les types de contenu du CMS"_
- _"Montre-moi le schéma du type blog"_
- _"Crée un content type 'recette' avec les champs titre, ingrédients (repeatable), et temps de cuisson"_
- _"Crée 5 articles de blog de démo"_
- _"Quels composants sont disponibles ?"_

## Configuration File Reference

```toml
# .elicms.toml

[api]
url = "http://localhost:8080"   # Eli CMS API URL
key = "eli_..."                 # API key (create in admin → Settings → API Keys)
```

## Required Permissions

Minimum permissions for the API key depending on the tools you want to use:

| Tool                                                     | Permissions            |
| -------------------------------------------------------- | ---------------------- |
| `list_content_types` / `get_content_type` / `get_schema` | `content-types:read`   |
| `create_content_type`                                    | `content-types:create` |
| `list_contents`                                          | `content:read`         |
| `create_content`                                         | `content:create`       |
| `list_components` / `get_schema`                         | `components:read`      |
