import { LitElement, html, css } from 'lit';
import { jwtDecode } from 'jwt-decode';

/**
 * Dynamic Form Builder Web Component
 * Fetches JSON schema and form data, then renders a dynamic form
 *
 * @element form-builder
 *
 * @attr {string} fbms-base-url - Base URL of the form builder microservice
 * @attr {string} fbms-form-fname - Form name to fetch
 * @attr {string} oidc-url - OpenID Connect URL for authentication
 * @attr {string} styles - Optional custom CSS styles
 */
class FormBuilder extends LitElement {
  static properties = {
    fbmsBaseUrl: { type: String, attribute: 'fbms-base-url' },
    fbmsFormFname: { type: String, attribute: 'fbms-form-fname' },
    oidcUrl: { type: String, attribute: 'oidc-url' },
    customStyles: { type: String, attribute: 'styles' },

    // Internal state
    schema: { type: Object, state: true },
    formData: { type: Object, state: true },
    uiSchema: { type: Object, state: true },
    fbmsFormVersion: { type: String, state: true },
    loading: { type: Boolean, state: true },
    submitting: { type: Boolean, state: true },
    error: { type: String, state: true },
    token: { type: String, state: true },
    decoded: { type: Object, state: true },
  };

  static styles = css`
    :host {
      display: block;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .error {
      background-color: #fee;
      border: 1px solid #fcc;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      color: #c00;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .nested-object {
      margin-left: 20px;
      padding-left: 20px;
      border-left: 2px solid #e0e0e0;
      margin-top: 10px;
    }

    .nested-object-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
    }

    .nested-object-description {
      font-size: 0.875rem;
      color: #666;
      margin-bottom: 15px;
    }

    label {
      font-weight: 500;
      color: #333;
    }

    .required::after {
      content: ' *';
      color: #c00;
    }

    .description {
      font-size: 0.875rem;
      color: #666;
      margin-top: 4px;
    }

    input[type='text'],
    input[type='email'],
    input[type='number'],
    input[type='date'],
    input[type='tel'],
    textarea,
    select {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
    }

    input:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
    }

    select[multiple] {
      min-height: 120px;
      padding: 4px;
    }

    select[multiple] option {
      padding: 4px 8px;
    }

    textarea {
      min-height: 100px;
      resize: vertical;
    }

    input[type='checkbox'],
    input[type='radio'] {
      margin-right: 8px;
    }

    fieldset {
      border: none;
      padding: 0;
      margin: 0;
      min-width: 0; /* Fix for some browsers */
    }

    legend {
      font-weight: 500;
      color: #333;
      padding: 0;
      margin-bottom: 8px;
      font-size: 1rem;
    }

    .checkbox-group,
    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checkbox-item,
    .radio-item {
      display: flex;
      align-items: center;
    }

    .checkbox-group.inline,
    .radio-group.inline {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 16px;
    }

    .checkbox-group.inline .checkbox-item,
    .radio-group.inline .radio-item {
      margin-right: 0;
    }

    .error-message {
      color: #c00;
      font-size: 0.875rem;
      margin-top: 4px;
    }

    .buttons {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 0.2s;
    }

    button[type='submit'] {
      background-color: #0066cc;
      color: white;
    }

    button[type='submit']:hover {
      background-color: #0052a3;
    }

    button[type='button'] {
      background-color: #c0c0c0;
      color: #333;
    }

    button[type='button']:hover {
      background-color: #e0e0e0;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner {
      display: inline-block;
      width: 1em;
      height: 1em;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
      vertical-align: middle;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .button-content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `;

  constructor() {
    super();
    this.loading = true;
    this.submitting = false;
    this.error = null;
    this.schema = null;
    this.formData = {};
    this.uiSchema = null;
    this.fbmsFormVersion = null;
    this.token = null;
    this.decoded = { sub: 'unknown' };
    this.fieldErrors = {};
  }

  async connectedCallback() {
    super.connectedCallback();
    await this.initialize();
  }

  async initialize() {
    try {
      this.loading = true;
      this.error = null;

      // Fetch OIDC token if URL provided
      if (this.oidcUrl) {
        await this.fetchToken();
      }

      // Fetch form schema and data
      await Promise.all([this.fetchSchema(), this.fetchFormData()]);

      this.loading = false;
    } catch (err) {
      this.error = err.message || 'Failed to initialize form';
      this.loading = false;
    }
  }

  async fetchToken() {
    try {
      const response = await fetch(this.oidcUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate');
      }

      const data = await response.text();
      this.token = data;
      try {
        this.decoded = jwtDecode(this.token);
      } catch (_err) {
        // Only need this to get the name, so warn
        console.warn('Security Token failed to decode -- setting user to unknown');
        this.decoded = { sub: 'unknown' };
      }
    } catch (err) {
      console.error('Token fetch error:', err);
      throw new Error('Authentication failed');
    }
  }

  async fetchSchema() {
    const url = `${this.fbmsBaseUrl}/api/v1/forms/${this.fbmsFormFname}`;
    const headers = {
      'content-type': 'application/jwt',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      credentials: 'same-origin',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }

    const data = await response.json();
    this.fbmsFormVersion = data.version;
    this.schema = data.schema || data;
    this.uiSchema = data.metadata;
  }

  async fetchFormData() {
    const url = `${this.fbmsBaseUrl}/api/v1/submissions/${this.fbmsFormFname}?safarifix=${Math.random()}`;
    const headers = {
      'content-type': 'application/jwt',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        credentials: 'same-origin',
        headers,
      });

      if (response.ok) {
        const payload = await response.json();
        this.formData = payload?.answers ?? {};
      } else {
        // It's OK if there's no existing data
        this.formData = {};
      }
    } catch (err) {
      // Non-critical error
      console.warn('Could not fetch form data:', err);
      this.formData = {};
    }
  }

  /**
   * Get nested value from formData using dot notation path
   * e.g., "contact_information.email" => formData.contact_information.email
   */
  getNestedValue(path) {
    if (!path || typeof path !== 'string') return undefined;

    const parts = path.split('.').filter((part) => part.length > 0);
    if (parts.length === 0) return undefined;

    let value = this.formData;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  /**
   * Sanitize a string for use as an HTML ID
   * Replaces spaces and special characters with hyphens and collapses consecutive hyphens
   * Ensures the ID starts with a letter by adding a prefix if necessary
   */
  sanitizeId(str) {
    if (typeof str !== 'string') {
      str = String(str ?? '');
    }

    // Replace invalid characters and collapse multiple hyphens
    let sanitized = str.replace(/[^a-zA-Z0-9-_.]/g, '-').replace(/-+/g, '-');

    // Trim leading/trailing hyphens that may have been introduced
    sanitized = sanitized.replace(/^-+/, '').replace(/-+$/, '');

    // Ensure we have some content
    if (!sanitized) {
      sanitized = 'id';
    }

    // Ensure the ID starts with a letter
    if (!/^[A-Za-z]/.test(sanitized)) {
      sanitized = 'id-' + sanitized;
    }

    return sanitized;
  }

  /**
   * Set nested value in formData using dot notation path
   */
  setNestedValue(path, value) {
    if (!path || typeof path !== 'string') return;

    const parts = path.split('.').filter((part) => part.length > 0);
    if (parts.length === 0) return;

    const newData = { ...this.formData };
    let current = newData;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const existing = current[part];
      // Note: Arrays are not currently supported in schemas, but we preserve them
      // to maintain data integrity. Setting properties on arrays may produce unexpected results.
      if (Array.isArray(existing)) {
        current[part] = [...existing];
      } else if (!existing || typeof existing !== 'object') {
        current[part] = {};
      } else {
        current[part] = { ...existing };
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
    this.formData = newData;
  }
  /**
   * Get the schema object at a given path
   * e.g., "contact_information" => schema.properties.contact_information
   */
  getSchemaAtPath(path) {
    if (!path) return this.schema; // Handle empty string/null/undefined

    const parts = path.split('.').filter((part) => part.length > 0);
    if (parts.length === 0) return this.schema; // All segments were empty

    let schema = this.schema;

    for (const part of parts) {
      schema = schema.properties?.[part];
      if (!schema) return null;
    }

    return schema;
  }

  handleInputChange(fieldPath, event) {
    const { type, value, checked } = event.target;
    this.setNestedValue(fieldPath, type === 'checkbox' ? checked : value);

    // Clear field error on change
    if (this.fieldErrors[fieldPath]) {
      this.fieldErrors = { ...this.fieldErrors };
      delete this.fieldErrors[fieldPath];
    }
  }

  handleArrayChange(fieldPath, index, event) {
    const currentArray = this.getNestedValue(fieldPath) || [];
    const newArray = [...currentArray];
    newArray[index] = event.target.value;
    this.setNestedValue(fieldPath, newArray);
  }

  handleMultiSelectChange(fieldPath, event) {
    const selectedOptions = Array.from(event.target.selectedOptions);
    const values = selectedOptions.map((option) => option.value);

    this.setNestedValue(fieldPath, values);

    // Clear field error on change
    if (this.fieldErrors[fieldPath]) {
      this.fieldErrors = { ...this.fieldErrors };
      delete this.fieldErrors[fieldPath];
    }
  }

  handleCheckboxArrayChange(fieldPath, optionValue, event) {
    const { checked } = event.target;
    const currentArray = this.getNestedValue(fieldPath) || [];

    let newArray;
    if (checked) {
      // Add to array if not already present
      newArray = currentArray.includes(optionValue) ? currentArray : [...currentArray, optionValue];
    } else {
      // Remove from array
      newArray = currentArray.filter((v) => v !== optionValue);
    }

    this.setNestedValue(fieldPath, newArray);

    // Clear field error on change
    if (this.fieldErrors[fieldPath]) {
      this.fieldErrors = { ...this.fieldErrors };
      delete this.fieldErrors[fieldPath];
    }
  }

  /**
   * Recursively validate form fields including nested objects
   */
  validateFormFields(properties, required = [], basePath = '', depth = 0) {
    const MAX_DEPTH = 10;
    if (depth > MAX_DEPTH) {
      console.warn(`Schema nesting exceeds maximum depth of ${MAX_DEPTH} at path: ${basePath}`);
      return {};
    }

    const errors = {};

    // Check required fields
    required.forEach((fieldName) => {
      const fieldPath = basePath ? `${basePath}.${fieldName}` : fieldName;
      const value = this.getNestedValue(fieldPath);
      if (value === undefined || value === null || value === '') {
        errors[fieldPath] = 'This field is required';
      }
    });

    // Type validation
    Object.entries(properties).forEach(([fieldName, fieldSchema]) => {
      const fieldPath = basePath ? `${basePath}.${fieldName}` : fieldName;
      const value = this.getNestedValue(fieldPath);

      // Handle nested objects recursively
      if (fieldSchema.type === 'object' && fieldSchema.properties) {
        const nestedErrors = this.validateFormFields(
          fieldSchema.properties,
          fieldSchema.required || [],
          fieldPath,
          depth + 1
        );
        Object.assign(errors, nestedErrors);
        return;
      }

      if (value !== undefined && value !== null && value !== '') {
        // Email validation
        if (fieldSchema.format === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[fieldPath] = 'Invalid email address';
          }
        }

        // Pattern validation
        if (fieldSchema.pattern) {
          const regex = new RegExp(fieldSchema.pattern);
          if (!regex.test(value)) {
            errors[fieldPath] = fieldSchema.patternErrorMessage || 'Invalid format';
          }
        }

        // Number validation
        if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
          const num = Number(value);
          if (isNaN(num)) {
            errors[fieldPath] = 'Must be a number';
          } else {
            if (fieldSchema.minimum !== undefined && num < fieldSchema.minimum) {
              errors[fieldPath] = `Must be at least ${fieldSchema.minimum}`;
            }
            if (fieldSchema.maximum !== undefined && num > fieldSchema.maximum) {
              errors[fieldPath] = `Must be at most ${fieldSchema.maximum}`;
            }
          }
        }

        // String length validation
        if (fieldSchema.type === 'string') {
          if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
            errors[fieldPath] = `Must be at least ${fieldSchema.minLength} characters`;
          }
          if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
            errors[fieldPath] = `Must be at most ${fieldSchema.maxLength} characters`;
          }
        }
      }
    });

    return errors;
  }

  validateForm() {
    const { properties = {}, required = [] } = this.schema;
    this.fieldErrors = this.validateFormFields(properties, required);
    return Object.keys(this.fieldErrors).length === 0;
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (!this.validateForm()) {
      this.requestUpdate();
      return;
    }

    // Prevent double-submission
    if (this.submitting) {
      return;
    }

    try {
      this.submitting = true;
      this.error = null;
      const body = {
        username: this.decoded.sub,
        formFname: this.fbmsFormFname,
        formVersion: this.fbmsFormVersion,
        timestamp: Date.now(),
        answers: this.formData,
      };

      const url = `${this.fbmsBaseUrl}/api/v1/submissions/${this.fbmsFormFname}`;
      const headers = {
        'content-type': 'application/json',
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit form: ${response.statusText}`);
      }

      // Dispatch success event
      this.dispatchEvent(
        new CustomEvent('form-submit-success', {
          detail: { data: body },
          bubbles: true,
          composed: true,
        })
      );

      // Optional: Reset or show success message
      this.error = null;
    } catch (err) {
      this.error = err.message || 'Failed to submit form';

      this.dispatchEvent(
        new CustomEvent('form-submit-error', {
          detail: { error: err.message },
          bubbles: true,
          composed: true,
        })
      );
    } finally {
      this.submitting = false;
    }
  }

  handleReset() {
    this.formData = {};
    this.fieldErrors = {};
    this.requestUpdate();
  }

  /**
   * Render a field - can be a simple input or a nested object
   */
  renderField(fieldName, fieldSchema, basePath = '', depth = 0) {
    const MAX_DEPTH = 10;
    if (depth > MAX_DEPTH) {
      console.warn(`Schema nesting exceeds maximum depth of ${MAX_DEPTH}`);
      return html`<div class="error">Schema too deeply nested</div>`;
    }

    const fieldPath = basePath ? `${basePath}.${fieldName}` : fieldName;

    // Handle nested objects with properties
    if (fieldSchema.type === 'object' && fieldSchema.properties) {
      return this.renderNestedObject(fieldName, fieldSchema, basePath, depth);
    }

    // Regular field
    const value = this.getNestedValue(fieldPath);
    const error = this.fieldErrors[fieldPath];
    // For nested fields, check the parent schema's required array
    const parentSchema = basePath ? this.getSchemaAtPath(basePath) : this.schema;
    const required = parentSchema?.required?.includes(fieldName) ?? false;
    const uiSchemaPath = fieldPath.split('.');
    let uiOptions = this.uiSchema;
    for (const part of uiSchemaPath) {
      uiOptions = uiOptions?.[part];
    }
    uiOptions = uiOptions || {};

    const widget = uiOptions['ui:widget'];
    const isGroupedInput = widget === 'radio' || widget === 'checkboxes';

    return html`
      <div class="form-group">
        ${!isGroupedInput
          ? html`
              <label class="${required ? 'required' : ''}" for="${fieldPath}">
                ${fieldSchema.title || fieldName}
              </label>
            `
          : ''}
        ${fieldSchema.description && !isGroupedInput
          ? html` <span class="description">${fieldSchema.description}</span> `
          : ''}
        ${this.renderInput(fieldPath, fieldSchema, value, uiOptions)}
        ${error ? html` <span class="error-message">${error}</span> ` : ''}
      </div>
    `;
  }

  /**
   * Render a nested object with its own properties
   */
  renderNestedObject(fieldName, fieldSchema, basePath = '', depth = 0) {
    const fieldPath = basePath ? `${basePath}.${fieldName}` : fieldName;

    return html`
      <div class="nested-object">
        ${fieldSchema.title
          ? html`<div class="nested-object-title">${fieldSchema.title}</div>`
          : ''}
        ${fieldSchema.description
          ? html`<div class="nested-object-description">${fieldSchema.description}</div>`
          : ''}
        ${Object.entries(fieldSchema.properties).map(([nestedFieldName, nestedFieldSchema]) =>
          this.renderField(nestedFieldName, nestedFieldSchema, fieldPath, depth + 1)
        )}
      </div>
    `;
  }

  renderInput(fieldPath, fieldSchema, value, uiOptions) {
    const { type, enum: enumValues, format, items } = fieldSchema;
    const widget = uiOptions['ui:widget'];
    const isInline = uiOptions['ui:options']?.inline;

    // Array of enums with checkboxes widget - render as checkboxes
    if (type === 'array' && items?.enum && widget === 'checkboxes') {
      const selectedValues = Array.isArray(value) ? value : [];
      const containerClass = isInline ? 'checkbox-group inline' : 'checkbox-group';

      return html`
        <fieldset class="${containerClass}">
          <legend>${fieldSchema.title || fieldPath.split('.').pop()}</legend>
          ${items.enum.map((opt) => {
            const sanitizedId = this.sanitizeId(`${fieldPath}-${opt}`);
            return html`
              <div class="checkbox-item">
                <input
                  type="checkbox"
                  id="${sanitizedId}"
                  name="${fieldPath}"
                  value="${opt}"
                  .checked="${selectedValues.includes(opt)}"
                  @change="${(e) => this.handleCheckboxArrayChange(fieldPath, opt, e)}"
                />
                <label for="${sanitizedId}">${opt}</label>
              </div>
            `;
          })}
        </fieldset>
      `;
    }

    // Array of enums without widget - render as multi-select dropdown (default)
    if (type === 'array' && items?.enum) {
      const selectedValues = Array.isArray(value) ? value : [];

      return html`
        <select
          id="${fieldPath}"
          name="${fieldPath}"
          multiple
          size="5"
          @change="${(e) => this.handleMultiSelectChange(fieldPath, e)}"
        >
          ${items.enum.map(
            (opt) => html`
              <option value="${opt}" ?selected="${selectedValues.includes(opt)}">${opt}</option>
            `
          )}
        </select>
      `;
    }

    // Enum with radio widget - render as radio buttons
    if (enumValues && widget === 'radio') {
      const containerClass = isInline ? 'radio-group inline' : 'radio-group';

      return html`
        <fieldset class="${containerClass}">
          <legend>${fieldSchema.title || fieldPath.split('.').pop()}</legend>
          ${enumValues.map((opt) => {
            const sanitizedId = this.sanitizeId(`${fieldPath}-${opt}`);
            return html`
              <div class="radio-item">
                <input
                  type="radio"
                  id="${sanitizedId}"
                  name="${fieldPath}"
                  value="${opt}"
                  .checked="${value === opt}"
                  @change="${(e) => this.handleInputChange(fieldPath, e)}"
                />
                <label for="${sanitizedId}">${opt}</label>
              </div>
            `;
          })}
        </fieldset>
      `;
    }

    // Enum - render as select (default)
    if (enumValues) {
      return html`
        <select
          id="${fieldPath}"
          name="${fieldPath}"
          .value="${value || ''}"
          @change="${(e) => this.handleInputChange(fieldPath, e)}"
        >
          <option value="">-- Select --</option>
          ${enumValues.map(
            (opt) => html` <option value="${opt}" ?selected="${value === opt}">${opt}</option> `
          )}
        </select>
      `;
    }

    // Boolean - render as checkbox
    if (type === 'boolean') {
      return html`
        <div class="checkbox-item">
          <input
            type="checkbox"
            id="${fieldPath}"
            name="${fieldPath}"
            .checked="${!!value}"
            @change="${(e) => this.handleInputChange(fieldPath, e)}"
          />
          <label for="${fieldPath}">${fieldSchema.title || fieldPath.split('.').pop()}</label>
        </div>
      `;
    }

    // String with format
    if (type === 'string') {
      if (format === 'email') {
        return html`
          <input
            type="email"
            id="${fieldPath}"
            name="${fieldPath}"
            .value="${value || ''}"
            @input="${(e) => this.handleInputChange(fieldPath, e)}"
          />
        `;
      }

      if (format === 'date') {
        return html`
          <input
            type="date"
            id="${fieldPath}"
            name="${fieldPath}"
            .value="${value || ''}"
            @input="${(e) => this.handleInputChange(fieldPath, e)}"
          />
        `;
      }

      if (uiOptions['ui:widget'] === 'textarea') {
        return html`
          <textarea
            id="${fieldPath}"
            name="${fieldPath}"
            .value="${value || ''}"
            @input="${(e) => this.handleInputChange(fieldPath, e)}"
          ></textarea>
        `;
      }

      // Default text input
      return html`
        <input
          type="text"
          id="${fieldPath}"
          name="${fieldPath}"
          .value="${value || ''}"
          @input="${(e) => this.handleInputChange(fieldPath, e)}"
        />
      `;
    }

    // Number
    if (type === 'number' || type === 'integer') {
      return html`
        <input
          type="number"
          id="${fieldPath}"
          name="${fieldPath}"
          .value="${value || ''}"
          step="${type === 'integer' ? '1' : 'any'}"
          @input="${(e) => this.handleInputChange(fieldPath, e)}"
        />
      `;
    }

    // Fallback
    return html`
      <input
        type="text"
        id="${fieldPath}"
        name="${fieldPath}"
        .value="${value || ''}"
        @input="${(e) => this.handleInputChange(fieldPath, e)}"
      />
    `;
  }

  render() {
    if (this.error) {
      return html`
        <div class="container">
          <div class="error"><strong>Error:</strong> ${this.error}</div>
        </div>
      `;
    }

    if (this.loading) {
      return html`
        <div class="container">
          <div class="loading">Loading form...</div>
        </div>
      `;
    }

    if (!this.schema || !this.schema.properties) {
      return html`
        <div class="container">
          <div class="error">Invalid form schema</div>
        </div>
      `;
    }

    return html`
      ${this.customStyles
        ? html`<style>
            ${this.customStyles}
          </style>`
        : ''}

      <div class="container">
        <form @submit="${this.handleSubmit}">
          ${this.schema.title ? html`<h2>${this.schema.title}</h2>` : ''}
          ${this.schema.description ? html`<p>${this.schema.description}</p>` : ''}
          ${Object.entries(this.schema.properties).map(([fieldName, fieldSchema]) =>
            this.renderField(fieldName, fieldSchema)
          )}

          <div class="buttons">
            <button type="submit" ?disabled="${this.submitting}">
              <span class="button-content">
                ${this.submitting ? html`<span class="spinner"></span>` : ''}
                ${this.submitting ? 'Submitting...' : 'Submit'}
              </span>
            </button>
            <button type="button" @click="${this.handleReset}" ?disabled="${this.submitting}">
              Reset
            </button>
          </div>
        </form>
      </div>
    `;
  }
}

customElements.define('form-builder', FormBuilder);
