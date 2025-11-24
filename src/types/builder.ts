// Builder.io Admin API Types

export interface BuilderCredentials {
  privateKey: string;
  publicKey: string;
}

export interface BuilderField {
  name: string;
  type: FieldType;
  required?: boolean;
  defaultValue?: any;
  helperText?: string;
  validations?: any[];
  subType?: string;
  subFields?: BuilderField[];
  model?: string;
}

export type FieldType =
  | 'string'
  | 'text'
  | 'richText'
  | 'number'
  | 'boolean'
  | 'date'
  | 'file'
  | 'reference'
  | 'list'
  | 'object'
  | 'color'
  | 'url'
  | 'email';

export type ModelKind = 'component' | 'page' | 'data' | 'section';

export interface BuilderModel {
  id?: string;
  name: string;
  kind: ModelKind;
  fields: BuilderField[];
  lastUpdated?: string;
  archived?: boolean;
}

// Helper function to format model name to display name
export function getModelDisplayName(model: BuilderModel): string {
  return model.name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export interface ModelInput {
  name: string;
  kind: ModelKind;
  fields: BuilderField[];
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
  }>;
}

export interface GetModelsResponse {
  models: BuilderModel[];
}

export interface GetModelResponse {
  model: BuilderModel;
}

export interface CreateModelResponse {
  createModel: {
    id: string;
    name: string;
  };
}

export interface UpdateModelResponse {
  updateModel: {
    id: string;
    name: string;
  };
}

export interface DeleteModelResponse {
  deleteModel: {
    success: boolean;
  };
}

// Content Entry Types
export interface BuilderContent {
  id?: string;
  name: string;
  modelName: string;
  published?: 'draft' | 'published' | 'archived';
  data: Record<string, any>;
  meta?: {
    lastPreviewUrl?: string;
    hasLinks?: boolean;
  };
  createdDate?: number;
  lastUpdated?: number;
  firstPublished?: number;
  lastPublished?: number;
  createdBy?: string;
  lastUpdatedBy?: string;
}

export interface ContentInput {
  name: string;
  data: Record<string, any>;
  published?: 'draft' | 'published' | 'archived';
}

export interface ContentQueryParams {
  limit?: number;
  offset?: number;
  query?: Record<string, any>;
  fields?: string;
  omit?: string;
  enrich?: boolean;
}

export interface BuilderOrganization {
  id: string;
  name: string;
}

export interface GetOrganizationResponse {
  organization: BuilderOrganization;
}
