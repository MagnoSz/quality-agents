// Small JSON Schema subset validator (type, required, properties, items,
// enum, pattern, minLength, minItems). Enough for the schemas in schemas/,
// keeps the repository free of npm dependencies.

export function validateSchema(schema, value, path = '$') {
  const errors = [];
  check(schema, value, path, errors);
  return errors;
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function check(schema, value, path, errors) {
  if (schema.type && typeOf(value) !== schema.type) {
    errors.push(`${path}: expected ${schema.type}, got ${typeOf(value)}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: must be one of ${schema.enum.join(', ')}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: shorter than ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: does not match ${schema.pattern}`);
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: needs at least ${schema.minItems} item(s)`);
    }
    if (schema.items) value.forEach((item, i) => check(schema.items, item, `${path}[${i}]`, errors));
  }
  if (typeOf(value) === 'object') {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}: missing required property "${key}"`);
    }
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (key in value) check(sub, value[key], `${path}.${key}`, errors);
    }
  }
}
