// GraphQL Schema Introspection Helper
// Use this to explore the actual Builder.io Admin API schema

import { builderApi } from './builderApi';

export async function introspectInputType(typeName: string) {
  const credentials = builderApi.loadCredentials();
  if (!credentials) {
    throw new Error('Not authenticated');
  }

  const query = `
    query IntrospectInputType($typeName: String!) {
      __type(name: $typeName) {
        name
        kind
        description
        inputFields {
          name
          description
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://cdn.builder.io/api/v2/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.privateKey}`,
      },
      body: JSON.stringify({
        query,
        variables: { typeName }
      }),
    });

    const result = await response.json();
    console.log(`${typeName} schema:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Schema introspection failed:', error);
    throw error;
  }
}

export async function introspectUpdateModelInput() {
  return introspectInputType('UpdateModelInput');
}

export async function introspectSchema() {
  const credentials = builderApi.loadCredentials();
  if (!credentials) {
    throw new Error('Not authenticated');
  }

  const query = `
    query IntrospectionQuery {
      __schema {
        types {
          name
          kind
          description
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://cdn.builder.io/api/v2/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.privateKey}`,
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Schema introspection failed:', error);
    throw error;
  }
}

export async function testMutation(mutation: string, variables: Record<string, any> = {}) {
  const credentials = builderApi.loadCredentials();
  if (!credentials) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await fetch('https://cdn.builder.io/api/v2/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.privateKey}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    });

    const result = await response.json();
    console.log('Mutation result:', result);
    return result;
  } catch (error) {
    console.error('Mutation test failed:', error);
    throw error;
  }
}

// Example usage in browser console:
// import { introspectSchema } from './services/schemaHelper';
// introspectSchema().then(schema => console.log(JSON.stringify(schema, null, 2)));
