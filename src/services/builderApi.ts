// Builder.io Admin API Service

import type {
  BuilderCredentials,
  BuilderModel,
  ModelInput,
  GraphQLResponse,
  GetModelsResponse,
  GetModelResponse,
  CreateModelResponse,
  UpdateModelResponse,
  DeleteModelResponse,
  BuilderContent,
  ContentInput,
  ContentQueryParams,
  BuilderOrganization,
} from '../types/builder';

const ADMIN_API_ENDPOINT = 'https://cdn.builder.io/api/v2/admin';
const CONTENT_API_ENDPOINT = 'https://cdn.builder.io/api/v3/content';
const WRITE_API_ENDPOINT = 'https://builder.io/api/v1/write';

class BuilderApiService {
  private credentials: BuilderCredentials | null = null;

  setCredentials(credentials: BuilderCredentials) {
    this.credentials = credentials;
    // Store in localStorage
    localStorage.setItem('builder_credentials', JSON.stringify(credentials));
  }

  loadCredentials(): BuilderCredentials | null {
    if (this.credentials) return this.credentials;

    const stored = localStorage.getItem('builder_credentials');
    if (stored) {
      this.credentials = JSON.parse(stored);
      return this.credentials;
    }
    return null;
  }

  clearCredentials() {
    this.credentials = null;
    localStorage.removeItem('builder_credentials');
  }

  isAuthenticated(): boolean {
    return this.loadCredentials() !== null;
  }

  private async graphqlRequest<T>(
    query: string,
    variables: Record<string, any> = {}
  ): Promise<T> {
    const credentials = this.loadCredentials();
    if (!credentials) {
      throw new Error('Not authenticated. Please provide API credentials.');
    }

    const response = await fetch(ADMIN_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.privateKey}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0].message);
    }

    if (!result.data) {
      throw new Error('No data returned from API');
    }

    return result.data;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getModels();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getOrganization(): Promise<BuilderOrganization> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    // Return the public API key as the space identifier
    return {
      id: credentials.publicKey,
      name: credentials.publicKey,
    };
  }

  async getModels(): Promise<BuilderModel[]> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    const query = `
      query GetModels {
        models {
          id
          name
          kind
          fields
          archived
        }
      }
    `;

    const data = await this.graphqlRequest<GetModelsResponse>(query);

    // Parse fields from JSONObject
    return data.models.map((model) => ({
      ...model,
      fields: Array.isArray(model.fields) ? model.fields : [],
    }));
  }

  async getModel(modelId: string): Promise<BuilderModel> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    const query = `
      query GetModel($modelId: String!) {
        model(id: $modelId) {
          id
          name
          kind
          fields
        }
      }
    `;

    const data = await this.graphqlRequest<GetModelResponse>(query, {
      modelId,
    });

    // Parse fields from JSONObject
    return {
      ...data.model,
      fields: Array.isArray(data.model.fields) ? data.model.fields : [],
    };
  }

  async createModel(modelInput: ModelInput): Promise<{ id: string; name: string }> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    const query = `
      mutation CreateModel($body: CreateModelInput!) {
        createModel(body: $body) {
          id
          name
        }
      }
    `;

    const data = await this.graphqlRequest<CreateModelResponse>(query, {
      body: modelInput,
    });

    return data.createModel;
  }

  async updateModel(
    modelId: string,
    updates: ModelInput
  ): Promise<{ id: string; name: string }> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    // UpdateModelInput: { id: String, data: JSONObject }
    // Note: name and kind are immutable, only fields can be updated
    const query = `
      mutation UpdateModel($body: UpdateModelInput!) {
        updateModel(body: $body) {
          id
          name
        }
      }
    `;

    const data = await this.graphqlRequest<UpdateModelResponse>(query, {
      body: {
        id: modelId,
        data: {
          fields: updates.fields,
          // name and kind cannot be updated - they are immutable
        },
      },
    });

    return data.updateModel;
  }

  async deleteModel(modelId: string): Promise<boolean> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    // Try with body parameter structure if modelId doesn't work
    const query = `
      mutation DeleteModel($body: DeleteModelInput!) {
        deleteModel(body: $body) {
          success
        }
      }
    `;

    const data = await this.graphqlRequest<DeleteModelResponse>(query, {
      body: {
        id: modelId,
      },
    });

    return data.deleteModel.success;
  }

  // Content CRUD Operations (REST API)

  async getContent(
    modelName: string,
    params: ContentQueryParams = {}
  ): Promise<BuilderContent[]> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    const queryParams = new URLSearchParams({
      apiKey: credentials.publicKey,
      limit: String(params.limit || 100),
      includeUnpublished: 'true', // Include draft content
      ...(params.offset && { offset: String(params.offset) }),
      ...(params.query && { query: JSON.stringify(params.query) }),
      ...(params.fields && { fields: params.fields }),
      ...(params.omit && { omit: params.omit }),
      ...(params.enrich !== undefined && { enrich: String(params.enrich) }),
    });

    const url = `${CONTENT_API_ENDPOINT}/${modelName}?${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.privateKey}`, // Use private key to access drafts
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  async getContentById(modelName: string, contentId: string): Promise<BuilderContent | null> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    const queryParams = new URLSearchParams({
      apiKey: credentials.publicKey,
      query: JSON.stringify({ id: contentId }),
      includeUnpublished: 'true', // Include draft content
    });

    const url = `${CONTENT_API_ENDPOINT}/${modelName}?${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.privateKey}`, // Use private key to access drafts
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.results?.[0] || null;
  }

  async createContent(modelName: string, content: ContentInput): Promise<BuilderContent> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    const url = `${WRITE_API_ENDPOINT}/${modelName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.privateKey}`,
      },
      body: JSON.stringify(content),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    return await response.json();
  }

  async updateContent(
    modelName: string,
    contentId: string,
    updates: Partial<ContentInput>
  ): Promise<BuilderContent> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    const url = `${WRITE_API_ENDPOINT}/${modelName}/${contentId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.privateKey}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    return await response.json();
  }

  async deleteContent(modelName: string, contentId: string): Promise<boolean> {
    const credentials = this.loadCredentials();
    if (!credentials) throw new Error('Not authenticated');

    const url = `${WRITE_API_ENDPOINT}/${modelName}/${contentId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${credentials.privateKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  }
}

export const builderApi = new BuilderApiService();
