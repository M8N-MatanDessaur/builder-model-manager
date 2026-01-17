import type { BuilderModel, BuilderContent } from '../types/builder';

/**
 * Normalizes the field order in content data to match the model's field definition order.
 * This ensures consistent field ordering regardless of Builder.io's internal field update tracking.
 *
 * @param data - The content data object with potentially unordered fields
 * @param model - The model definition that specifies the canonical field order
 * @returns A new object with fields ordered according to the model, followed by any extra fields
 */
export function normalizeFieldOrder(
  data: Record<string, any>,
  model: BuilderModel
): Record<string, any> {
  const normalized: Record<string, any> = {};
  const modelFieldNames = new Set(model.fields.map(f => f.name));

  // First, add all fields in the order defined by the model
  model.fields.forEach(field => {
    if (field.name in data) {
      normalized[field.name] = data[field.name];
    }
  });

  // Then, add any extra fields not defined in the model (to preserve data integrity)
  Object.keys(data).forEach(key => {
    if (!modelFieldNames.has(key)) {
      normalized[key] = data[key];
    }
  });

  return normalized;
}

/**
 * Normalizes the data field in a BuilderContent object to match the model's field order.
 *
 * @param content - The content entry to normalize
 * @param model - The model definition
 * @returns A new content object with normalized field order
 */
export function normalizeContentFieldOrder(
  content: BuilderContent,
  model: BuilderModel
): BuilderContent {
  return {
    ...content,
    data: normalizeFieldOrder(content.data, model)
  };
}
