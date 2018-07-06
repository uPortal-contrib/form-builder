import React, {Component} from 'react';
import 'document-register-element';
import Form from 'react-jsonschema-form';
import PropTypes from 'prop-types';
import oidc from '@uportal/open-id-connect';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
// import {faExclamationCircle} from '@fortawesome/fontawesome-free-solid';

const log = (type) => console.log.bind(console, type);

class App extends Component {
  static propTypes = {
    fbmsBaseUrl: PropTypes.string,
    fbmsFormFname: PropTypes.string.isRequired,
    oidcUrl: PropTypes.string,
  };

  static defaultProps = {
    fbmsBaseUrl: '/fbms',
  };

  state = {
    schema: {},
    uiSchema: {},
    formData: {},
    hasError: false,
    errorMessage: '',
  };

  handleOidcError = (err) => {
    console.error(err);
    this.setState({
      hasError: true,
      errorMessage: 'There was a problem authorizing this request.',
    });
  };

  handleFbmsError = (err) => {
    console.error(err);
    const hasError = true;
    const errorMessage = 'There was a problem finding your form.';
    this.setState({hasError, errorMessage});
  };

  fetchSchema = async () => {
    const {fbmsBaseUrl, fbmsFormFname, oidcUrl} = this.props;

    let token;
    try {
      token = (await oidc({userInfoApiUrl: oidcUrl, timeout: 18000})).encoded;
    } catch (err) {
      return this.handleOidcError(err);
    }

    try {
      // open /Applications/Google\ Chrome.app --args --disable-web-security --user-data-dir
      const response = await fetch(
        fbmsBaseUrl + '/api/v1/forms/' + fbmsFormFname,
        {
          credentials: 'same-origin',
          headers: {
            'Authorization': 'Bearer ' + token,
            'content-type': 'application/jwt',
          },
        }
      );

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const payload = await response.json();
      const uiSchema = payload.metadata;
      const schema = payload.schema;

      this.setState({schema, uiSchema});
      this.fetchFormData();
    } catch (err) {
      this.handleFbmsError(err);
    }
  };

  fetchFormData = async () => {
    const {fbmsBaseUrl, fbmsFormFname, oidcUrl} = this.props;

    let token;
    try {
      token = (await oidc({userInfoApiUrl: oidcUrl, timeout: 18000})).encoded;
    } catch (err) {
      return this.handleOidcError(err);
    }

    try {
      const response = await fetch(
        fbmsBaseUrl + '/api/v1/submissions/' + fbmsFormFname,
        {
          credentials: 'same-origin',
          headers: {
            'Authorization': 'Bearer ' + token,
            'content-type': 'application/jwt',
          },
        }
      );

      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error(response.statusText);
        } else {
          return;
        }
      }

      const payload = await response.json();
      const formData = payload.answers;
      this.setState({formData});
    } catch (err) {
      this.handleFbmsError(err);
    }
  };

  getForm = () => {
    this.fetchSchema();
  };

  componentDidMount = this.getForm;

  render = () => {
    const {schema, uiSchema, formData, hasError, errorMessage} = this.state;
    if (hasError) {
      return (
        <div className="alert alert-danger" role="alert">
          <FontAwesomeIcon icon="exclamation-circle" /> {errorMessage}
        </div>
      );
    } else {
      return (
        <Form
          schema={schema}
          uiSchema={uiSchema}
          formData={formData}
          onChange={log('changed')}
          onSubmit={log('submitted')}
          onError={log('errors')}
        />
      );
    }
  };
}

export default App;
