import React, { Component } from 'react';
import './App.css';
import Form from "react-jsonschema-form";
import PropTypes from 'prop-types';
import oidc from '@uportal/open-id-connect';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import {faExclamationCircle} from '@fortawesome/fontawesome-free-solid';

const log = (type) => console.log.bind(console, type);

class App extends Component {
    static propTypes = {
        fbmsBaseUrl: PropTypes.string.isRequired,
        fbmsFormName: PropTypes.string.isRequired,
        responseUrl: PropTypes.string.isRequired,
        oidcUrl: PropTypes.string
    };

    state = {
        schema: {},
        uiSchema: {},
        formData: {},
        hasError: false,
        errorMessage: ''
    };

    handleOidc = (err, token) => {
        if (err) {
            const hasError = true;
            const errorMessage = 'There was a problem authorizing this request.';
            this.setState({hasError, errorMessage});
            throw new Error(err);
        } else {
            return token.encoded;
        }
    };

    handleFbmsError = () => {
        const hasError = true;
        const errorMessage = 'There was a problem finding your form.';
        this.setState({hasError, errorMessage});
    }

    fetchSchema = async () => {
        const {fbmsBaseUrl, fbmsFormName, oidcUrl} = this.props;

        try {
            // open /Applications/Google\ Chrome.app --args --disable-web-security --user-data-dir
            const response = await fetch(fbmsBaseUrl + fbmsFormName, {
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + (oidcUrl ? (await oidc({userInfoApiUrl: oidcUrl, timeout: 18000}, this.handleOidc)) : (await oidc({timeout: 18000}, this.handleOidc))),
                    'content-type': 'application/jwt',
                  }
            });

            if (!response.ok) {
                this.handleFbmsError();
                throw new Error(response.statusText);
            }

            const payload = await response.json();
            const uiSchema = payload.metadata;
            const schema = payload.schema;

            this.setState({schema, uiSchema});
            this.fetchFormData();
        } catch (err) {
            // error
            console.error(err);
        }
    };

    fetchFormData = async () => {
        const {responseUrl, fbmsFormName, oidcUrl} = this.props;

        try {
            const response = await fetch(responseUrl + fbmsFormName, {
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + (oidcUrl ? (await oidc({userInfoApiUrl: oidcUrl, timeout: 18000}, this.handleOidc)) : (await oidc({timeout: 18000}, this.handleOidc))),
                    'content-type': 'application/jwt',
                  }
            });

            if (!response.ok) {
                if (response.status !== 404) {
                    this.handleFbmsError();
                    throw new Error(response.statusText);
                } else {
                    return;
                }
            }

            const payload = await response.json();
            const formData = payload.answers;
            this.setState({formData});
        } catch (err) {
            // error
            console.error(err);
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
                <div className="alert alert-danger" role="alert"><FontAwesomeIcon icon="exclamation-circle" /> {errorMessage}</div>
            );
        } else {
            return (
                <Form schema={schema} uiSchema={uiSchema} formData={formData} onChange={log("changed")} onSubmit={log("submitted")} onError={log("errors")} />
            );
        }
    }
}

export default App;
