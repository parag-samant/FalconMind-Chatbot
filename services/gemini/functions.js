/**
 * FalconMind — Gemini Function Declarations
 *
 * Converts the OpenAI-format function definitions to Gemini's
 * functionDeclarations format, which uses uppercase type names.
 *
 * Gemini format: { name, description, parameters: { type: 'OBJECT', properties, required } }
 */

'use strict';

const { FUNCTIONS } = require('../openai/functions');

/**
 * Recursively convert JSON Schema to Gemini format.
 * Key differences: types are uppercase, "default" key is dropped.
 */
function convertSchema(schema) {
    if (!schema || typeof schema !== 'object') return schema;

    const result = {};

    for (const [key, value] of Object.entries(schema)) {
        if (key === 'type' && typeof value === 'string') {
            result.type = value.toUpperCase();
        } else if (key === 'properties' && value && typeof value === 'object') {
            result.properties = {};
            for (const [propName, propValue] of Object.entries(value)) {
                result.properties[propName] = convertSchema(propValue);
            }
        } else if (key === 'items') {
            result.items = convertSchema(value);
        } else if (key === 'default') {
            // Gemini doesn't support 'default' in function schemas — skip
        } else {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Returns function declarations in Gemini format.
 * @returns {Array} Array of Gemini functionDeclaration objects
 */
function getFunctionDeclarations() {
    return FUNCTIONS.map((fn) => ({
        name: fn.name,
        description: fn.description,
        parameters: convertSchema(fn.parameters),
    }));
}

const DESTRUCTIVE_FUNCTIONS = new Set(
    FUNCTIONS
        .filter((fn) => fn.description.includes('[DESTRUCTIVE]'))
        .map((fn) => fn.name)
);

module.exports = { getFunctionDeclarations, DESTRUCTIVE_FUNCTIONS };
