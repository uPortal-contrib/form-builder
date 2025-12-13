import { LitElement, html, css } from 'lit';

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
export class FormBuilder extends LitElement {
  static properties = {
    fbmsBaseUrl: { type: String, attribute: 'fbms-base-url' },
    fbmsFormFname: { type: String, attribute: 'fbms-form-fname' },
    oidcUrl: { type: String, attribute: 'oidc-url' },
    customStyles: { type: String, attribute: 'styles' },
    
    // Internal state
    schema: { type: Object, state: true },
    formData: { type: Object, state: true },
    uiSchema: { type: Object, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    token: { type: String, state: true },
  };

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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

    input[type="text"],
    input[type="email"],
    input[type="number"],
    input[type="date"],
    input[type="tel"],
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

    textarea {
      min-height: 100px;
      resize: vertical;
    }

    input[type="checkbox"],
    input[type="radio"] {
      margin-right: 8px;
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

    button[type="submit"] {
      background-color: #0066cc;
      color: white;
    }

    button[type="submit"]:hover {
      background-color: #0052a3;
    }

    button[type="button"] {
      background-color: #f0f0f0;
      color: #333;
    }

    button[type="button"]:hover {
      background-color: #e0e0e0;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  constructor() {
    super();
    this.loading = true;
    this.error = null;
    this.schema = null;
    this.formData = {};
    this.uiSchema = null;
    this.token = null;
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
      await Promise.all([
        this.fetchSchema(),
        this.fetchFormData(),
      ]);

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

      const data = await response.json();
      this.token = data.token || data.access_token;
    } catch (err) {
      console.error('Token fetch error:', err);
      throw new Error('Authentication failed');
    }
  }

  async fetchSchema() {
    const url = `${this.fbmsBaseUrl}/api/v1/forms/${this.fbmsFormFname}/schema`;
    const headers = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }

    const data = await response.json();
    this.schema = data.schema || data;
    this.uiSchema = data.uiSchema;
  }

  async fetchFormData() {
    const url = `${this.fbmsBaseUrl}/api/v1/forms/${this.fbmsFormFname}/data`;
    const headers = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers,
      });

      if (response.ok) {
        this.formData = await response.json();
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

  handleInputChange(fieldName, event) {
    const { type, value, checked } = event.target;
    
    this.formData = {
      ...this.formData,
      [fieldName]: type === 'checkbox' ? checked : value,
    };

    // Clear field error on change
    if (this.fieldErrors[fieldName]) {
      this.fieldErrors = { ...this.fieldErrors };
      delete this.fieldErrors[fieldName];
    }
  }

  handleArrayChange(fieldName, index, event) {
    const currentArray = this.formData[fieldName] || [];
    const newArray = [...currentArray];
    newArray[index] = event.target.value;
    
    this.formData = {
      ...this.formData,
      [fieldName]: newArray,
    };
  }

  validateForm() {
    const errors = {};
    const { properties = {}, required = [] } = this.schema;

    // Check required fields
    required.forEach(fieldName => {
      const value = this.formData[fieldName];
      if (value === undefined || value === null || value === '') {
        errors[fieldName] = 'This field is required';
      }
    });

    // Type validation
    Object.entries(properties).forEach(([fieldName, fieldSchema]) => {
      const value = this.formData[fieldName];
      
      if (value !== undefined && value !== null && value !== '') {
        // Email validation
        if (fieldSchema.format === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[fieldName] = 'Invalid email address';
          }
        }

        // Number validation
        if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
          const num = Number(value);
          if (isNaN(num)) {
            errors[fieldName] = 'Must be a number';
          } else {
            if (fieldSchema.minimum !== undefined && num < fieldSchema.minimum) {
              errors[fieldName] = `Must be at least ${fieldSchema.minimum}`;
            }
            if (fieldSchema.maximum !== undefined && num > fieldSchema.maximum) {
              errors[fieldName] = `Must be at most ${fieldSchema.maximum}`;
            }
          }
        }

        // String length validation
        if (fieldSchema.type === 'string') {
          if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
            errors[fieldName] = `Must be at least ${fieldSchema.minLength} characters`;
          }
          if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
            errors[fieldName] = `Must be at most ${fieldSchema.maxLength} characters`;
          }
        }
      }
    });

    this.fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (!this.validateForm()) {
      this.requestUpdate();
      return;
    }

    try {
      const url = `${this.fbmsBaseUrl}/api/v1/forms/${this.fbmsFormFname}/data`;
      const headers = {
        'Content-Type': 'application/json',
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(this.formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit form: ${response.statusText}`);
      }

      // Dispatch success event
      this.dispatchEvent(new CustomEvent('form-submit-success', {
        detail: { data: this.formData },
        bubbles: true,
        composed: true,
      }));

      // Optional: Reset or show success message
      this.error = null;
    } catch (err) {
      this.error = err.message || 'Failed to submit form';
      
      this.dispatchEvent(new CustomEvent('form-submit-error', {
        detail: { error: err.message },
        bubbles: true,
        composed: true,
      }));
    }
  }

  handleReset() {
    this.formData = {};
    this.fieldErrors = {};
    this.requestUpdate();
  }

  renderField(fieldName, fieldSchema) {
    const value = this.formData[fieldName];
    const error = this.fieldErrors[fieldName];
    const required = this.schema.required?.includes(fieldName);
    const uiOptions = this.uiSchema?.[fieldName] || {};

    return html`
      <div class="form-group">
        <label class="${required ? 'required' : ''}" for="${fieldName}">
          ${fieldSchema.title || fieldName}
        </label>
        
        ${fieldSchema.description ? html`
          <span class="description">${fieldSchema.description}</span>
        ` : ''}

        ${this.renderInput(fieldName, fieldSchema, value, uiOptions)}

        ${error ? html`
          <span class="error-message">${error}</span>
        ` : ''}
      </div>
    `;
  }

  renderInput(fieldName, fieldSchema, value, uiOptions) {
    const { type, enum: enumValues, format } = fieldSchema;

    // Enum - render as select
    if (enumValues) {
      return html`
        <select
          id="${fieldName}"
          name="${fieldName}"
          .value="${value || ''}"
          @change="${(e) => this.handleInputChange(fieldName, e)}"
        >
          <option value="">-- Select --</option>
          ${enumValues.map(opt => html`
            <option value="${opt}" ?selected="${value === opt}">
              ${opt}
            </option>
          `)}
        </select>
      `;
    }

    // Boolean - render as checkbox
    if (type === 'boolean') {
      return html`
        <div class="checkbox-item">
          <input
            type="checkbox"
            id="${fieldName}"
            name="${fieldName}"
            .checked="${!!value}"
            @change="${(e) => this.handleInputChange(fieldName, e)}"
          />
          <label for="${fieldName}">${fieldSchema.title || fieldName}</label>
        </div>
      `;
    }

    // String with format
    if (type === 'string') {
      if (format === 'email') {
        return html`
          <input
            type="email"
            id="${fieldName}"
            name="${fieldName}"
            .value="${value || ''}"
            @input="${(e) => this.handleInputChange(fieldName, e)}"
          />
        `;
      }

      if (format === 'date') {
        return html`
          <input
            type="date"
            id="${fieldName}"
            name="${fieldName}"
            .value="${value || ''}"
            @input="${(e) => this.handleInputChange(fieldName, e)}"
          />
        `;
      }

      if (uiOptions['ui:widget'] === 'textarea') {
        return html`
          <textarea
            id="${fieldName}"
            name="${fieldName}"
            .value="${value || ''}"
            @input="${(e) => this.handleInputChange(fieldName, e)}"
          ></textarea>
        `;
      }

      // Default text input
      return html`
        <input
          type="text"
          id="${fieldName}"
          name="${fieldName}"
          .value="${value || ''}"
          @input="${(e) => this.handleInputChange(fieldName, e)}"
        />
      `;
    }

    // Number
    if (type === 'number' || type === 'integer') {
      return html`
        <input
          type="number"
          id="${fieldName}"
          name="${fieldName}"
          .value="${value || ''}"
          step="${type === 'integer' ? '1' : 'any'}"
          @input="${(e) => this.handleInputChange(fieldName, e)}"
        />
      `;
    }

    // Fallback
    return html`
      <input
        type="text"
        id="${fieldName}"
        name="${fieldName}"
        .value="${value || ''}"
        @input="${(e) => this.handleInputChange(fieldName, e)}"
      />
    `;
  }

  render() {
    if (this.loading) {
      return html`
        <div class="container">
          <div class="loading">Loading form...</div>
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="container">
          <div class="error">
            <strong>Error:</strong> ${this.error}
          </div>
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
      ${this.customStyles ? html`<style>${this.customStyles}</style>` : ''}
      
      <div class="container">
        <form @submit="${this.handleSubmit}">
          ${this.schema.title ? html`<h2>${this.schema.title}</h2>` : ''}
          ${this.schema.description ? html`<p>${this.schema.description}</p>` : ''}

          ${Object.entries(this.schema.properties).map(([fieldName, fieldSchema]) =>
            this.renderField(fieldName, fieldSchema)
          )}

          <div class="buttons">
            <button type="submit">Submit</button>
            <button type="button" @click="${this.handleReset}">Reset</button>
          </div>
        </form>
      </div>
    `;
  }
}

customElements.define('form-builder', FormBuilder);
