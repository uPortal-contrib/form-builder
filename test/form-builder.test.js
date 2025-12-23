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
      await elementUpdated(element);

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

      // After successful submission, form is replaced with success view
      expect(element.formCompleted).to.be.true;

      // After successful submission, form is replaced with success view (no submit button)
      const submitButtonAfter = element.shadowRoot.querySelector('button[type="submit"]');
      expect(submitButtonAfter).to.not.exist;
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
      expect(element.submissionError).to.exist;
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

  describe('403 Error Handling and Token Refresh', () => {
    beforeEach(async () => {
      // First call: OIDC token during initialization
      fetchStub.onCall(0).resolves({
        ok: true,
        text: () => Promise.resolve('initial-token-123'),
      });

      // Second call: Schema fetch
      fetchStub.onCall(1).resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });

      // Third call: Form data fetch
      fetchStub.onCall(2).resolves({
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

      // Set valid form data and trigger hasChanges
      element.formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };
      element.hasChanges = true;

      fetchStub.reset();
    });

    it('should refresh token and retry on 403 when oidcUrl is configured', async () => {
      // First submission attempt returns 403
      fetchStub.onFirstCall().resolves({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      // Token refresh succeeds
      fetchStub.onSecondCall().resolves({
        ok: true,
        text: () => Promise.resolve('new-token-xyz'),
      });

      // Retry submission succeeds
      fetchStub.onThirdCall().resolves({
        ok: true,
        json: async () => ({}),
      });

      const form = element.shadowRoot.querySelector('form');

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      const { detail } = await oneEvent(element, 'form-submit-success');

      // Verify the sequence
      expect(fetchStub).to.have.been.calledThrice;

      // First call: submission attempt
      expect(fetchStub.firstCall.args[0]).to.include('/api/v1/submissions/test-form');

      // Second call: token refresh
      expect(fetchStub.secondCall.args[0]).to.equal('/auth/userinfo');

      // Third call: retry submission
      expect(fetchStub.thirdCall.args[0]).to.include('/api/v1/submissions/test-form');

      // Verify new token was used in retry
      const retryHeaders = fetchStub.thirdCall.args[1].headers;
      expect(retryHeaders.Authorization).to.equal('Bearer new-token-xyz');

      expect(detail.data.answers).to.deep.equal(element.formData);
    });

    it('should show error when retry also fails with 403', async () => {
      // First submission attempt returns 403
      fetchStub.onFirstCall().resolves({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      // Token refresh succeeds
      fetchStub.onSecondCall().resolves({
        ok: true,
        text: () => Promise.resolve('new-token-xyz'),
      });

      // Retry submission also returns 403
      fetchStub.onThirdCall().resolves({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const form = element.shadowRoot.querySelector('form');

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      const { detail } = await oneEvent(element, 'form-submit-error');

      expect(detail.error).to.include('Access denied even after token refresh');
      expect(detail.error).to.include('may not have permission');
      expect(element.submissionError).to.exist;
    });

    it('should show generic error on 403 when oidcUrl is not configured', async () => {
      // Clean up the existing element from beforeEach
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }

      // Reset fetch stub
      fetchStub.reset();

      // Schema fetch
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => mockSchemaResp,
      });

      // Form data fetch
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      // Create element without oidcUrl
      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="test-form"></form-builder>
      `);

      await waitUntil(() => !element.loading);

      element.formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };
      element.hasChanges = true;

      // Reset again for the submission test
      fetchStub.reset();

      // Submission returns 403
      fetchStub.resolves({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const form = element.shadowRoot.querySelector('form');

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      const { detail } = await oneEvent(element, 'form-submit-error');

      // Should only attempt submission once (no token refresh)
      expect(fetchStub).to.have.been.calledOnce;
      expect(detail.error).to.include('Failed to submit form');
    });

    it('should maintain submitting flag during token refresh and retry', async () => {
      // First submission attempt returns 403
      fetchStub.onFirstCall().resolves({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      // Token refresh - simulate delay
      let resolveTokenRefresh;
      fetchStub.onSecondCall().returns(
        new Promise((resolve) => {
          resolveTokenRefresh = resolve;
        })
      );

      // Retry submission - also delayed so we can check submitting flag
      let resolveRetry;
      fetchStub.onThirdCall().returns(
        new Promise((resolve) => {
          resolveRetry = resolve;
        })
      );

      const form = element.shadowRoot.querySelector('form');

      // Don't wait for the submit to complete
      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      // Wait for submitting to be true (initial submission)
      await waitUntil(() => element.submitting);
      expect(element.submitting).to.be.true;

      // Resolve token refresh
      resolveTokenRefresh({ ok: true, text: () => Promise.resolve('new-token') });

      // Wait for the retry fetch to be called
      await waitUntil(() => fetchStub.callCount >= 3);

      // Submitting should still be true during retry
      expect(element.submitting).to.be.true;

      // Now resolve the retry
      resolveRetry({ ok: true, json: async () => ({}) });

      // Wait for completion
      await waitUntil(() => !element.submitting);
      expect(element.submitting).to.be.false;
    });

    it('should show error when token refresh fails', async () => {
      // First submission attempt returns 403
      fetchStub.onFirstCall().resolves({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      // Token refresh fails
      fetchStub.onSecondCall().rejects(new Error('Network error'));

      const form = element.shadowRoot.querySelector('form');

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      const { detail } = await oneEvent(element, 'form-submit-error');

      expect(detail.error).to.include('Unable to refresh token');
      expect(fetchStub).to.have.been.calledTwice; // No retry after failed token refresh
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
        title: 'Contact Information',
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
                title: 'Receive Notifications',
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
      expect(nestedContainers.length).to.equal(2 + 1);
    });

    it('should render nested object titles and descriptions', () => {
      const descriptions = element.shadowRoot.querySelectorAll('.nested-object-description');
      expect(descriptions.length).to.be.greaterThan(0);
      expect(descriptions.length).to.equal(2);
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
      expect(element.fieldErrors['contact_information.primary_cell_number']).to.equal(
        'Invalid format'
      );
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

    it('should display error messages in UI for nested fields', async () => {
      // Submit form with invalid nested data
      element.formData = {
        contact_information: {
          email_address: 'invalid-email',
          primary_cell_number: 'wrong-format',
        },
      };

      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await element.updateComplete;

      // Check that error messages are rendered in the DOM
      const emailErrorMsg = Array.from(element.shadowRoot.querySelectorAll('.error-message')).find(
        (el) => el.textContent.includes('Invalid email address')
      );

      const phoneErrorMsg = Array.from(element.shadowRoot.querySelectorAll('.error-message')).find(
        (el) => el.textContent.includes('Invalid format')
      );

      expect(emailErrorMsg).to.exist;
      expect(phoneErrorMsg).to.exist;

      // Verify errors are displayed next to the correct fields
      const emailInput = element.shadowRoot.querySelector(
        'input[name="contact_information.email_address"]'
      );
      const emailFormGroup = emailInput.closest('.form-group');
      const emailError = emailFormGroup.querySelector('.error-message');

      expect(emailError).to.exist;
      expect(emailError.textContent).to.include('Invalid email address');
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

      // Verify the final value
      expect(element.formData.new.nested.value).to.equal('test');

      // Verify intermediate structure was created correctly
      expect(element.formData.new).to.exist;
      expect(element.formData.new).to.be.an('object');

      expect(element.formData.new.nested).to.exist;
      expect(element.formData.new.nested).to.be.an('object');

      // Verify the complete path
      expect(element.formData).to.have.nested.property('new.nested.value', 'test');
    });
  });

  describe('getSchemaAtPath Helper Method', () => {
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

    it('should return top-level schema for empty path', () => {
      const schema = element.getSchemaAtPath('');
      expect(schema).to.equal(element.schema);
    });

    it('should return nested object schema for single-level path', () => {
      const schema = element.getSchemaAtPath('contact_information');
      expect(schema).to.exist;
      expect(schema.type).to.equal('object');
      expect(schema.properties).to.exist;
      expect(schema.properties.primary_cell_number).to.exist;
    });

    it('should return deeply nested schema for multi-level path', () => {
      const schema = element.getSchemaAtPath('channels.taco_truck');
      expect(schema).to.exist;
      expect(schema.type).to.equal('object');
      expect(schema.properties.receive).to.exist;
    });

    it('should return null for non-existent path', () => {
      const schema = element.getSchemaAtPath('does_not_exist');
      expect(schema).to.be.null;
    });

    it('should return null for partially valid path', () => {
      const schema = element.getSchemaAtPath('contact_information.does_not_exist');
      expect(schema).to.be.null;
    });

    it('should return null when traversing through non-object field', () => {
      // Try to traverse through preserve_selections (boolean) as if it were an object
      const schema = element.getSchemaAtPath('preserve_selections.invalid');
      expect(schema).to.be.null;
    });

    it('should handle schemas with required arrays', () => {
      // Modify schema to add required fields
      element.schema.properties.contact_information.required = ['email_address'];

      const schema = element.getSchemaAtPath('contact_information');
      expect(schema.required).to.deep.equal(['email_address']);
    });

    it('should correctly navigate to leaf fields', () => {
      const schema = element.getSchemaAtPath('channels.taco_truck');
      expect(schema.properties.receive.enum).to.deep.equal(['Yes', 'No']);
    });
  });
  describe('Helper Methods Edge Cases', () => {
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

    describe('getNestedValue edge cases', () => {
      it('should return undefined for empty string path', () => {
        const value = element.getNestedValue('');
        expect(value).to.be.undefined;
      });

      it('should return undefined for null path', () => {
        const value = element.getNestedValue(null);
        expect(value).to.be.undefined;
      });

      it('should return undefined for undefined path', () => {
        const value = element.getNestedValue(undefined);
        expect(value).to.be.undefined;
      });

      it('should handle paths with double dots by treating as single dot', () => {
        const value = element.getNestedValue('contact_information..email_address');
        expect(value).to.equal('test@example.com');
      });

      it('should handle paths with leading dot', () => {
        const value = element.getNestedValue('.contact_information.email_address');
        expect(value).to.equal('test@example.com');
      });

      it('should handle paths with trailing dot', () => {
        const value = element.getNestedValue('contact_information.email_address.');
        expect(value).to.equal('test@example.com');
      });

      it('should return undefined for non-string paths', () => {
        const value = element.getNestedValue(123);
        expect(value).to.be.undefined;
      });

      it('should return undefined for object paths', () => {
        const value = element.getNestedValue({ path: 'test' });
        expect(value).to.be.undefined;
      });

      it('should return undefined for array paths', () => {
        const value = element.getNestedValue(['contact_information', 'email_address']);
        expect(value).to.be.undefined;
      });
    });

    describe('setNestedValue edge cases', () => {
      it('should do nothing for empty string path', () => {
        const originalData = { ...element.formData };
        element.setNestedValue('', 'test');
        expect(element.formData).to.deep.equal(originalData);
      });

      it('should do nothing for null path', () => {
        const originalData = { ...element.formData };
        element.setNestedValue(null, 'test');
        expect(element.formData).to.deep.equal(originalData);
      });

      it('should do nothing for undefined path', () => {
        const originalData = { ...element.formData };
        element.setNestedValue(undefined, 'test');
        expect(element.formData).to.deep.equal(originalData);
      });

      it('should handle paths with double dots by treating as single dot', () => {
        element.setNestedValue('contact_information..new_field', 'test-value');
        expect(element.formData.contact_information.new_field).to.equal('test-value');
      });

      it('should handle paths with leading dot', () => {
        element.setNestedValue('.contact_information.new_field', 'test-value');
        expect(element.formData.contact_information.new_field).to.equal('test-value');
      });

      it('should handle paths with trailing dot', () => {
        element.setNestedValue('contact_information.new_field.', 'test-value');
        expect(element.formData.contact_information.new_field).to.equal('test-value');
      });

      it('should do nothing for non-string paths', () => {
        const originalData = { ...element.formData };
        element.setNestedValue(123, 'test');
        expect(element.formData).to.deep.equal(originalData);
      });

      it('should do nothing for object paths', () => {
        const originalData = { ...element.formData };
        element.setNestedValue({ path: 'test' }, 'value');
        expect(element.formData).to.deep.equal(originalData);
      });

      it('should do nothing for array paths', () => {
        const originalData = { ...element.formData };
        element.setNestedValue(['contact_information', 'email'], 'value');
        expect(element.formData).to.deep.equal(originalData);
      });
    });

    describe('getSchemaAtPath edge cases', () => {
      it('should return root schema for null path', () => {
        const schema = element.getSchemaAtPath(null);
        expect(schema).to.equal(element.schema);
      });

      it('should return root schema for undefined path', () => {
        const schema = element.getSchemaAtPath(undefined);
        expect(schema).to.equal(element.schema);
      });

      it('should handle paths with double dots', () => {
        const schema = element.getSchemaAtPath('contact_information..primary_cell_number');
        // Should navigate correctly by filtering empty segments
        expect(schema).to.exist;
      });

      it('should handle paths with leading dot', () => {
        const schema = element.getSchemaAtPath('.contact_information');
        expect(schema).to.exist;
        expect(schema.type).to.equal('object');
      });

      it('should handle paths with trailing dot', () => {
        const schema = element.getSchemaAtPath('contact_information.');
        expect(schema).to.exist;
        expect(schema.type).to.equal('object');
      });
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

describe('Radio Buttons and Checkboxes', () => {
  let element;
  let fetchStub;

  const mockSchemaWithRadioAndCheckbox = {
    title: 'Communication Preferences',
    type: 'object',
    properties: {
      channels: {
        type: 'object',
        properties: {
          taco_truck: {
            type: 'object',
            properties: {
              receive: {
                type: 'string',
                title: 'Receive Updates',
                enum: ['Yes', 'No'],
              },
              locations: {
                type: 'array',
                title: 'Locations',
                items: {
                  type: 'string',
                  enum: ['Fresno City College', 'Clovis Community College', 'Reedley College'],
                },
                uniqueItems: true,
              },
            },
          },
        },
      },
    },
  };

  const mockUiSchemaWithWidgets = {
    channels: {
      taco_truck: {
        receive: {
          'ui:widget': 'radio',
          'ui:options': {
            inline: true,
          },
        },
        locations: {
          'ui:widget': 'checkboxes',
          'ui:options': {
            inline: true,
          },
        },
      },
    },
  };

  beforeEach(() => {
    fetchStub = stub(window, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('Radio Button Rendering', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({
          fname: 'comm-prefs',
          version: 1,
          schema: mockSchemaWithRadioAndCheckbox,
          metadata: mockUiSchemaWithWidgets,
        }),
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="comm-prefs"></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should render radio buttons for enum with radio widget', () => {
      const radioInputs = element.shadowRoot.querySelectorAll(
        'input[type="radio"][name="channels.taco_truck.receive"]'
      );

      expect(radioInputs).to.have.lengthOf(2); // Yes and No
    });

    it('should render radio buttons with correct values', () => {
      const radioInputs = element.shadowRoot.querySelectorAll(
        'input[type="radio"][name="channels.taco_truck.receive"]'
      );

      const values = Array.from(radioInputs).map((input) => input.value);
      expect(values).to.include('Yes');
      expect(values).to.include('No');
    });

    it('should render radio buttons inline when ui:options.inline is true', () => {
      const radioGroup = element.shadowRoot.querySelector('.radio-group.inline');
      expect(radioGroup).to.exist;
    });

    it('should render labels for radio buttons', () => {
      const labels = element.shadowRoot.querySelectorAll(
        'label[for^="channels.taco_truck.receive-"]'
      );

      expect(labels).to.have.lengthOf(2);
      const labelTexts = Array.from(labels).map((l) => l.textContent);
      expect(labelTexts).to.include('Yes');
      expect(labelTexts).to.include('No');
    });
  });

  describe('Radio Button Interaction', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({
          fname: 'comm-prefs',
          version: 1,
          schema: mockSchemaWithRadioAndCheckbox,
          metadata: mockUiSchemaWithWidgets,
        }),
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({
          answers: {
            channels: {
              taco_truck: {
                receive: 'Yes',
              },
            },
          },
        }),
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="comm-prefs"></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should display pre-selected radio button value', () => {
      const yesRadio = element.shadowRoot.querySelector(
        'input[value="Yes"][name="channels.taco_truck.receive"]'
      );

      expect(yesRadio.checked).to.be.true;
    });

    it('should update formData when radio button is clicked', async () => {
      const noRadio = element.shadowRoot.querySelector(
        'input[value="No"][name="channels.taco_truck.receive"]'
      );

      noRadio.click();
      await element.updateComplete;

      expect(element.formData.channels.taco_truck.receive).to.equal('No');
    });

    it('should uncheck previous radio when new one is selected', async () => {
      const yesRadio = element.shadowRoot.querySelector(
        'input[value="Yes"][name="channels.taco_truck.receive"]'
      );
      const noRadio = element.shadowRoot.querySelector(
        'input[value="No"][name="channels.taco_truck.receive"]'
      );

      expect(yesRadio.checked).to.be.true;

      noRadio.click();
      await element.updateComplete;

      expect(yesRadio.checked).to.be.false;
      expect(noRadio.checked).to.be.true;
    });
  });

  describe('Checkbox Array Rendering', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({
          fname: 'comm-prefs',
          version: 1,
          schema: mockSchemaWithRadioAndCheckbox,
          metadata: mockUiSchemaWithWidgets,
        }),
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="comm-prefs"></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should render checkboxes for array with enum items', () => {
      const checkboxes = element.shadowRoot.querySelectorAll(
        'input[type="checkbox"][name="channels.taco_truck.locations"]'
      );

      expect(checkboxes).to.have.lengthOf(3); // Three locations
    });

    it('should render checkboxes with correct values', () => {
      const checkboxes = element.shadowRoot.querySelectorAll(
        'input[type="checkbox"][name="channels.taco_truck.locations"]'
      );

      const values = Array.from(checkboxes).map((input) => input.value);
      expect(values).to.include('Fresno City College');
      expect(values).to.include('Clovis Community College');
      expect(values).to.include('Reedley College');
    });

    it('should render checkboxes inline when ui:options.inline is true', () => {
      const checkboxGroup = element.shadowRoot.querySelector('.checkbox-group.inline');
      expect(checkboxGroup).to.exist;
    });

    it('should render labels for checkboxes', () => {
      const labels = element.shadowRoot.querySelectorAll(
        'label[for^="channels.taco_truck.locations-"]'
      );

      expect(labels).to.have.lengthOf(3);
      const labelTexts = Array.from(labels).map((l) => l.textContent);
      expect(labelTexts).to.include('Fresno City College');
    });
  });

  describe('Checkbox Array Interaction', () => {
    beforeEach(async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({
          fname: 'comm-prefs',
          version: 1,
          schema: mockSchemaWithRadioAndCheckbox,
          metadata: mockUiSchemaWithWidgets,
        }),
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({
          answers: {
            channels: {
              taco_truck: {
                locations: ['Fresno City College'],
              },
            },
          },
        }),
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="comm-prefs"></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should display pre-selected checkbox values', () => {
      const fresnoCheckbox = element.shadowRoot.querySelector(
        'input[value="Fresno City College"][name="channels.taco_truck.locations"]'
      );

      expect(fresnoCheckbox.checked).to.be.true;
    });

    it('should add value to array when checkbox is checked', async () => {
      const clovisCheckbox = element.shadowRoot.querySelector(
        'input[value="Clovis Community College"][name="channels.taco_truck.locations"]'
      );

      clovisCheckbox.click();
      await element.updateComplete;

      expect(element.formData.channels.taco_truck.locations).to.include('Clovis Community College');
      expect(element.formData.channels.taco_truck.locations).to.include('Fresno City College');
    });

    it('should remove value from array when checkbox is unchecked', async () => {
      const fresnoCheckbox = element.shadowRoot.querySelector(
        'input[value="Fresno City College"][name="channels.taco_truck.locations"]'
      );

      expect(fresnoCheckbox.checked).to.be.true;

      fresnoCheckbox.click();
      await element.updateComplete;

      expect(element.formData.channels.taco_truck.locations).to.not.include('Fresno City College');
    });

    it('should support multiple selections', async () => {
      const clovisCheckbox = element.shadowRoot.querySelector(
        'input[value="Clovis Community College"][name="channels.taco_truck.locations"]'
      );
      const reedleyCheckbox = element.shadowRoot.querySelector(
        'input[value="Reedley College"][name="channels.taco_truck.locations"]'
      );

      clovisCheckbox.click();
      await element.updateComplete;

      reedleyCheckbox.click();
      await element.updateComplete;

      expect(element.formData.channels.taco_truck.locations).to.have.lengthOf(3);
      expect(element.formData.channels.taco_truck.locations).to.include('Fresno City College');
      expect(element.formData.channels.taco_truck.locations).to.include('Clovis Community College');
      expect(element.formData.channels.taco_truck.locations).to.include('Reedley College');
    });

    it('should initialize empty array when no checkboxes selected', async () => {
      // Start fresh with no selections
      element.formData = { channels: { taco_truck: {} } };
      await element.updateComplete;

      const fresnoCheckbox = element.shadowRoot.querySelector(
        'input[value="Fresno City College"][name="channels.taco_truck.locations"]'
      );

      fresnoCheckbox.click();
      await element.updateComplete;

      expect(element.formData.channels.taco_truck.locations).to.be.an('array');
      expect(element.formData.channels.taco_truck.locations).to.have.lengthOf(1);
    });

    it('should not add duplicate values to array', async () => {
      const clovisCheckbox = element.shadowRoot.querySelector(
        'input[value="Clovis Community College"][name="channels.taco_truck.locations"]'
      );

      // Check it
      clovisCheckbox.click();
      await element.updateComplete;

      // Uncheck it
      clovisCheckbox.click();
      await element.updateComplete;

      // Check it again
      clovisCheckbox.click();
      await element.updateComplete;

      const locations = element.formData.channels.taco_truck.locations;
      const clovisCount = locations.filter((loc) => loc === 'Clovis Community College').length;

      expect(clovisCount).to.equal(1);
    });

    it('should clear field error when checkbox is changed', async () => {
      element.fieldErrors = { 'channels.taco_truck.locations': 'Required' };
      await element.updateComplete;

      const clovisCheckbox = element.shadowRoot.querySelector(
        'input[value="Clovis Community College"][name="channels.taco_truck.locations"]'
      );

      clovisCheckbox.click();
      await element.updateComplete;

      expect(element.fieldErrors['channels.taco_truck.locations']).to.be.undefined;
    });
  });

  describe('Fallback to Select for Enum without Widget', () => {
    beforeEach(async () => {
      const schemaWithPlainEnum = {
        ...mockSchemaWithRadioAndCheckbox,
        properties: {
          ...mockSchemaWithRadioAndCheckbox.properties,
          simple_choice: {
            type: 'string',
            title: 'Simple Choice',
            enum: ['Option A', 'Option B', 'Option C'],
          },
        },
      };

      fetchStub.onFirstCall().resolves({
        ok: true,
        json: async () => ({
          fname: 'comm-prefs',
          version: 1,
          schema: schemaWithPlainEnum,
          metadata: mockUiSchemaWithWidgets,
        }),
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({ answers: {} }),
      });

      element = await fixture(html`
        <form-builder fbms-base-url="/api" fbms-form-fname="comm-prefs"></form-builder>
      `);

      await waitUntil(() => !element.loading);
    });

    it('should render select dropdown for enum without ui:widget', () => {
      const select = element.shadowRoot.querySelector('select[name="simple_choice"]');
      expect(select).to.exist;

      const radios = element.shadowRoot.querySelectorAll(
        'input[type="radio"][name="simple_choice"]'
      );
      expect(radios).to.have.lengthOf(0);
    });
  });
});

describe('Server Response Messages', () => {
  let element;
  let fetchStub;

  // Use the mockSchema from the main FormBuilder tests
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
    },
  };

  const mockSchemaResp = {
    fname: 'test-form',
    version: 1,
    schema: mockSchema,
    metadata: {},
  };

  beforeEach(async () => {
    fetchStub = stub(window, 'fetch');

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

    element.formData = {
      name: 'John Doe',
      email: 'john@example.com',
    };
    element.hasChanges = true;

    fetchStub.reset();
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('should display server messages on successful submission', async () => {
    const serverResponse = {
      status: 'success',
      messages: [
        'Your form has been submitted successfully.',
        'You will receive a confirmation email shortly.',
      ],
    };

    fetchStub.resolves({
      ok: true,
      json: async () => serverResponse,
    });

    const form = element.shadowRoot.querySelector('form');

    setTimeout(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await oneEvent(element, 'form-submit-success');
    await element.updateComplete;

    const successMessage = element.shadowRoot.querySelector('.status-message.success');
    expect(successMessage).to.exist;

    const messageList = successMessage.querySelectorAll('li');
    expect(messageList).to.have.lengthOf(2);
    expect(messageList[0].textContent).to.equal('Your form has been submitted successfully.');
    expect(messageList[1].textContent).to.equal('You will receive a confirmation email shortly.');
  });

  it('should display server messages on submission error', async () => {
    const errorResponse = {
      messageHeader: 'Submission Failed',
      messages: [
        'The email address is already registered.',
        'Please use a different email or contact support.',
      ],
    };

    fetchStub.resolves({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => errorResponse,
    });

    const form = element.shadowRoot.querySelector('form');

    setTimeout(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await oneEvent(element, 'form-submit-error');
    await element.updateComplete;

    // Just verify the state is set correctly
    expect(element.submissionError).to.equal('Submission Failed');
    expect(element.submissionStatus).to.exist;
    expect(element.submissionStatus.messageHeader).to.equal('Submission Failed');
    expect(element.submissionStatus.messages).to.have.lengthOf(2);
    expect(element.submissionStatus.messages[0]).to.equal(
      'The email address is already registered.'
    );
    expect(element.submissionStatus.messages[1]).to.equal(
      'Please use a different email or contact support.'
    );
  });

  it('should handle submission success without server messages', async () => {
    fetchStub.resolves({
      ok: true,
      json: async () => ({}),
    });

    let form = element.shadowRoot.querySelector('form');

    setTimeout(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await oneEvent(element, 'form-submit-success');
    await element.updateComplete;

    // Verify state flags
    expect(element.submitSuccess).to.be.true;
    expect(element.formCompleted).to.be.true;

    // Success message should be displayed
    const successMessage = element.shadowRoot.querySelector('.status-message.success');
    expect(successMessage).to.exist;
    expect(successMessage.textContent).to.include('Form submitted successfully');

    // No message list since submissionStatus is empty
    const messageList = successMessage.querySelectorAll('li');
    expect(messageList).to.have.lengthOf(0);

    // Form should NOT be visible when completed
    form = element.shadowRoot.querySelector('form');
    expect(form).to.not.exist;
  });

  it('should handle non-JSON error responses gracefully', async () => {
    fetchStub.resolves({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    const form = element.shadowRoot.querySelector('form');

    setTimeout(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await oneEvent(element, 'form-submit-error');
    await element.updateComplete;

    expect(element.submissionError).to.include('Failed to submit form');
  });

  it('should use server messageHeader for error display', async () => {
    const errorResponse = {
      messageHeader: 'Validation Error',
      messages: ['Name cannot contain special characters.'],
    };

    fetchStub.resolves({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: async () => errorResponse,
    });

    const form = element.shadowRoot.querySelector('form');

    setTimeout(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await oneEvent(element, 'form-submit-error');

    expect(element.submissionError).to.equal('Validation Error');
  });
});

describe('Custom Schema Validation Messages', () => {
  let element;
  let fetchStub;

  const schemaWithCustomMessages = {
    title: 'Registration Form',
    type: 'object',
    required: ['username', 'email', 'age'],
    properties: {
      username: {
        type: 'string',
        title: 'Username',
        minLength: 3,
        maxLength: 20,
        pattern: '^[a-zA-Z0-9_]+$',
        messages: {
          required: 'Please provide a username',
          minLength: 'Username must be at least 3 characters long',
          maxLength: 'Username cannot exceed 20 characters',
          pattern: 'Username can only contain letters, numbers, and underscores',
        },
      },
      email: {
        type: 'string',
        title: 'Email',
        format: 'email',
        messages: {
          required: 'Email address is required',
          format: 'Please enter a valid email address (e.g., user@example.com)',
        },
      },
      age: {
        type: 'integer',
        title: 'Age',
        minimum: 18,
        maximum: 120,
        messages: {
          required: 'Please enter your age',
          minimum: 'You must be at least 18 years old to register',
          maximum: 'Please enter a valid age',
          type: 'Age must be a whole number',
        },
      },
      contact: {
        type: 'object',
        properties: {
          phone: {
            type: 'string',
            title: 'Phone',
            pattern: '^\\d{3}-\\d{3}-\\d{4}$',
            messages: {
              pattern: 'Phone must be in format: 555-123-4567',
            },
          },
        },
      },
    },
  };

  beforeEach(async () => {
    fetchStub = stub(window, 'fetch');
    fetchStub.onFirstCall().resolves({
      ok: true,
      json: async () => ({
        fname: 'test-form',
        version: 1,
        schema: schemaWithCustomMessages,
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

  afterEach(() => {
    fetchStub.restore();
  });

  it('should use custom required message from schema', async () => {
    const form = element.shadowRoot.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await element.updateComplete;

    expect(element.fieldErrors.username).to.equal('Please provide a username');
    expect(element.fieldErrors.email).to.equal('Email address is required');
    expect(element.fieldErrors.age).to.equal('Please enter your age');
  });

  it('should use custom minLength message from schema', () => {
    element.formData = { username: 'ab' };

    const isValid = element.validateForm();

    expect(isValid).to.be.false;
    expect(element.fieldErrors.username).to.equal('Username must be at least 3 characters long');
  });

  it('should use custom maxLength message from schema', () => {
    element.formData = { username: 'a'.repeat(21) };

    const isValid = element.validateForm();

    expect(isValid).to.be.false;
    expect(element.fieldErrors.username).to.equal('Username cannot exceed 20 characters');
  });

  it('should use custom pattern message from schema', () => {
    element.formData = { username: 'user@name!' };

    const isValid = element.validateForm();

    expect(isValid).to.be.false;
    expect(element.fieldErrors.username).to.equal(
      'Username can only contain letters, numbers, and underscores'
    );
  });

  it('should use custom format message for email', () => {
    element.formData = { email: 'invalid-email' };

    const isValid = element.validateForm();

    expect(isValid).to.be.false;
    expect(element.fieldErrors.email).to.equal(
      'Please enter a valid email address (e.g., user@example.com)'
    );
  });

  it('should use custom minimum message from schema', () => {
    element.formData = { age: 17 };

    const isValid = element.validateForm();

    expect(isValid).to.be.false;
    expect(element.fieldErrors.age).to.equal('You must be at least 18 years old to register');
  });

  it('should use custom maximum message from schema', () => {
    element.formData = { age: 150 };

    const isValid = element.validateForm();

    expect(isValid).to.be.false;
    expect(element.fieldErrors.age).to.equal('Please enter a valid age');
  });

  it('should use custom type message from schema', () => {
    element.formData = { age: 'not-a-number' };

    const isValid = element.validateForm();

    expect(isValid).to.be.false;
    expect(element.fieldErrors.age).to.equal('Age must be a whole number');
  });

  it('should use custom messages for nested fields', () => {
    element.formData = {
      contact: {
        phone: '1234567890',
      },
    };

    const isValid = element.validateForm();

    expect(isValid).to.be.false;
    expect(element.fieldErrors['contact.phone']).to.equal('Phone must be in format: 555-123-4567');
  });

  it('should fall back to default messages when no custom message exists', () => {
    const schemaWithoutCustom = {
      title: 'Simple Form',
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          minLength: 2,
        },
      },
    };

    element.schema = schemaWithoutCustom;
    element.formData = {};

    const isValid = element.validateForm();

    expect(isValid).to.be.false;
    expect(element.fieldErrors.name).to.equal('This field is required'); // Default message
  });

  it('should display custom error messages in the UI', async () => {
    element.formData = { username: 'a' };

    const form = element.shadowRoot.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await element.updateComplete;

    const errorMessage = element.shadowRoot
      .querySelector('input[name="username"]')
      .parentElement.querySelector('.error-message');

    expect(errorMessage).to.exist;
    expect(errorMessage.textContent).to.equal('Username must be at least 3 characters long');
  });
});

describe('getCustomErrorMessage Helper', () => {
  let element;
  let fetchStub;

  beforeEach(async () => {
    fetchStub = stub(window, 'fetch');

    const testSchema = {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          messages: {
            format: 'Custom email error',
            required: 'Custom required error',
          },
        },
        nested: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              messages: {
                pattern: 'Custom nested pattern error',
              },
            },
          },
        },
      },
    };

    fetchStub.onFirstCall().resolves({
      ok: true,
      json: async () => ({
        fname: 'test',
        version: 1,
        schema: testSchema,
        metadata: {},
      }),
    });
    fetchStub.onSecondCall().resolves({
      ok: true,
      json: async () => ({ answers: {} }),
    });

    element = await fixture(html`
      <form-builder fbms-base-url="/api" fbms-form-fname="test"></form-builder>
    `);

    await waitUntil(() => !element.loading);
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('should retrieve custom message for top-level field', () => {
    const message = element.getCustomErrorMessage('email', 'format');
    expect(message).to.equal('Custom email error');
  });

  it('should retrieve custom message for nested field', () => {
    const message = element.getCustomErrorMessage('nested.field', 'pattern');
    expect(message).to.equal('Custom nested pattern error');
  });

  it('should return null for non-existent field', () => {
    const message = element.getCustomErrorMessage('nonexistent', 'format');
    expect(message).to.be.null;
  });

  it('should return null for non-existent rule', () => {
    const message = element.getCustomErrorMessage('email', 'nonexistent');
    expect(message).to.be.null;
  });

  it('should return null for field without messages', () => {
    element.schema.properties.noMessages = { type: 'string' };
    const message = element.getCustomErrorMessage('noMessages', 'required');
    expect(message).to.be.null;
  });
});

describe('Form Completion and Forwarding', () => {
  let element;
  let fetchStub;

  const mockSchema = {
    title: 'Test Form',
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        title: 'Name',
      },
    },
  };

  const mockSchemaResp = {
    fname: 'test-form',
    version: 1,
    schema: mockSchema,
    metadata: {},
  };

  beforeEach(async () => {
    fetchStub = stub(window, 'fetch');

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

    element.formData = { name: 'John Doe' };
    element.hasChanges = true;

    fetchStub.reset();
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('should set formCompleted to true on successful submission without forward', async () => {
    fetchStub.resolves({
      ok: true,
      json: async () => ({}),
      headers: new Headers(),
    });

    const form = element.shadowRoot.querySelector('form');
    setTimeout(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await oneEvent(element, 'form-submit-success');

    expect(element.formCompleted).to.be.true;
    expect(element.submitSuccess).to.be.true;
  });

  it('should hide form and show success message when formCompleted is true', async () => {
    fetchStub.resolves({
      ok: true,
      json: async () => ({
        messages: ['Thank you for submitting!', 'You will receive a confirmation email.'],
      }),
      headers: new Headers(),
    });

    const form = element.shadowRoot.querySelector('form');
    setTimeout(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await oneEvent(element, 'form-submit-success');
    await element.updateComplete;

    // Form should not be visible
    const formElement = element.shadowRoot.querySelector('form');
    expect(formElement).to.not.exist;

    // Success message should be visible
    const successMessage = element.shadowRoot.querySelector('.status-message.success');
    expect(successMessage).to.exist;
    expect(successMessage.textContent).to.include('Form submitted successfully');

    // Server messages should be displayed
    const messageList = successMessage.querySelectorAll('li');
    expect(messageList).to.have.lengthOf(2);
    expect(messageList[0].textContent).to.equal('Thank you for submitting!');
  });

  it('should forward to next form when x-fbms-formforward header is present', async () => {
    const nextFormSchema = {
      fname: 'next-form',
      version: 1,
      schema: {
        title: 'Next Form',
        type: 'object',
        properties: {
          email: {
            type: 'string',
            title: 'Email',
          },
        },
      },
      metadata: {},
    };

    // Mock submission response with forward header
    const mockHeaders = new Headers();
    mockHeaders.set('x-fbms-formforward', 'next-form');

    fetchStub.onFirstCall().resolves({
      ok: true,
      json: async () => ({}),
      headers: mockHeaders,
    });

    // Mock schema fetch for next form
    fetchStub.onSecondCall().resolves({
      ok: true,
      json: async () => nextFormSchema,
    });

    // Mock form data fetch for next form
    fetchStub.onThirdCall().resolves({
      ok: true,
      json: async () => ({ answers: {} }),
    });

    const form = element.shadowRoot.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Wait for re-initialization to complete
    await waitUntil(() => !element.loading && element.schema.title === 'Next Form');

    // Should have loaded the next form
    expect(element.fbmsFormFname).to.equal('next-form');
    expect(element.schema.title).to.equal('Next Form');
    expect(element.formCompleted).to.be.false; // Not completed yet, moved to next form
    expect(element.submitSuccess).to.be.true; // Success message for intermediate form

    // Form should still be visible (for the next form)
    const nextForm = element.shadowRoot.querySelector('form');
    expect(nextForm).to.exist;
  });

  it('should not set formCompleted when forwarding to next form', async () => {
    const mockHeaders = new Headers();
    mockHeaders.set('x-fbms-formforward', 'next-form');

    fetchStub.onFirstCall().resolves({
      ok: true,
      json: async () => ({}),
      headers: mockHeaders,
    });

    fetchStub.onSecondCall().resolves({
      ok: true,
      json: async () => mockSchemaResp,
    });

    fetchStub.onThirdCall().resolves({
      ok: true,
      json: async () => ({ answers: {} }),
    });

    const form = element.shadowRoot.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await waitUntil(() => !element.loading);

    expect(element.formCompleted).to.be.false;
  });

  it('should handle form forward chain and only show success on final form', async () => {
    // First form submission -> forward to form2
    const headers1 = new Headers();
    headers1.set('x-fbms-formforward', 'form2');

    fetchStub.onCall(0).resolves({
      ok: true,
      json: async () => ({}),
      headers: headers1,
    });

    // Load form2 schema
    fetchStub.onCall(1).resolves({
      ok: true,
      json: async () => ({
        fname: 'form2',
        version: 1,
        schema: mockSchema,
        metadata: {},
      }),
    });

    // Load form2 data
    fetchStub.onCall(2).resolves({
      ok: true,
      json: async () => ({ answers: {} }),
    });

    const form = element.shadowRoot.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await waitUntil(() => !element.loading && element.fbmsFormFname === 'form2');

    expect(element.formCompleted).to.be.false;
    expect(element.shadowRoot.querySelector('form')).to.exist;

    // Now submit form2 without forward -> should complete
    fetchStub.reset();
    element.formData = { name: 'Jane Doe' };
    element.hasChanges = true;

    fetchStub.resolves({
      ok: true,
      json: async () => ({ messages: ['All forms completed!'] }),
      headers: new Headers(), // No forward header
    });

    const form2 = element.shadowRoot.querySelector('form');
    setTimeout(() => {
      form2.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await oneEvent(element, 'form-submit-success');
    await element.updateComplete;

    expect(element.formCompleted).to.be.true;
    expect(element.shadowRoot.querySelector('form')).to.not.exist;
    expect(element.shadowRoot.textContent).to.include('All forms completed!');
  });
});
// Add these tests to form-builder.test.js
// These tests use the same imports as the existing test file:
// import { html, fixture, expect, waitUntil, oneEvent, elementUpdated } from '@open-wc/testing';
// import { stub } from 'sinon';
// import '../src/form-builder.js';

describe('Scroll Behavior', () => {
  let element;
  let fetchStub;

  const mockSchema = {
    title: 'Test Form',
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: {
        type: 'string',
        title: 'Name',
      },
      email: {
        type: 'string',
        title: 'Email',
        format: 'email',
      },
    },
  };

  const mockSchemaResp = {
    fname: 'test-form',
    version: 1,
    schema: mockSchema,
    metadata: {},
  };

  beforeEach(async () => {
    fetchStub = stub(window, 'fetch');

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

  afterEach(() => {
    fetchStub.restore();
  });

  describe('Validation Error Scroll', () => {
    it('should scroll to validation warning banner on validation failure', async () => {
      // Submit empty form to trigger validation
      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await element.updateComplete;

      // Verify validation warning exists
      const validationWarning = element.shadowRoot.querySelector(
        '.status-message.validation-error'
      );
      expect(validationWarning).to.exist;
      expect(validationWarning.textContent).to.include('Please correct the errors below');
    });

    it('should have validation warning rendered before field errors', async () => {
      // Submit empty form to trigger validation
      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await element.updateComplete;

      // Check DOM order - validation warning should come before form fields
      const container = element.shadowRoot.querySelector('.container');
      const validationWarning = container.querySelector('.status-message.validation-error');
      const firstFormGroup = container.querySelector('.form-group');

      // Get positions in DOM
      const allElements = Array.from(container.querySelectorAll('*'));
      const warningPosition = allElements.indexOf(validationWarning);
      const formGroupPosition = allElements.indexOf(firstFormGroup);

      expect(warningPosition).to.be.lessThan(formGroupPosition);
    });
  });

  describe('Submission Error Scroll', () => {
    beforeEach(() => {
      element.formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };
      fetchStub.reset();
    });

    it('should scroll to error message on submission failure', async () => {
      fetchStub.resolves({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ messageHeader: 'Server Error' }),
      });

      const form = element.shadowRoot.querySelector('form');

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      await oneEvent(element, 'form-submit-error');
      await element.updateComplete;

      // Verify submission error is set (not general error)
      expect(element.submissionError).to.exist;
      expect(element.error).to.be.null; // General error should remain null

      // The form should still be visible
      const formElement = element.shadowRoot.querySelector('form');
      expect(formElement).to.exist;

      // The error should be displayed in status-message.error within the form
      const errorMsg = element.shadowRoot.querySelector('.status-message.error');
      expect(errorMsg).to.exist;
      expect(errorMsg.textContent).to.include('Server Error');
    });

    it('should display server error messages in list format', async () => {
      fetchStub.resolves({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          messageHeader: 'Validation Failed',
          messages: ['Field X is invalid', 'Field Y is required'],
        }),
      });

      const form = element.shadowRoot.querySelector('form');

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      await oneEvent(element, 'form-submit-error');
      await element.updateComplete;

      // Verify the submission error state is set correctly
      expect(element.submissionError).to.equal('Validation Failed');

      // The form should still be visible
      const formElement = element.shadowRoot.querySelector('form');
      expect(formElement).to.exist;

      // The error is displayed in .status-message.error with the messages list
      const errorMsg = element.shadowRoot.querySelector('.status-message.error');
      expect(errorMsg).to.exist;
      expect(errorMsg.textContent).to.include('Validation Failed');

      // Server messages should be displayed in list format
      const messageList = errorMsg.querySelectorAll('li');
      expect(messageList).to.have.lengthOf(2);
      expect(messageList[0].textContent).to.equal('Field X is invalid');
      expect(messageList[1].textContent).to.equal('Field Y is required');
    });

    it('should clear submission error when user modifies form', async () => {
      fetchStub.resolves({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ messageHeader: 'Server Error' }),
      });

      const form = element.shadowRoot.querySelector('form');

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      await oneEvent(element, 'form-submit-error');
      await element.updateComplete;

      // Verify error is shown
      expect(element.submissionError).to.exist;
      expect(element.shadowRoot.querySelector('.status-message.error')).to.exist;

      // User modifies the form
      const nameInput = element.shadowRoot.querySelector('input[name="name"]');
      nameInput.value = 'Jane Doe';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      await element.updateComplete;

      // Submission error should be cleared
      expect(element.submissionError).to.be.null;
      expect(element.shadowRoot.querySelector('.status-message.error')).to.not.exist;
    });

    it('should allow resubmission after error', async () => {
      // First submission fails
      fetchStub.onFirstCall().resolves({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ messageHeader: 'Server Error' }),
      });

      const form = element.shadowRoot.querySelector('form');

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      await oneEvent(element, 'form-submit-error');
      await element.updateComplete;

      expect(element.submissionError).to.exist;

      // User modifies form to fix issue
      const nameInput = element.shadowRoot.querySelector('input[name="name"]');
      nameInput.value = 'Jane Doe';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      await element.updateComplete;

      // Second submission succeeds
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: async () => ({}),
        headers: new Headers(),
      });

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      await oneEvent(element, 'form-submit-success');
      await element.updateComplete;

      expect(element.submissionError).to.be.null;
      expect(element.formCompleted).to.be.true;
    });
  });

  describe('Success Scroll', () => {
    beforeEach(() => {
      element.formData = {
        name: 'John Doe',
        email: 'john@example.com',
      };
      element.hasChanges = true;
      fetchStub.reset();
    });

    it('should scroll to success message on successful submission', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({ messages: ['Form submitted!'] }),
        headers: new Headers(),
      });

      const form = element.shadowRoot.querySelector('form');

      setTimeout(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      await oneEvent(element, 'form-submit-success');
      await element.updateComplete;

      // Verify success state
      expect(element.formCompleted).to.be.true;
      expect(element.submitSuccess).to.be.true;

      // Success message should be visible
      const successMsg = element.shadowRoot.querySelector('.status-message.success');
      expect(successMsg).to.exist;
      expect(successMsg.textContent).to.include('Form submitted successfully');
    });
  });

  describe('Scroll Target Elements', () => {
    it('should have validation-error class on validation warning', async () => {
      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await element.updateComplete;

      const warning = element.shadowRoot.querySelector('.status-message.validation-error');
      expect(warning).to.exist;
      expect(warning.classList.contains('status-message')).to.be.true;
      expect(warning.classList.contains('validation-error')).to.be.true;
    });

    it('should position validation warning near top of form', async () => {
      const form = element.shadowRoot.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      await element.updateComplete;

      const warning = element.shadowRoot.querySelector('.status-message.validation-error');
      expect(warning).to.exist;

      // The warning should be near the top of the form (after title/description)
      const formElement = element.shadowRoot.querySelector('form');
      const formChildren = Array.from(formElement.children);
      const warningIndex = formChildren.findIndex((child) =>
        child.classList?.contains('status-message')
      );

      // Should be within first few children (after h2/p if present)
      expect(warningIndex).to.be.lessThan(5);
    });
  });
});

describe('Empty Schema (Info-Only Forms)', () => {
  let element;
  let fetchStub;

  const mockEmptySchema = {
    title: 'Email Address Validation',
    description:
      'An email was sent to the address you supplied for validation. You must locate the email and use the provided hyperlink to complete the email validation process.',
    type: 'object',
    properties: {},
  };

  const mockEmptySchemaResp = {
    fname: 'validate-email',
    version: 1,
    schema: mockEmptySchema,
    metadata: {},
  };

  beforeEach(async () => {
    fetchStub = stub(window, 'fetch');

    fetchStub.onFirstCall().resolves({
      ok: true,
      json: async () => mockEmptySchemaResp,
    });
    fetchStub.onSecondCall().resolves({
      ok: true,
      json: async () => ({ answers: {} }),
    });

    element = await fixture(html`
      <form-builder fbms-base-url="/api" fbms-form-fname="validate-email"></form-builder>
    `);

    await waitUntil(() => !element.loading);
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('should render title for empty schema', () => {
    const title = element.shadowRoot.querySelector('h2');
    expect(title).to.exist;
    expect(title.textContent).to.equal('Email Address Validation');
  });

  it('should render description for empty schema', () => {
    const description = element.shadowRoot.querySelector('p');
    expect(description).to.exist;
    expect(description.textContent).to.include('An email was sent to the address');
  });

  it('should not render form element for empty schema', () => {
    const form = element.shadowRoot.querySelector('form');
    expect(form).to.not.exist;
  });

  it('should not render submit button for empty schema', () => {
    const submitButton = element.shadowRoot.querySelector('button[type="submit"]');
    expect(submitButton).to.not.exist;
  });

  it('should not render reset button for empty schema', () => {
    const resetButton = element.shadowRoot.querySelector('button[type="button"]');
    expect(resetButton).to.not.exist;
  });

  it('should render info-only container for empty schema', () => {
    const infoOnly = element.shadowRoot.querySelector('.info-only');
    expect(infoOnly).to.exist;
  });

  it('should not render any form inputs for empty schema', () => {
    const inputs = element.shadowRoot.querySelectorAll('input, select, textarea');
    expect(inputs).to.have.lengthOf(0);
  });
});

describe('Single-Value Enum Fields', () => {
  let element;
  let fetchStub;

  const mockSchemaWithSingleEnum = {
    title: 'Test Form',
    type: 'object',
    properties: {
      notification_status: {
        title: 'You are enrolled in emergency notifications by default per District Policy.',
        type: 'string',
        enum: ['Default'],
      },
      preference: {
        title: 'Preference',
        type: 'string',
        enum: ['Yes', 'No'],
      },
    },
  };

  const mockSchemaResp = {
    fname: 'test-form',
    version: 1,
    schema: mockSchemaWithSingleEnum,
    metadata: {
      notification_status: {
        'ui:widget': 'radio',
      },
      preference: {
        'ui:widget': 'radio',
      },
    },
  };

  beforeEach(async () => {
    fetchStub = stub(window, 'fetch');

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

  afterEach(() => {
    fetchStub.restore();
  });

  it('should render single-value enum as informational text only (no input)', () => {
    // Should NOT have a radio button for single-value enum
    const singleEnumRadios = element.shadowRoot.querySelectorAll(
      'input[name="notification_status"]'
    );
    expect(singleEnumRadios).to.have.lengthOf(0);

    // Should NOT have any select or other input for this field
    const singleEnumSelect = element.shadowRoot.querySelector('select[name="notification_status"]');
    expect(singleEnumSelect).to.not.exist;
  });

  it('should still render multi-value enum as radio buttons', () => {
    const preferenceRadios = element.shadowRoot.querySelectorAll('input[name="preference"]');
    expect(preferenceRadios).to.have.lengthOf(2);
  });

  it('should display the field title/label for single-value enum', () => {
    const label = element.shadowRoot.querySelector('.info-label');
    expect(label).to.exist;
    expect(label.textContent).to.include('You are enrolled in emergency notifications');
  });
});

describe('Form Forwarding with Success Messages', () => {
  let element;
  let fetchStub;

  const mockSchema = {
    title: 'Communication Preferences',
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', title: 'Email' },
    },
  };

  const mockEndStateSchema = {
    title: 'Thank You',
    description: 'Thank you for updating our records.',
    type: 'object',
    properties: {},
  };

  beforeEach(async () => {
    fetchStub = stub(window, 'fetch');

    fetchStub.onFirstCall().resolves({
      ok: true,
      json: async () => ({
        fname: 'communication-preferences',
        version: 1,
        schema: mockSchema,
        metadata: {},
      }),
    });
    fetchStub.onSecondCall().resolves({
      ok: true,
      json: async () => ({ answers: {} }),
    });

    element = await fixture(html`
      <form-builder fbms-base-url="/api" fbms-form-fname="communication-preferences"></form-builder>
    `);

    await waitUntil(() => !element.loading);
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('should display success message with server messages on forwarded form', async () => {
    element.formData = { email: 'test@example.com' };
    element.hasChanges = true;
    fetchStub.reset();

    // Mock submission response with forward header and messages
    const mockHeaders = new Headers();
    mockHeaders.set('x-fbms-formforward', 'end-state-form-entity');

    fetchStub.onFirstCall().resolves({
      ok: true,
      json: async () => ({
        success: true,
        messages: ['An email was sent to the address you supplied for validation.'],
      }),
      headers: mockHeaders,
    });

    // Mock schema fetch for forwarded form
    fetchStub.onSecondCall().resolves({
      ok: true,
      json: async () => ({
        fname: 'end-state-form-entity',
        version: 1,
        schema: mockEndStateSchema,
        metadata: {},
      }),
    });

    // Mock form data fetch for forwarded form
    fetchStub.onThirdCall().resolves({
      ok: true,
      json: async () => ({ answers: {} }),
    });

    const form = element.shadowRoot.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await waitUntil(() => !element.loading && element.schema.title === 'Thank You');

    // Verify success message is displayed
    expect(element.submitSuccess).to.be.true;
    const successMsg = element.shadowRoot.querySelector('.status-message.success');
    expect(successMsg).to.exist;
    expect(successMsg.textContent).to.include('successfully submitted');

    // Verify server messages are displayed
    const messageList = successMsg.querySelectorAll('li');
    expect(messageList).to.have.lengthOf(1);
    expect(messageList[0].textContent).to.include('An email was sent');

    // Verify the forwarded form title is shown
    const title = element.shadowRoot.querySelector('h2');
    expect(title.textContent).to.equal('Thank You');
  });
});

describe('Single-Value Enum Fields', () => {
  // Add these tests to form-builder.test.js
  // These tests use the same imports as the existing test file:
  // import { html, fixture, expect, waitUntil, oneEvent, elementUpdated } from '@open-wc/testing';
  // import { stub } from 'sinon';
  // import '../src/form-builder.js';

  describe('Scroll Behavior', () => {
    let element;
    let fetchStub;

    const mockSchema = {
      title: 'Test Form',
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: {
          type: 'string',
          title: 'Name',
        },
        email: {
          type: 'string',
          title: 'Email',
          format: 'email',
        },
      },
    };

    const mockSchemaResp = {
      fname: 'test-form',
      version: 1,
      schema: mockSchema,
      metadata: {},
    };

    beforeEach(async () => {
      fetchStub = stub(window, 'fetch');

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

    afterEach(() => {
      fetchStub.restore();
    });

    describe('Validation Error Scroll', () => {
      it('should scroll to validation warning banner on validation failure', async () => {
        // Submit empty form to trigger validation
        const form = element.shadowRoot.querySelector('form');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        await element.updateComplete;

        // Verify validation warning exists
        const validationWarning = element.shadowRoot.querySelector(
          '.status-message.validation-error'
        );
        expect(validationWarning).to.exist;
        expect(validationWarning.textContent).to.include('Please correct the errors below');
      });

      it('should have validation warning rendered before field errors', async () => {
        // Submit empty form to trigger validation
        const form = element.shadowRoot.querySelector('form');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        await element.updateComplete;

        // Check DOM order - validation warning should come before form fields
        const container = element.shadowRoot.querySelector('.container');
        const validationWarning = container.querySelector('.status-message.validation-error');
        const firstFormGroup = container.querySelector('.form-group');

        // Get positions in DOM
        const allElements = Array.from(container.querySelectorAll('*'));
        const warningPosition = allElements.indexOf(validationWarning);
        const formGroupPosition = allElements.indexOf(firstFormGroup);

        expect(warningPosition).to.be.lessThan(formGroupPosition);
      });
    });

    describe('Submission Error Scroll', () => {
      beforeEach(() => {
        element.formData = {
          name: 'John Doe',
          email: 'john@example.com',
        };
        element.hasChanges = true;
        fetchStub.reset();
      });

      it('should scroll to error message on submission failure', async () => {
        fetchStub.resolves({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ messageHeader: 'Server Error' }),
        });

        const form = element.shadowRoot.querySelector('form');

        setTimeout(() => {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        await oneEvent(element, 'form-submit-error');
        await element.updateComplete;

        // Verify submission error is set (not general error)
        expect(element.submissionError).to.exist;
        expect(element.error).to.be.null; // General error should remain null

        // The form should still be visible
        const formElement = element.shadowRoot.querySelector('form');
        expect(formElement).to.exist;

        // The error should be displayed in status-message.error within the form
        const errorMsg = element.shadowRoot.querySelector('.status-message.error');
        expect(errorMsg).to.exist;
        expect(errorMsg.textContent).to.include('Server Error');
      });

      it('should display server error messages in list format', async () => {
        fetchStub.resolves({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => ({
            messageHeader: 'Validation Failed',
            messages: ['Field X is invalid', 'Field Y is required'],
          }),
        });

        const form = element.shadowRoot.querySelector('form');

        setTimeout(() => {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        await oneEvent(element, 'form-submit-error');
        await element.updateComplete;

        // Verify the submission error state is set correctly
        expect(element.submissionError).to.equal('Validation Failed');

        // The form should still be visible
        const formElement = element.shadowRoot.querySelector('form');
        expect(formElement).to.exist;

        // The error is displayed in .status-message.error with the messages list
        const errorMsg = element.shadowRoot.querySelector('.status-message.error');
        expect(errorMsg).to.exist;
        expect(errorMsg.textContent).to.include('Validation Failed');

        // Server messages should be displayed in list format
        const messageList = errorMsg.querySelectorAll('li');
        expect(messageList).to.have.lengthOf(2);
        expect(messageList[0].textContent).to.equal('Field X is invalid');
        expect(messageList[1].textContent).to.equal('Field Y is required');
      });

      it('should clear submission error when user modifies form', async () => {
        fetchStub.resolves({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ messageHeader: 'Server Error' }),
        });

        const form = element.shadowRoot.querySelector('form');

        setTimeout(() => {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        await oneEvent(element, 'form-submit-error');
        await element.updateComplete;

        // Verify error is shown
        expect(element.submissionError).to.exist;
        expect(element.shadowRoot.querySelector('.status-message.error')).to.exist;

        // User modifies the form
        const nameInput = element.shadowRoot.querySelector('input[name="name"]');
        nameInput.value = 'Jane Doe';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));

        await element.updateComplete;

        // Submission error should be cleared
        expect(element.submissionError).to.be.null;
        expect(element.shadowRoot.querySelector('.status-message.error')).to.not.exist;
      });

      it('should allow resubmission after error', async () => {
        // First submission fails
        fetchStub.onFirstCall().resolves({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ messageHeader: 'Server Error' }),
        });

        const form = element.shadowRoot.querySelector('form');

        setTimeout(() => {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        await oneEvent(element, 'form-submit-error');
        await element.updateComplete;

        expect(element.submissionError).to.exist;

        // User modifies form to fix issue
        const nameInput = element.shadowRoot.querySelector('input[name="name"]');
        nameInput.value = 'Jane Doe';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        await element.updateComplete;

        // Second submission succeeds
        fetchStub.onSecondCall().resolves({
          ok: true,
          json: async () => ({}),
          headers: new Headers(),
        });

        setTimeout(() => {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        await oneEvent(element, 'form-submit-success');
        await element.updateComplete;

        expect(element.submissionError).to.be.null;
        expect(element.formCompleted).to.be.true;
      });
    });

    describe('Success Scroll', () => {
      beforeEach(() => {
        element.formData = {
          name: 'John Doe',
          email: 'john@example.com',
        };
        element.hasChanges = true;
        fetchStub.reset();
      });

      it('should scroll to success message on successful submission', async () => {
        fetchStub.resolves({
          ok: true,
          json: async () => ({ messages: ['Form submitted!'] }),
          headers: new Headers(),
        });

        const form = element.shadowRoot.querySelector('form');

        setTimeout(() => {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        await oneEvent(element, 'form-submit-success');
        await element.updateComplete;

        // Verify success state
        expect(element.formCompleted).to.be.true;
        expect(element.submitSuccess).to.be.true;

        // Success message should be visible
        const successMsg = element.shadowRoot.querySelector('.status-message.success');
        expect(successMsg).to.exist;
        expect(successMsg.textContent).to.include('Form submitted successfully');
      });
    });

    describe('Scroll Target Elements', () => {
      it('should have validation-error class on validation warning', async () => {
        const form = element.shadowRoot.querySelector('form');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        await element.updateComplete;

        const warning = element.shadowRoot.querySelector('.status-message.validation-error');
        expect(warning).to.exist;
        expect(warning.classList.contains('status-message')).to.be.true;
        expect(warning.classList.contains('validation-error')).to.be.true;
      });

      it('should position validation warning near top of form', async () => {
        const form = element.shadowRoot.querySelector('form');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        await element.updateComplete;

        const warning = element.shadowRoot.querySelector('.status-message.validation-error');
        expect(warning).to.exist;

        // The warning should be near the top of the form (after title/description)
        const formElement = element.shadowRoot.querySelector('form');
        const formChildren = Array.from(formElement.children);
        const warningIndex = formChildren.findIndex((child) =>
          child.classList?.contains('status-message')
        );

        // Should be within first few children (after h2/p if present)
        expect(warningIndex).to.be.lessThan(5);
      });
    });
  });
});

describe('Empty Schema (Info-Only Forms)', () => {
  let element;
  let fetchStub;

  const mockEmptySchema = {
    title: 'Email Address Validation',
    description:
      'An email was sent to the address you supplied for validation. You must locate the email and use the provided hyperlink to complete the email validation process.',
    type: 'object',
    properties: {},
  };

  const mockEmptySchemaResp = {
    fname: 'validate-email',
    version: 1,
    schema: mockEmptySchema,
    metadata: {},
  };

  beforeEach(async () => {
    fetchStub = stub(window, 'fetch');

    fetchStub.onFirstCall().resolves({
      ok: true,
      json: async () => mockEmptySchemaResp,
    });
    fetchStub.onSecondCall().resolves({
      ok: true,
      json: async () => ({ answers: {} }),
    });

    element = await fixture(html`
      <form-builder fbms-base-url="/api" fbms-form-fname="validate-email"></form-builder>
    `);

    await waitUntil(() => !element.loading);
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('should render title for empty schema', () => {
    const title = element.shadowRoot.querySelector('h2');
    expect(title).to.exist;
    expect(title.textContent).to.equal('Email Address Validation');
  });

  it('should render description for empty schema', () => {
    const description = element.shadowRoot.querySelector('p');
    expect(description).to.exist;
    expect(description.textContent).to.include('An email was sent to the address');
  });

  it('should not render form element for empty schema', () => {
    const form = element.shadowRoot.querySelector('form');
    expect(form).to.not.exist;
  });

  it('should not render submit button for empty schema', () => {
    const submitButton = element.shadowRoot.querySelector('button[type="submit"]');
    expect(submitButton).to.not.exist;
  });

  it('should not render reset button for empty schema', () => {
    const resetButton = element.shadowRoot.querySelector('button[type="button"]');
    expect(resetButton).to.not.exist;
  });

  it('should render info-only container for empty schema', () => {
    const infoOnly = element.shadowRoot.querySelector('.info-only');
    expect(infoOnly).to.exist;
  });

  it('should not render any form inputs for empty schema', () => {
    const inputs = element.shadowRoot.querySelectorAll('input, select, textarea');
    expect(inputs).to.have.lengthOf(0);
  });
});

describe('Single-Value Enum Fields', () => {
  let element;
  let fetchStub;

  const mockSchemaWithSingleEnum = {
    title: 'Test Form',
    type: 'object',
    properties: {
      notification_status: {
        title: 'You are enrolled in emergency notifications by default per District Policy.',
        type: 'string',
        enum: ['Default'],
      },
      preference: {
        title: 'Preference',
        type: 'string',
        enum: ['Yes', 'No'],
      },
    },
  };

  const mockSchemaResp = {
    fname: 'test-form',
    version: 1,
    schema: mockSchemaWithSingleEnum,
    metadata: {
      notification_status: {
        'ui:widget': 'radio',
      },
      preference: {
        'ui:widget': 'radio',
      },
    },
  };

  beforeEach(async () => {
    fetchStub = stub(window, 'fetch');

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

  afterEach(() => {
    fetchStub.restore();
  });

  it('should render single-value enum as informational text only (no input)', () => {
    // Should NOT have a radio button for single-value enum
    const singleEnumRadios = element.shadowRoot.querySelectorAll(
      'input[name="notification_status"]'
    );
    expect(singleEnumRadios).to.have.lengthOf(0);

    // Should NOT have any select or other input for this field
    const singleEnumSelect = element.shadowRoot.querySelector('select[name="notification_status"]');
    expect(singleEnumSelect).to.not.exist;
  });

  it('should still render multi-value enum as radio buttons', () => {
    const preferenceRadios = element.shadowRoot.querySelectorAll('input[name="preference"]');
    expect(preferenceRadios).to.have.lengthOf(2);
  });

  it('should display the field title for single-value enum', () => {
    const infoLabel = element.shadowRoot.querySelector('.info-label');
    expect(infoLabel).to.exist;
    expect(infoLabel.textContent).to.include('You are enrolled in emergency notifications');
  });
});
