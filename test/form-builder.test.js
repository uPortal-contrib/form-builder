import { html, fixture, expect, waitUntil, oneEvent, elementUpdated } from '@open-wc/testing';
import { stub } from 'sinon';
import '../src/form-builder.js';

describe('FormBuilder', () => {
  let element;
  let fetchStub;

  // Mock responses
  const mockSchema = {
    title: 'Test Form',
    description: 'A test form',
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: {
        type: 'string',
        title: 'Full Name',
        minLength: 2,
      },
      email: {
        type: 'string',
        title: 'Email',
        format: 'email',
      },
      age: {
        type: 'integer',
        title: 'Age',
        minimum: 18,
      },
      country: {
        type: 'string',
        title: 'Country',
        enum: ['USA', 'Canada', 'Mexico'],
      },
      newsletter: {
        type: 'boolean',
        title: 'Subscribe',
      },
    },
  };

  const mockFormData = {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  };

  const mockFormDataResp = {
    formFname: 'test-form',
    formVersion: 1,
    username: 'unknown',
    answers: mockFormData,
  };

  const mockUiSchema = {
    comments: {
      'ui:widget': 'textarea',
    },
  };

  const mockSchemaResp = {
    fname: 'test-form',
    version: 1,
    schema: mockSchema,
    metadata: mockUiSchema,
  };

  beforeEach(() => {
    // Stub fetch globally
    fetchStub = stub(window, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('Initialization', () => {
    it('should render loading state initially', async () => {
      // Setup fetch stubs that never resolve (simulating slow network)
      fetchStub.returns(new Promise(() => {}));

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="test-form"></form-builder>
      `);

      const loading = element.shadowRoot.querySelector('.loading');
      expect(loading).to.exist;
      expect(loading.textContent).to.include('Loading');
    });

    it('should fetch schema and form data on connect', async () => {
      // Mock successful responses
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => mockFormDataResp,
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="test-form"></form-builder>
      `);

      // Wait for loading to complete
      await waitUntil(() => !element.loading);

      expect(fetchStub).to.have.been.calledTwice;
      expect(fetchStub.firstCall.args[0]).to.equal('/api/api/v1/forms/test-form');
      expect(
        fetchStub.secondCall.args[0].startsWith('/api/api/v1/submissions/test-form?safarifix=')
      ).to.be.true;
    });

    it('should render error state on fetch failure', async () => {
      const errorMsg = 'Network error';
      fetchStub.rejects(new Error(errorMsg));

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="test-form"></form-builder>
      `);

      await waitUntil(() => !element.loading && element.error);

      const errorDiv = element.shadowRoot.querySelector('.error');
      expect(errorDiv).to.exist;
      expect(errorDiv.textContent).to.include('Error:');
      expect(errorDiv.textContent).to.include(errorMsg);
      expect(element.error).to.equal(errorMsg);
    });
  });

  describe('Form Rendering', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => mockFormDataResp,
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="test-form"></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should render form title and description', () => {
      const title = element.shadowRoot.querySelector('h2');
      expect(title.textContent).to.equal('Test Form');

      const description = element.shadowRoot.querySelector('p');
      expect(description.textContent).to.equal('A test form');
    });

    it('should render all form fields', () => {
      const nameInput = element.shadowRoot.querySelector('input[name="name"]');
      const emailInput = element.shadowRoot.querySelector('input[name="email"]');
      const ageInput = element.shadowRoot.querySelector('input[name="age"]');
      const countrySelect = element.shadowRoot.querySelector('select[name="country"]');
      const newsletterCheckbox = element.shadowRoot.querySelector('input[name="newsletter"]');

      expect(nameInput).to.exist;
      expect(emailInput).to.exist;
      expect(ageInput).to.exist;
      expect(countrySelect).to.exist;
      expect(newsletterCheckbox).to.exist;
    });

    it('should mark required fields with asterisk', () => {
      const labels = element.shadowRoot.querySelectorAll('label.required');
      expect(labels).to.have.lengthOf(2); // name and email are required
    });

    it('should render enum as select dropdown', () => {
      const countrySelect = element.shadowRoot.querySelector('select[name="country"]');
      const options = countrySelect.querySelectorAll('option');

      expect(options).to.have.lengthOf(4); // placeholder + 3 countries
      expect(options[1].value).to.equal('USA');
      expect(options[2].value).to.equal('Canada');
      expect(options[3].value).to.equal('Mexico');
    });

    it('should render boolean as checkbox', () => {
      const checkbox = element.shadowRoot.querySelector('input[name="newsletter"]');
      expect(checkbox.type).to.equal('checkbox');
    });

    it('should render number input with correct type', () => {
      const ageInput = element.shadowRoot.querySelector('input[name="age"]');
      expect(ageInput.type).to.equal('number');
      expect(ageInput.step).to.equal('1'); // integer
    });
  });

  describe('User Input', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => mockFormDataResp,
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="test-form"></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should update formData on text input', async () => {
      const nameInput = element.shadowRoot.querySelector('input[name="name"]');

      nameInput.value = 'Jane Doe';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      await element.updateComplete;

      expect(element.formData.name).to.equal('Jane Doe');
    });

    it('should update formData on checkbox change', async () => {
      const checkbox = element.shadowRoot.querySelector('input[name="newsletter"]');

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));

      await element.updateComplete;

      expect(element.formData.newsletter).to.be.true;
    });

    it('should update formData on select change', async () => {
      const select = element.shadowRoot.querySelector('select[name="country"]');

      select.value = 'Canada';
      select.dispatchEvent(new Event('change', { bubbles: true }));

      await element.updateComplete;

      expect(element.formData.country).to.equal('Canada');
    });
  });

  describe('Validation', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="test-form"></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should show error for missing required field', async () => {
      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await element.updateComplete;

      expect(element.fieldErrors.name).to.equal('This field is required');
      expect(element.fieldErrors.email).to.equal('This field is required');

      const errorMessages = element.shadowRoot.querySelectorAll('.error-message');
      expect(errorMessages.length).to.be.at.least(2);
    });

    it('should validate email format', async () => {
      element.formData = { email: 'invalid-email' };

      const isValid = element.validateForm();

      expect(isValid).to.be.false;
      expect(element.fieldErrors.email).to.equal('Invalid email address');
    });

    it('should validate minimum value for numbers', async () => {
      element.formData = { age: 17 };

      const isValid = element.validateForm();

      expect(isValid).to.be.false;
      expect(element.fieldErrors.age).to.equal('Must be at least 18');
    });

    it('should validate string minimum length', async () => {
      element.formData = { name: 'A' };

      const isValid = element.validateForm();

      expect(isValid).to.be.false;
      expect(element.fieldErrors.name).to.equal('Must be at least 2 characters');
    });

    it('should pass validation with valid data', () => {
      element.formData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      };

      const isValid = element.validateForm();

      expect(isValid).to.be.true;
      expect(Object.keys(element.fieldErrors)).to.have.lengthOf(0);
    });

    it('should clear field error on input change', async () => {
      element.fieldErrors = { name: 'This field is required' };
      await element.updateComplete;

      const nameInput = element.shadowRoot.querySelector('input[name="name"]');
      nameInput.value = 'Jane';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      await element.updateComplete;

      expect(element.fieldErrors.name).to.be.undefined;
    });
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="test-form"></form-builder>
      `);

      await waitUntil(() => !element.loading);
      fetchStub.reset();
    });

    it('should submit valid form data', async () => {
      element.formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };
      await elementUpdated(element);
      const inputName = element.shadowRoot.querySelector('#name');
      expect(inputName.value).to.equal('John Doe');

      fetchStub.resolves({
        ok: true,
        json: async () => ({}),
      });

      const form = element.shadowRoot.querySelector('form');
      const listener = oneEvent(element, 'form-submit-success');
      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      const { detail } = await listener;

      expect(detail.data.answers).to.deep.equal(element.formData);
      expect(fetchStub).to.have.been.calledOnce;

      const [url, options] = fetchStub.firstCall.args;
      expect(url).to.equal('/api/api/v1/submissions/test-form');
      expect(options.method).to.equal('POST');
      const respBody = JSON.parse(options.body);
      expect(respBody.answers).to.deep.equal(element.formData);
      expect(respBody.formFname).to.equal('test-form');
      expect(respBody.formVersion).to.equal(1);
      expect(respBody.username).to.equal('unknown');
      expect(respBody.timestamp).to.exist;
    });

    it('should not submit invalid form', async () => {
      element.formData = {}; // Missing required fields
      await elementUpdated(element);

      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(fetchStub).to.not.have.been.called;
    });

    it('should show submitting state during submission', async () => {
      element.formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      let resolveSubmit;
      fetchStub.returns(
        new Promise((resolve) => {
          resolveSubmit = resolve;
        })
      );

      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await waitUntil(() => element.submitting);

      const submitButton = element.shadowRoot.querySelector('button[type="submit"]');
      expect(submitButton.disabled).to.be.true;
      expect(submitButton.textContent).to.include('Submitting');

      const spinner = element.shadowRoot.querySelector('.spinner');
      expect(spinner).to.exist;

      // Resolve the submission
      resolveSubmit({ ok: true, json: async () => ({}) });
      await waitUntil(() => !element.submitting);

      expect(submitButton.disabled).to.be.false;
    });

    it('should prevent double submission', async () => {
      element.formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      fetchStub.returns(new Promise(() => {})); // Never resolves

      const form = element.shadowRoot.querySelector('form');

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await waitUntil(() => element.submitting);

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(fetchStub).to.have.been.calledOnce;
    });

    it('should dispatch error event on submission failure', async () => {
      element.formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      fetchStub.resolves({
        ok: false,
        statusText: 'Bad Request',
      });

      const form = element.shadowRoot.querySelector('form');

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      const { detail } = await oneEvent(element, 'form-submit-error');

      expect(detail.error).to.include('Failed to submit form');
      expect(element.error).to.exist;
    });

    it('should include auth token in submission if provided', async () => {
      element.token = 'test-token-123';
      element.formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      fetchStub.resolves({
        ok: true,
        json: async () => ({}),
      });

      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await oneEvent(element, 'form-submit-success');

      const [, options] = fetchStub.firstCall.args;
      expect(options.headers.Authorization).to.equal('Bearer test-token-123');
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="test-form"></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should clear form data on reset', async () => {
      element.formData = { name: 'John', email: 'john@test.com' };
      element.fieldErrors = { age: 'Some error' };

      await element.updateComplete;

      const resetButton = element.shadowRoot.querySelector('button[type="button"]');
      resetButton.click();

      await element.updateComplete;

      expect(element.formData).to.deep.equal({});
      expect(element.fieldErrors).to.deep.equal({});
    });
  });

  describe('Custom Styles', () => {
    it('should inject custom styles when provided', async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder
          fbms-base-url="/api"
          fbms-form-fname="test-form"
          styles="div {color: red;}"
        ></form-builder>
      `);

      await waitUntil(() => !element.loading);

      const customStyle = element.shadowRoot.querySelector('style');
      expect(customStyle).to.exist;
      expect(customStyle.textContent).to.include('color: red');
    });
  });

  describe('OIDC Authentication', () => {
    it('should fetch token from OIDC URL', async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        text: async () => 'oidc-token-456',
        //json: async () => ({ token: 'oidc-token-456' }),
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onThirdCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder
          fbms-base-url="/api"
          fbms-form-fname="test-form"
          oidc-url="/auth/userinfo"
        ></form-builder>
      `);

      await waitUntil(() => !element.loading);

      expect(element.token).to.equal('oidc-token-456');
      expect(fetchStub.firstCall.args[0]).to.equal('/auth/userinfo');
    });
  });
});

describe('FormBuilder - Nested Objects', () => {
  let element;
  let fetchStub;

  // Mock schema with nested objects (like communication-preferences)
  const mockNestedSchema = {
    title: 'Communication Preferences',
    description: 'Please review your contact information',
    type: 'object',
    properties: {
      contact_information: {
        description: 'Your contact details',
        type: 'object',
        required: ['email_address'],
        properties: {
          primary_cell_number: {
            title: 'Primary Cell Number',
            type: 'string',
            pattern: '^\\d{3}-\\d{3}-\\d{4}$',
          },
          email_address: {
            title: 'Email Address',
            type: 'string',
            format: 'email',
          },
        },
      },
      channels: {
        description: 'Notification channels',
        type: 'object',
        properties: {
          taco_truck: {
            title: 'Taco Truck',
            type: 'object',
            properties: {
              receive: {
                type: 'string',
                enum: ['Yes', 'No'],
              },
            },
          },
        },
      },
      preserve_selections: {
        description: 'Preserve your selections',
        type: 'boolean',
      },
    },
  };

  const mockNestedFormData = {
    contact_information: {
      primary_cell_number: '555-123-4567',
      email_address: 'test@example.com',
    },
    channels: {
      taco_truck: {
        receive: 'Yes',
      },
    },
    preserve_selections: true,
  };

  const mockSchemaResp = {
    fname: 'communication-preferences',
    version: 1,
    schema: mockNestedSchema,
    metadata: {},
  };

  beforeEach(() => {
    fetchStub = stub(window, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('Nested Object Rendering', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: mockNestedFormData }),
      });

      element = await fixture(html`
        <form-builder
          fbms-base-url="/api"
          fbms-form-fname="communication-preferences"
        ></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should render nested object containers', () => {
      const nestedContainers = element.shadowRoot.querySelectorAll('.nested-object');
      expect(nestedContainers.length).to.be.greaterThan(0);
    });

    it('should render nested object titles and descriptions', () => {
      const descriptions = element.shadowRoot.querySelectorAll('.nested-object-description');
      expect(descriptions.length).to.be.greaterThan(0);
    });

    it('should render fields within nested objects', () => {
      // Check for nested field inputs
      const cellInput = element.shadowRoot.querySelector(
        'input[name="contact_information.primary_cell_number"]'
      );
      const emailInput = element.shadowRoot.querySelector(
        'input[name="contact_information.email_address"]'
      );

      expect(cellInput).to.exist;
      expect(emailInput).to.exist;
    });

    it('should load nested form data correctly', () => {
      const cellInput = element.shadowRoot.querySelector(
        'input[name="contact_information.primary_cell_number"]'
      );
      const emailInput = element.shadowRoot.querySelector(
        'input[name="contact_information.email_address"]'
      );

      expect(cellInput.value).to.equal('555-123-4567');
      expect(emailInput.value).to.equal('test@example.com');
    });

    it('should render deeply nested objects (3 levels)', () => {
      const tacoReceiveSelect = element.shadowRoot.querySelector(
        'select[name="channels.taco_truck.receive"]'
      );

      expect(tacoReceiveSelect).to.exist;
      expect(tacoReceiveSelect.value).to.equal('Yes');
    });

    it('should render non-nested fields alongside nested ones', () => {
      const preserveCheckbox = element.shadowRoot.querySelector(
        'input[name="preserve_selections"]'
      );

      expect(preserveCheckbox).to.exist;
      expect(preserveCheckbox.type).to.equal('checkbox');
      expect(preserveCheckbox.checked).to.be.true;
    });
  });

  describe('Nested Object Input Handling', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder
          fbms-base-url="/api"
          fbms-form-fname="communication-preferences"
        ></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should update nested formData on input change', async () => {
      const cellInput = element.shadowRoot.querySelector(
        'input[name="contact_information.primary_cell_number"]'
      );

      cellInput.value = '555-999-8888';
      cellInput.dispatchEvent(new Event('input', { bubbles: true }));

      await element.updateComplete;

      expect(element.formData.contact_information.primary_cell_number).to.equal('555-999-8888');
    });

    it('should handle multiple nested levels correctly', async () => {
      const tacoSelect = element.shadowRoot.querySelector(
        'select[name="channels.taco_truck.receive"]'
      );

      tacoSelect.value = 'No';
      tacoSelect.dispatchEvent(new Event('change', { bubbles: true }));

      await element.updateComplete;

      expect(element.formData.channels.taco_truck.receive).to.equal('No');
    });

    it('should not affect sibling nested objects when updating', async () => {
      const cellInput = element.shadowRoot.querySelector(
        'input[name="contact_information.primary_cell_number"]'
      );
      const tacoSelect = element.shadowRoot.querySelector(
        'select[name="channels.taco_truck.receive"]'
      );

      cellInput.value = '555-111-2222';
      cellInput.dispatchEvent(new Event('input', { bubbles: true }));

      tacoSelect.value = 'Yes';
      tacoSelect.dispatchEvent(new Event('change', { bubbles: true }));

      await element.updateComplete;

      expect(element.formData.contact_information.primary_cell_number).to.equal('555-111-2222');
      expect(element.formData.channels.taco_truck.receive).to.equal('Yes');
    });

    it('should clear nested field error on input change', async () => {
      // Trigger validation to create a real error
      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await element.updateComplete;

      // Verify error exists for empty nested field
      expect(element.fieldErrors['contact_information.email_address']).to.exist;

      const errorMessages = element.shadowRoot.querySelectorAll('.error-message');
      expect(errorMessages.length).to.be.greaterThan(0);

      // Type into the nested field
      const emailInput = element.shadowRoot.querySelector(
        'input[name="contact_information.email_address"]'
      );
      emailInput.value = 'valid@example.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));

      await element.updateComplete;

      // Error should be cleared
      expect(element.fieldErrors['contact_information.email_address']).to.be.undefined;
    });
  });

  describe('Nested Object Validation', () => {
    beforeEach(async () => {
      // Schema with required nested fields
      const schemaWithRequired = {
        ...mockNestedSchema,
        properties: {
          ...mockNestedSchema.properties,
          contact_information: {
            ...mockNestedSchema.properties.contact_information,
            required: ['email_address'],
          },
        },
      };

      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({ ...mockSchemaResp, schema: schemaWithRequired }),
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder
          fbms-base-url="/api"
          fbms-form-fname="communication-preferences"
        ></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should validate required nested fields', async () => {
      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await element.updateComplete;

      expect(element.fieldErrors['contact_information.email_address']).to.equal(
        'This field is required'
      );
    });

    it('should validate pattern in nested fields', async () => {
      element.formData = {
        contact_information: {
          primary_cell_number: 'invalid-format',
        },
      };

      const isValid = element.validateForm();

      expect(isValid).to.be.false;
      expect(element.fieldErrors['contact_information.primary_cell_number']).to.exist;
    });

    it('should validate email format in nested fields', async () => {
      element.formData = {
        contact_information: {
          email_address: 'not-an-email',
        },
      };

      const isValid = element.validateForm();

      expect(isValid).to.be.false;
      expect(element.fieldErrors['contact_information.email_address']).to.equal(
        'Invalid email address'
      );
    });

    it('should pass validation with valid nested data', () => {
      element.formData = {
        contact_information: {
          primary_cell_number: '555-123-4567',
          email_address: 'valid@example.com',
        },
      };

      const isValid = element.validateForm();

      expect(isValid).to.be.true;
      expect(Object.keys(element.fieldErrors)).to.have.lengthOf(0);
    });
  });

  describe('Nested Object Form Submission', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder
          fbms-base-url="/api"
          fbms-form-fname="communication-preferences"
        ></form-builder>
      `);

      await waitUntil(() => !element.loading);
      fetchStub.reset();
    });

    it('should submit nested form data structure', async () => {
      element.formData = mockNestedFormData;

      fetchStub.resolves({
        ok: true,
        json: async () => ({}),
      });

      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await waitUntil(() => fetchStub.called);

      const [, options] = fetchStub.firstCall.args;
      const body = JSON.parse(options.body);

      expect(body.answers).to.deep.equal(mockNestedFormData);
      expect(body.answers.contact_information.email_address).to.equal('test@example.com');
      expect(body.answers.channels.taco_truck.receive).to.equal('Yes');
    });
  });

  describe('Helper Methods', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: mockNestedFormData }),
      });

      element = await fixture(html`
        <form-builder
          fbms-base-url="/api"
          fbms-form-fname="communication-preferences"
        ></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should get nested value using dot notation', () => {
      const value = element.getNestedValue('contact_information.email_address');
      expect(value).to.equal('test@example.com');
    });

    it('should get deeply nested value', () => {
      const value = element.getNestedValue('channels.taco_truck.receive');
      expect(value).to.equal('Yes');
    });

    it('should return undefined for non-existent path', () => {
      const value = element.getNestedValue('does.not.exist');
      expect(value).to.be.undefined;
    });

    it('should set nested value using dot notation', () => {
      element.setNestedValue('contact_information.email_address', 'new@example.com');
      expect(element.formData.contact_information.email_address).to.equal('new@example.com');
    });

    it('should create nested structure if it does not exist', () => {
      element.formData = {};
      element.setNestedValue('new.nested.value', 'test');
      expect(element.formData.new.nested.value).to.equal('test');
    });
  });

  describe('Nested Required Fields', () => {
    beforeEach(async () => {
      // Schema with required fields at different nesting levels
      const schemaWithNestedRequired = {
        title: 'Test Form',
        type: 'object',
        required: ['top_level_field'], // Top-level required
        properties: {
          top_level_field: {
            type: 'string',
            title: 'Top Level Field',
          },
          contact_info: {
            type: 'object',
            title: 'Contact Information',
            required: ['email', 'phone'], // Nested required fields
            properties: {
              email: {
                type: 'string',
                title: 'Email',
                format: 'email',
              },
              phone: {
                type: 'string',
                title: 'Phone',
              },
              optional_field: {
                type: 'string',
                title: 'Optional',
              },
            },
          },
          not_required: {
            type: 'string',
            title: 'Not Required',
          },
        },
      };

      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({
          fname: 'test-form',
          version: 1,
          schema: schemaWithNestedRequired,
          metadata: {},
        }),
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="test-form"></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should mark top-level required fields with asterisk', () => {
      const topLevelLabel = element.shadowRoot.querySelector('label[for="top_level_field"]');
      expect(topLevelLabel.classList.contains('required')).to.be.true;
    });

    it('should mark nested required fields with asterisk', () => {
      const emailLabel = element.shadowRoot.querySelector('label[for="contact_info.email"]');
      const phoneLabel = element.shadowRoot.querySelector('label[for="contact_info.phone"]');

      expect(emailLabel.classList.contains('required')).to.be.true;
      expect(phoneLabel.classList.contains('required')).to.be.true;
    });

    it('should NOT mark nested optional fields with asterisk', () => {
      const optionalLabel = element.shadowRoot.querySelector(
        'label[for="contact_info.optional_field"]'
      );
      expect(optionalLabel.classList.contains('required')).to.be.false;
    });

    it('should NOT mark top-level optional fields with asterisk', () => {
      const notRequiredLabel = element.shadowRoot.querySelector('label[for="not_required"]');
      expect(notRequiredLabel.classList.contains('required')).to.be.false;
    });

    it('should validate nested required fields correctly', () => {
      element.formData = {
        top_level_field: 'filled',
        contact_info: {
          optional_field: 'filled',
          // email and phone missing
        },
      };

      const isValid = element.validateForm();

      expect(isValid).to.be.false;
      expect(element.fieldErrors['contact_info.email']).to.equal('This field is required');
      expect(element.fieldErrors['contact_info.phone']).to.equal('This field is required');
      expect(element.fieldErrors['contact_info.optional_field']).to.be.undefined;
    });

    it('should pass validation when nested required fields are filled', () => {
      element.formData = {
        top_level_field: 'filled',
        contact_info: {
          email: 'test@example.com',
          phone: '555-1234',
        },
      };

      const isValid = element.validateForm();

      expect(isValid).to.be.true;
      expect(Object.keys(element.fieldErrors)).to.have.lengthOf(0);
    });
  });
});
