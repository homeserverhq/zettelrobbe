const { toNameList } = require('./serviceUtils');

/**
 * Service for handling placeholder replacement in prompts
 * Used by all LLM services to ensure consistent placeholder handling
 */
class RestrictionPromptService {
  /**
   * Process placeholders in a prompt by replacing them with actual data
   * @param {string} prompt - The original prompt that may contain placeholders
   * @param {Array|string} existingTags - List of existing tags
   * @param {Array|string} existingCorrespondentList - List of existing correspondents
   * @param {Array|string} existingDocumentTypesList - List of existing document types
   * @returns {string} - Prompt with placeholders replaced
   */
  static processRestrictionsInPrompt(
    prompt,
    existingTags,
    existingCorrespondentList,
    existingDocumentTypesList
  ) {
    // Replace placeholders in the original prompt
    return this._replacePlaceholders(
      prompt,
      existingTags,
      existingCorrespondentList,
      existingDocumentTypesList
    );
  }

  /**
   * Replace placeholders in the prompt with actual data
   * @param {string} prompt - The original prompt
   * @param {Array|string} existingTags - List of existing tags
   * @param {Array|string} existingCorrespondentList - List of existing correspondents
   * @param {Array|string} existingDocumentTypesList - List of existing document types
   * @returns {string} - Prompt with placeholders replaced
   */
  static _replacePlaceholders(
    prompt,
    existingTags,
    existingCorrespondentList,
    existingDocumentTypesList
  ) {
    let processedPrompt = prompt;

    // Replace %RESTRICTED_TAGS% placeholder
    if (processedPrompt.includes('%RESTRICTED_TAGS%')) {
      const tagsList = this._formatTagsList(existingTags);
      processedPrompt = processedPrompt.replace(/%RESTRICTED_TAGS%/g, tagsList);
    }

    // Replace %RESTRICTED_CORRESPONDENTS% placeholder
    if (processedPrompt.includes('%RESTRICTED_CORRESPONDENTS%')) {
      const correspondentsList = this._formatCorrespondentsList(
        existingCorrespondentList
      );
      processedPrompt = processedPrompt.replace(
        /%RESTRICTED_CORRESPONDENTS%/g,
        correspondentsList
      );
    }

    // Replace %RESTRICTED_DOCUMENT_TYPES% placeholder
    if (processedPrompt.includes('%RESTRICTED_DOCUMENT_TYPES%')) {
      const documentTypesList = this._formatDocumentTypesList(
        existingDocumentTypesList
      );
      processedPrompt = processedPrompt.replace(
        /%RESTRICTED_DOCUMENT_TYPES%/g,
        documentTypesList
      );
    }

    // Replace {{ALL_TAGS}} placeholder. Unlike %RESTRICTED_TAGS% this lists
    // every existing tag, not a restriction set; it is the templated form of
    // the "Pre-existing tags:" preamble. Whitespace inside the braces is
    // tolerated so both {{ALL_TAGS}} and {{ ALL_TAGS }} resolve.
    if (/{{\s*ALL_TAGS\s*}}/.test(processedPrompt)) {
      processedPrompt = processedPrompt.replace(
        /{{\s*ALL_TAGS\s*}}/g,
        this._formatTagsList(existingTags)
      );
    }

    // Replace {{ALL_CORRESPONDENTS}} placeholder
    if (/{{\s*ALL_CORRESPONDENTS\s*}}/.test(processedPrompt)) {
      processedPrompt = processedPrompt.replace(
        /{{\s*ALL_CORRESPONDENTS\s*}}/g,
        this._formatCorrespondentsList(existingCorrespondentList)
      );
    }

    // Replace {{ALL_DOCUMENT_TYPES}} placeholder
    if (/{{\s*ALL_DOCUMENT_TYPES\s*}}/.test(processedPrompt)) {
      processedPrompt = processedPrompt.replace(
        /{{\s*ALL_DOCUMENT_TYPES\s*}}/g,
        this._formatDocumentTypesList(existingDocumentTypesList)
      );
    }

    return processedPrompt;
  }

  /**
   * Format tags list into a comma-separated string.
   *
   * Callers pass either entity objects (paperlessService.getTags()) or plain
   * names (the scan loop and the OCR fallback already map them), so both shapes
   * have to be accepted - matching only on `tag.name` silently dropped every
   * entry of a string list and rendered the placeholder empty.
   *
   * @param {Array|string} existingTags - List of existing tags
   * @returns {string} - Comma-separated list of tag names or empty string
   */
  static _formatTagsList(existingTags) {
    return toNameList(existingTags).join(', ');
  }

  /**
   * Format correspondents list into a comma-separated string
   * @param {Array|string} existingCorrespondentList - List of existing correspondents
   * @returns {string} - Comma-separated list of correspondent names or empty string
   */
  static _formatCorrespondentsList(existingCorrespondentList) {
    return toNameList(existingCorrespondentList).join(', ');
  }

  /**
   * Format document types list into a comma-separated string
   * @param {Array|string} existingDocumentTypesList - List of existing document types
   * @returns {string} - Comma-separated list of document type names or empty string
   */
  static _formatDocumentTypesList(existingDocumentTypesList) {
    return toNameList(existingDocumentTypesList).join(', ');
  }
}

module.exports = RestrictionPromptService;
