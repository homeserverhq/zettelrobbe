/**
 * Assertion test for the editable "Pre-existing ..." preamble.
 *
 * The hard-coded "Pre-existing tags / correspondents / document types" block
 * became a full prompt template (config.preExistingDataPromptTemplate) that
 * PRE_EXISTING_DATA_PROMPT can override. The {{ALL_TAGS}},
 * {{ALL_CORRESPONDENTS}} and {{ALL_DOCUMENT_TYPES}} placeholders resolve
 * dynamically anywhere in the assembled prompt.
 *
 * Guarantees:
 *   - an unset/empty PRE_EXISTING_DATA_PROMPT reproduces the previous
 *     hard-coded prefix (no behavior change for existing installs)
 *   - a configured prompt is used instead and is subject to the same
 *     USE_EXISTING_DATA gating as before
 *   - the {{ALL_*}} placeholders resolve for entity objects and plain names,
 *     collapse to empty for empty lists, and also work in SYSTEM_PROMPT
 */
const assert = require('assert');

const config = require('../config/config');
const ollamaService = require('../services/ollamaService');
const RestrictionPromptService = require('../services/restrictionPromptService');

const TAG_OBJECTS = [
  { id: 1, name: 'invoice' },
  { id: 2, name: 'contract' },
  { id: 3, name: 'insurance' },
];
const TAG_NAMES = TAG_OBJECTS.map((tag) => tag.name);

const CORRESPONDENT_OBJECTS = [
  { id: 7, name: 'Acme Corp' },
  { id: 8, name: 'City Utilities' },
];
const DOCUMENT_TYPE_OBJECTS = [
  { id: 4, name: 'Offer' },
  { id: 5, name: 'Notice' },
];

function buildPromptEnv() {
  process.env.CUSTOM_FIELDS = JSON.stringify({ custom_fields: [] });
  process.env.USE_PROMPT_TAGS = 'no';
}

function testDefaultTemplateRendersCurrentBlock() {
  // No PRE_EXISTING_DATA_PROMPT: the default template must resolve to exactly
  // the "Pre-existing ..." prefix the services hard-coded before.
  delete process.env.PRE_EXISTING_DATA_PROMPT;
  process.env.SYSTEM_PROMPT = 'Analyze the document.';
  config.useExistingData = 'yes';
  config.restrictToExistingTags = 'no';
  config.restrictToExistingCorrespondents = 'no';

  const prompt = ollamaService._buildPrompt(
    'document content',
    TAG_OBJECTS,
    CORRESPONDENT_OBJECTS,
    DOCUMENT_TYPE_OBJECTS
  );

  assert.ok(
    prompt.includes('Pre-existing tags: invoice, contract, insurance'),
    'default template must render the tag names after the "Pre-existing tags:" label'
  );
  assert.ok(
    prompt.includes('Pre-existing correspondents: Acme Corp, City Utilities'),
    'default template must render correspondent names'
  );
  assert.ok(
    prompt.includes('Pre-existing document types: Offer, Notice'),
    'default template must render document type names'
  );
  assert.ok(
    !prompt.includes('{{ALL_TAGS}}') &&
      !prompt.includes('{{ALL_DOCUMENT_TYPES}}'),
    'all placeholders must be resolved'
  );
}

function testCustomPromptOverridesDefault() {
  process.env.PRE_EXISTING_DATA_PROMPT =
    'Known tags: {{ALL_TAGS}}\nKnown senders: {{ALL_CORRESPONDENTS}}';
  process.env.SYSTEM_PROMPT = 'Analyze the document.';
  config.useExistingData = 'yes';
  config.restrictToExistingTags = 'no';
  config.restrictToExistingCorrespondents = 'no';

  const prompt = ollamaService._buildPrompt(
    'document content',
    TAG_NAMES,
    CORRESPONDENT_OBJECTS.map((entry) => entry.name),
    DOCUMENT_TYPE_OBJECTS.map((entry) => entry.name)
  );

  assert.ok(
    prompt.includes('Known tags: invoice, contract, insurance'),
    'custom preamble must be used with resolved tag names'
  );
  assert.ok(
    prompt.includes('Known senders: Acme Corp, City Utilities'),
    'custom preamble must resolve correspondent names'
  );
  assert.ok(
    !prompt.includes('Pre-existing tags:'),
    'custom preamble must replace, not add to, the default block'
  );
}

function testGatedByUseExistingData() {
  process.env.PRE_EXISTING_DATA_PROMPT =
    'Known tags: {{ALL_TAGS}}\nKnown senders: {{ALL_CORRESPONDENTS}}';
  process.env.SYSTEM_PROMPT = 'Analyze the document.';
  config.useExistingData = 'no';

  const prompt = ollamaService._buildPrompt(
    'document content',
    TAG_OBJECTS,
    CORRESPONDENT_OBJECTS,
    DOCUMENT_TYPE_OBJECTS
  );

  assert.ok(
    !prompt.includes('Pre-existing tags:') && !prompt.includes('Known tags:'),
    'the preamble only applies when USE_EXISTING_DATA is enabled'
  );
}

function testPlaceholdersWorkInSystemPrompt() {
  process.env.SYSTEM_PROMPT =
    'You may use existing tags: {{ALL_TAGS}}; senders: {{ ALL_CORRESPONDENTS }}';
  config.useExistingData = 'no';

  const prompt = ollamaService._buildPrompt(
    'document content',
    TAG_OBJECTS,
    CORRESPONDENT_OBJECTS,
    DOCUMENT_TYPE_OBJECTS
  );

  assert.ok(
    prompt.includes('You may use existing tags: invoice, contract, insurance'),
    '{{ALL_TAGS}} must resolve inside SYSTEM_PROMPT'
  );
  assert.ok(
    prompt.includes('senders: Acme Corp, City Utilities'),
    'whitespace-tolerant {{ ALL_CORRESPONDENTS }} must resolve inside SYSTEM_PROMPT'
  );
}

function testEmptyDataCollapsesPlaceholders() {
  assert.strictEqual(
    RestrictionPromptService.processRestrictionsInPrompt(
      'Tags: {{ALL_TAGS}}; Senders: {{ALL_CORRESPONDENTS}}; Types: {{ALL_DOCUMENT_TYPES}}',
      [],
      undefined,
      null
    ),
    'Tags: ; Senders: ; Types: ',
    'empty/missing lists must collapse to empty replacements'
  );
}

function testEmptyEnvFallsBackToDefault() {
  process.env.PRE_EXISTING_DATA_PROMPT = '';
  process.env.SYSTEM_PROMPT = 'Analyze the document.';
  config.useExistingData = 'yes';
  config.restrictToExistingTags = 'no';
  config.restrictToExistingCorrespondents = 'no';

  const prompt = ollamaService._buildPrompt(
    'document content',
    TAG_OBJECTS,
    CORRESPONDENT_OBJECTS,
    DOCUMENT_TYPE_OBJECTS
  );

  assert.ok(
    prompt.includes('Pre-existing tags: invoice, contract, insurance'),
    'an empty PRE_EXISTING_DATA_PROMPT must fall back to the default block'
  );
}

function main() {
  const originalEnv = {
    SYSTEM_PROMPT: process.env.SYSTEM_PROMPT,
    CUSTOM_FIELDS: process.env.CUSTOM_FIELDS,
    USE_PROMPT_TAGS: process.env.USE_PROMPT_TAGS,
    PRE_EXISTING_DATA_PROMPT: process.env.PRE_EXISTING_DATA_PROMPT,
  };
  const originalConfig = {
    useExistingData: config.useExistingData,
    restrictToExistingTags: config.restrictToExistingTags,
    restrictToExistingCorrespondents: config.restrictToExistingCorrespondents,
  };

  try {
    buildPromptEnv();
    testDefaultTemplateRendersCurrentBlock();
    testCustomPromptOverridesDefault();
    testGatedByUseExistingData();
    testPlaceholdersWorkInSystemPrompt();
    testEmptyDataCollapsesPlaceholders();
    testEmptyEnvFallsBackToDefault();
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    Object.assign(config, originalConfig);
  }
}

try {
  main();
  console.log(
    '[PASS] PRE_EXISTING_DATA_PROMPT renders and {{ALL_*}} placeholders resolve'
  );
} catch (error) {
  console.error('[FAIL] Pre-existing data prompt test failed:', error.message);
  process.exitCode = 1;
}
