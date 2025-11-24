# Builder.io Model Manager

A minimal web-based CRUD platform for managing Builder.io content models and content through their Admin GraphQL and Content REST APIs.

## Features

- **Model Management**: Full CRUD operations on content models with JSON editing
- **Content Management**: Full CRUD operations on content entries per model
- **Inline Editing**: Edit individual fields or entire JSON structures
- **Templates**: Pre-built model templates (Blog Post, Product, Landing Page, etc.)
- **Syntax Highlighting**: Real-time JSON syntax highlighting
- **Brutalist Design**: Dark theme, zero external UI dependencies

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and enter your Builder.io API keys:
- **Private API Key** (starts with `bk-`) - for admin operations
- **Public API Key** (starts with `bpk-`) - for content queries

## Project Structure

```
src/
├── components/          # React UI components
│   ├── Auth.tsx        # Login with API keys
│   ├── ModelList.tsx   # Model listing/CRUD
│   ├── ModelDetail.tsx # Model schema view
│   ├── ContentList.tsx # Content listing/CRUD
│   ├── ContentDetail.tsx # Content data view
│   └── ...
├── services/
│   └── builderApi.ts   # API integration (singleton)
├── types/
│   └── builder.ts      # TypeScript definitions
└── templates/
    └── modelTemplates.ts # Pre-built templates
```

## Usage

### Models
- **View**: Browse models, search by name/type
- **Create**: JSON editor with templates
- **Edit**: Edit full JSON or individual fields
- **Delete**: Confirmation required (type model name)

**Note**: Model `name` and `kind` are immutable after creation (API limitation)

### Content
- **View**: Select model, browse content entries
- **Create**: Auto-generated template from model schema
- **Edit**: Edit full JSON or individual field values
- **Delete**: Confirmation required (type content name)

---

# Implementation Guide for Builder.io Team

## Architecture Overview

```
React Components → builderApi (Singleton) → Builder.io APIs
```

**Three API Endpoints:**
1. Admin GraphQL (v2) - Model operations
2. Content REST (v3) - Content queries
3. Write API (v1) - Content mutations

## API Integration

### Authentication

```typescript
interface BuilderCredentials {
  privateKey: string;  // Admin operations
  publicKey: string;   // Content queries
}

// Store credentials
sessionStorage.setItem('builder_credentials', JSON.stringify(credentials));

// Test connection
const query = `query { me { id email } }`;
fetch('https://cdn.builder.io/api/v2/admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${credentials.privateKey}`
  },
  body: JSON.stringify({ query })
});
```

### GraphQL Pattern (Models)

```typescript
const graphqlRequest = async <T>(query: string, variables: any): Promise<T> => {
  const response = await fetch('https://cdn.builder.io/api/v2/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${privateKey}`
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();
  if (result.errors) throw new Error(result.errors[0].message);
  return result.data;
};
```

### REST Pattern (Content Queries)

```typescript
const getContent = async (modelName: string) => {
  const params = new URLSearchParams({
    apiKey: publicKey,
    limit: '100',
    cachebust: 'true'
  });

  const response = await fetch(
    `https://cdn.builder.io/api/v3/content/${modelName}?${params}`
  );
  const data = await response.json();
  return data.results || [];
};
```

### Write API Pattern (Content Mutations)

```typescript
// CREATE
await fetch(`https://builder.io/api/v1/write/${modelName}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${privateKey}`
  },
  body: JSON.stringify({ name, published, data })
});

// UPDATE
await fetch(`https://builder.io/api/v1/write/${modelName}/${id}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${privateKey}`
  },
  body: JSON.stringify(updates)
});

// DELETE
await fetch(`https://builder.io/api/v1/write/${modelName}/${id}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${privateKey}` }
});
```

## Model Operations (GraphQL)

### Fetch All Models

```graphql
query GetModels($offset: Int, $limit: Int) {
  models(input: { offset: $offset, limit: $limit }) {
    models {
      id
      name
      kind
      fields {
        name
        type
        required
        helperText
        defaultValue
        subFields { name type }
      }
      createdDate
      lastUpdated
    }
  }
}
```

### Create Model

```graphql
mutation CreateModel($body: CreateModelInput!) {
  createModel(body: $body) {
    id
    name
    kind
    fields { name type required }
  }
}
```

**Variables:**
```json
{
  "body": {
    "name": "blog-post",
    "kind": "component",
    "fields": [
      { "name": "title", "type": "string", "required": true },
      { "name": "content", "type": "richText" }
    ]
  }
}
```

### Update Model

```graphql
mutation UpdateModel($body: UpdateModelInput!) {
  updateModel(body: $body) {
    id
    fields { name type }
  }
}
```

**Critical**: `name` and `kind` are immutable - API ignores changes but you must send original values.

### Delete Model

```graphql
mutation DeleteModel($id: String!) {
  deleteModel(id: $id)
}
```

## Content Operations (REST + Write API)

### Fetch Content

```
GET https://cdn.builder.io/api/v3/content/{modelName}?apiKey={publicKey}&limit=100
```

**Response:**
```typescript
interface ContentResponse {
  results: Array<{
    id: string;
    name: string;
    modelName: string;
    published: 'draft' | 'published';
    data: Record<string, any>;
    createdDate: number;
    lastUpdated: number;
  }>;
}
```

### Create Content

```
POST https://builder.io/api/v1/write/{modelName}
Authorization: Bearer {privateKey}

{
  "name": "My Blog Post",
  "published": "draft",
  "data": {
    "title": "Hello World",
    "content": "<p>Content here...</p>"
  }
}
```

### Update Content

```
PATCH https://builder.io/api/v1/write/{modelName}/{id}
Authorization: Bearer {privateKey}

{
  "data": {
    "title": "Updated Title"
  }
}
```

Partial updates supported - only send changed fields.

### Delete Content

```
DELETE https://builder.io/api/v1/write/{modelName}/{id}
Authorization: Bearer {privateKey}
```

## Type Definitions

### Model Types

```typescript
interface BuilderModel {
  id: string;
  name: string;
  kind: 'component' | 'page' | 'data' | 'section';
  fields: BuilderField[];
  createdDate: number;
  lastUpdated: number;
}

interface BuilderField {
  name: string;
  type: FieldType;
  required?: boolean;
  helperText?: string;
  defaultValue?: any;
  model?: string;        // For reference fields
  subFields?: BuilderField[];  // For list/object fields
}

type FieldType =
  | 'string' | 'text' | 'richText'
  | 'number' | 'boolean' | 'date'
  | 'file' | 'reference' | 'list' | 'object'
  | 'color' | 'url' | 'email';
```

### Content Types

```typescript
interface BuilderContent {
  id: string;
  name: string;
  modelName: string;
  published: 'draft' | 'published';
  data: Record<string, any>;  // Must match model field schema
  createdDate: number;
  lastUpdated: number;
}
```

## Key Implementation Patterns

### Validation

```typescript
// Model validation
- name, kind, fields required
- At least one field required
- Reference fields must specify "model"
- List/object fields must have "subFields"

// Content validation
- name, published, data required
- published: "draft" or "published"
- data keys must match model fields
- Required model fields must be present
```

### Recursive Field Rendering

```typescript
const FieldRow: React.FC<{ field: BuilderField; depth: number }> = ({ field, depth }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div style={{ paddingLeft: `${depth * 24}px` }}>
        {field.subFields && (
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? '▼' : '▶'}
          </button>
        )}
        <span>{field.name}</span>
        <span>{field.type}</span>
      </div>

      {expanded && field.subFields?.map((subField, i) => (
        <FieldRow key={i} field={subField} depth={depth + 1} />
      ))}
    </>
  );
};
```

### JSON Editor with Syntax Highlighting

Two-layer approach: highlighted background + transparent textarea

```typescript
// Background layer (syntax highlighted, non-interactive)
<pre
  dangerouslySetInnerHTML={{ __html: syntaxHighlight(json) }}
  style={{ pointerEvents: 'none', color: 'transparent' }}
/>

// Foreground layer (transparent textarea for editing)
<textarea
  value={json}
  onChange={handleChange}
  style={{ backgroundColor: 'transparent', caretColor: '#00aaff' }}
/>
```

### Confirmation Modals

Prevent accidental deletions by requiring user to type item name:

```typescript
const [input, setInput] = useState('');
const isValid = input === itemName;

<input value={input} onChange={(e) => setInput(e.target.value)} />
<button disabled={!isValid} onClick={onConfirm}>Delete</button>
```

## Error Handling

```typescript
// User-friendly error messages
const handleApiError = (error: Error): string => {
  if (error.message.includes('401')) return 'Invalid API credentials';
  if (error.message.includes('403')) return 'Permission denied';
  if (error.message.includes('404')) return 'Not found';
  return error.message;
};
```

## State Management

```typescript
interface AppState {
  isAuthenticated: boolean;
  currentPage: 'models' | 'content';
  currentView: 'list' | 'detail' | 'edit' | 'create';
  models: BuilderModel[];
  selectedModel: BuilderModel | null;
  selectedContent: BuilderContent | null;
}
```

State flows down via props, events flow up via callbacks. No Redux/MobX - plain React hooks.

## Performance Optimizations

1. **Cache models list** - rarely changes
2. **Client-side filtering** with `useMemo`
3. **Debounce search input** (300ms)
4. **Lazy load content** - fetch on model selection
5. **Pagination** - hardcoded 100 items (add UI for native implementation)

## Security Considerations

1. **API Keys**: sessionStorage for web, use Keychain/Keystore for native
2. **No logging**: Never log API keys
3. **HTTPS only**: All API calls use HTTPS
4. **Input validation**: Validate before API submission
5. **Rate limiting**: Implement for production

## Testing

```typescript
// API Tests
test('should create model', async () => {
  const model = await builderApi.createModel({
    name: 'test',
    kind: 'component',
    fields: [{ name: 'title', type: 'string', required: true }]
  });
  expect(model.id).toBeDefined();
});

// Component Tests
test('should filter models', () => {
  render(<ModelList models={models} />);
  fireEvent.change(screen.getByPlaceholderText('Search'), {
    target: { value: 'blog' }
  });
  expect(screen.getByText('blog-post')).toBeInTheDocument();
});
```

## Production Deployment

```bash
npm run build  # Outputs to dist/
```

Deploy `dist/` to any static host (Netlify, Vercel, S3, etc.)

**SPA Routing**: Redirect all routes to `index.html`

## Key Takeaways for Native Implementation

1. **Three separate APIs** - GraphQL for models, REST for queries, Write API for mutations
2. **Model immutability** - name/kind cannot change after creation
3. **Nested fields** - Use recursive rendering for list/object types with subFields
4. **Validation** - Match data schema to model fields before submission
5. **Confirmation UX** - Type-to-confirm for destructive actions
6. **Credential storage** - Use secure native storage (Keychain/Keystore)
7. **Error handling** - Convert API errors to user-friendly messages
8. **Performance** - Cache models, paginate content, debounce search

## Browser Console Debugging

```javascript
// Introspect GraphQL schema
window.introspect('CreateModelInput')
window.introspectUpdateModelInput()
```

## Limitations

- Model name/kind immutable (API constraint)
- No undo/redo
- No autosave
- No batch operations
- Content pagination hardcoded to 100 items
- Desktop-first (no mobile optimization)

## Tech Stack

- React 19.2.0
- TypeScript 5.9.3 (strict mode)
- Vite 7.2.4
- No external UI libraries
- No state management libraries

## License

Private project - all rights reserved
