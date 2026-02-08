import type { SchemaType } from './types.js';

const SCHEMA_METADATA_KEY = Symbol('schemaFields');

export function schema(type: SchemaType) {
  return function (target: any, propertyKey: string) {
    const constructor = target.constructor;
    if (!constructor.hasOwnProperty(SCHEMA_METADATA_KEY)) {
      // Copy parent schema fields if inheriting
      const parentFields = constructor[SCHEMA_METADATA_KEY]
        ? { ...constructor[SCHEMA_METADATA_KEY] }
        : {};
      Object.defineProperty(constructor, SCHEMA_METADATA_KEY, {
        value: parentFields,
        writable: true,
        enumerable: false,
      });
    }
    constructor[SCHEMA_METADATA_KEY][propertyKey] = type;
  };
}

export function getSchemaFields(EntityClass: any): Record<string, SchemaType> {
  return EntityClass[SCHEMA_METADATA_KEY] || {};
}
