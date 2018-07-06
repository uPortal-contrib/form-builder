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
        fbmsBaseUrl: PropTypes.string,
        fbmsFormFname: PropTypes.string.isRequired,
        oidcUrl: PropTypes.string
    };

    static defaultProps = {
        fbmsBaseUrl: '/fbms'
    };

    state = {
        schema: {},
        uiSchema: {},
        formData: {},
        hasError: false,
        errorMessage: ''
    };

    handleOidcError = (err) => {
        console.error(err);
        this.setState({hasError: true, errorMessage: 'There was a problem authorizing this request.'});
    };

    handleFbmsError = (err) => {
        let message;

        if (err.type === 'submission') {
            message = 'There was a problem submitting your form.';
        } else {
            message = 'There was a problem finding your form.';
        }

        this.setState({hasError: true, errorMessage: message});
    };

    getToken = async () => {
        const {oidcUrl} = this.props;

        try {
            const {encoded} = await oidc({userInfoApiUrl: oidcUrl, timeout: 18000});
            return encoded;
        } catch (err) {
            console.error(err);
            this.handleOidcError(err);
        }
    };

    fetchSchema = async () => {
        const {fbmsBaseUrl, fbmsFormFname} = this.props;
        try {
            // open /Applications/Google\ Chrome.app --args --disable-web-security --user-data-dir
            const response = await fetch(fbmsBaseUrl + '/api/v1/forms/' + fbmsFormFname, {
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + await this.getToken(),
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
            console.error('fdfdf' + err);
        }
    };

    fetchFormData = async () => {
        const {fbmsBaseUrl, fbmsFormFname} = this.props;

        try {
            const response = await fetch(fbmsBaseUrl + '/api/v1/submissions/' + fbmsFormFname, {
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + await this.getToken(),
                    'content-type': 'application/jwt',
                }
            });

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
            console.error(err);
            this.handleFbmsError(err);
        }
    };

    transformBody = (formData) => {
        const {fbmsFormFname} = this.props;
        return {
            username: 'admin',
            formFname: fbmsFormFname,
            formVersion: 1,
            timestamp: Date.now(),
            answers: formData
        };
    };

    submitForm = async (userFormData) => {
        const {fbmsBaseUrl, fbmsFormFname} = this.props;
        const body = this.transformBody(userFormData);
        try {
            const response = await fetch(fbmsBaseUrl + '/api/v1/submissions/' + fbmsFormFname, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + await this.getToken(),
                    'content-type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                console.info('*********** response', response);
                throw new Error(response.statusText);
            }
        } catch (err) {
            err.type = 'submission';
            console.error(err);
            this.handleFbmsError(err);
        }
    };

    getForm = () => {
        this.fetchSchema();
    };

    componentDidMount = this.getForm;

    render = () => {
        const {schema, uiSchema, formData, hasError, errorMessage} = this.state;
        const onSubmit = ({formData}) => this.submitForm(formData);

        if (hasError) {
            return (
                <div className="alert alert-danger" role="alert"><FontAwesomeIcon icon="exclamation-circle" /> {errorMessage}</div>
            );
        } else {
            return (
                <Form schema={schema} uiSchema={uiSchema} formData={formData} onChange={log("changed")} onSubmit={onSubmit} onError={log("errors")} />
            );
        }
    }
}

export default App;
