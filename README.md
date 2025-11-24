# Builder.io Model Manager

A brutalist, minimal web-based platform for managing Builder.io content models through their Admin GraphQL API.

## Features

- **Authentication**: Securely connect to your Builder.io space with API credentials
- **Model List View**: Browse all content models with search functionality
- **Model Detail View**: View complete model schema and field definitions
- **JSON Editor**: Create and edit models using JSON with validation
- **Templates**: Quick-start templates for common model types
- **Brutalist Design**: Clean, minimal interface with no distractions

## Design Philosophy

This tool follows a dark brutalist design approach:
- Dark color scheme (#0a0a0a background, #e0e0e0 text) for comfortable viewing
- Syntax-highlighted JSON with carefully chosen colors
- Sharp rectangular borders, no rounded corners
- No shadows, gradients, or animations
- System fonts only
- Function over form, with every pixel serving a purpose

## Prerequisites

- Node.js 18+ and npm
- A Builder.io account with Admin API access
- Private API key from Builder.io
- Space ID from your Builder.io space

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

### 3. Production Build

```bash
npm run build
npm run preview
```

## Usage

### First Time Setup

1. Launch the application
2. Enter your Builder.io Private API Key (password field)
3. Enter your Builder.io Space ID
4. Click "Connect to Builder.io"

The credentials will be stored in your browser's session storage.

### Managing Models

#### View Models
- Browse all models in a table format
- Search by model name or type
- Click on a model name to view details

#### Create New Model
1. Click "Create New Model" button
2. Edit the JSON in the editor
3. Click "Validate JSON" to check syntax
4. Click "Save Model" to create

#### Edit Existing Model
1. Click "Edit" on any model in the list
2. Modify the JSON
3. Validate and save changes

#### Delete Model
1. Click "Delete" on any model
2. Confirm the deletion (this cannot be undone)

### Using Templates

1. Navigate to the "Templates" section
2. Browse pre-built templates:
   - Blog Post
   - Product
   - Landing Page
   - FAQ Item
   - Team Member
   - Testimonial
3. Click "Use Template" to load it into the editor
4. Customize the JSON to your needs
5. Save as a new model

## Model Structure

All models follow this JSON structure:

```json
{
  "name": "ModelName",
  "kind": "component|page|data|section",
  "fields": [
    {
      "name": "fieldName",
      "type": "string|text|richText|number|boolean|date|file|reference|list|object|color|url|email",
      "required": true|false,
      "helperText": "Optional helper text",
      "defaultValue": "optional default value"
    }
  ]
}
```

### Supported Field Types

- `string` - Single line text
- `text` - Multi-line text
- `richText` - Rich text content
- `number` - Numeric values
- `boolean` - True/false
- `date` - Date picker
- `file` - File upload reference
- `reference` - Reference to another model
- `list` - Array of items
- `object` - Nested object structure
- `color` - Color value
- `url` - URL string
- `email` - Email string

### Model Kinds

- `component` - Reusable components
- `page` - Full page templates
- `data` - Data structures
- `section` - Page sections

## API Integration

The application uses the Builder.io Admin GraphQL API:
- **Endpoint**: `https://cdn.builder.io/api/v2/admin`
- **Authentication**: Bearer token (Private API Key)
- **Operations**: Query models, create, update, delete

## Project Structure

```
builder-model-manager/
├── src/
│   ├── components/       # React components
│   │   ├── Auth.tsx      # Authentication screen
│   │   ├── Header.tsx    # Navigation header
│   │   ├── ModelList.tsx # Model listing with search
│   │   ├── ModelDetail.tsx # Model detail view
│   │   ├── JsonEditor.tsx  # JSON editor for create/edit
│   │   └── Templates.tsx   # Template selection
│   ├── services/
│   │   └── builderApi.ts # Builder.io API service
│   ├── types/
│   │   └── builder.ts    # TypeScript type definitions
│   ├── templates/
│   │   └── modelTemplates.ts # Pre-built model templates
│   ├── App.tsx           # Main application with routing
│   ├── main.tsx          # Application entry point
│   └── index.css         # Brutalist design system
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Technology Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **No external UI libraries** - All components built from scratch

## Browser Support

- Modern browsers only (last 2 versions)
- Desktop-first design (minimum 1024px viewport)
- No mobile optimization

## Security

- API keys are stored in browser's sessionStorage
- Keys are never logged or exposed in the UI
- All API requests use HTTPS
- Session-based authentication (cleared on browser close)

## Error Handling

The application handles common errors:
- Invalid API credentials
- Network failures
- Invalid JSON syntax
- Missing required fields
- GraphQL API errors

## Validation

JSON validation checks for:
- Valid JSON syntax
- Required fields (name, kind, fields)
- Valid model kinds
- Valid field structures
- At least one field required

## Keyboard Shortcuts

- `Enter` in form fields submits the form
- Standard text editing shortcuts in JSON editor

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Clear focus states
- Labels for all inputs
- Descriptive error messages

## Known Limitations

- **Model name and kind are immutable**: Once a model is created, you can only update its `fields` array. The model's `name` and `kind` cannot be changed via the API.
- Space ID input is collected but the current Builder.io API uses the API key for space scoping
- No undo/redo functionality (by design)
- No autosave (explicit save required)
- Models cannot be duplicated (must copy JSON manually)

## Development

### Code Style

- Functional React components
- TypeScript strict mode
- Minimal abstractions
- Direct, explicit code over clever solutions

### Adding New Features

When adding features, maintain the brutalist aesthetic:
- No rounded corners, shadows, or gradients
- Black text on white or off-white backgrounds
- 1px solid black borders
- Generous whitespace (16px base unit)
- System fonts only

## Troubleshooting

### Cannot connect to Builder.io
- Verify your API key is correct
- Ensure you're using a Private API Key (not Public)
- Check that your API key has admin permissions

### Models not appearing
- Refresh the page
- Check browser console for errors
- Verify your API key has access to the space

### JSON validation errors
- Ensure all required fields are present
- Check field type spelling
- Verify JSON syntax (use "Validate JSON" button)

### GraphQL Schema Issues

If you encounter GraphQL validation errors, you can:

1. **Use the Builder.io GraphQL Explorer**
   - Visit: `https://builder.io/api/v2/admin`
   - Enter your API key
   - Explore the actual schema and test queries

2. **Use Browser Console Introspection**
   ```javascript
   // In browser console after authentication:
   import { introspectSchema } from './src/services/schemaHelper.js';
   introspectSchema().then(schema => console.log(JSON.stringify(schema, null, 2)));
   ```

3. **Check Error Messages**
   - GraphQL errors are displayed in the UI
   - Check browser console for detailed error information
   - The error message often suggests the correct field/type names

## License

Private project - all rights reserved

## Support

For issues with:
- Builder.io API: Contact Builder.io support
- This application: Check browser console for errors

## Contributing

This is a minimal tool focused on essential functionality. Feature requests should align with the brutalist, minimal design philosophy.
