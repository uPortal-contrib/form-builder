
import React, { Component } from 'react';
import Form from "react-jsonschema-form";
import PropTypes from 'prop-types';
import oidc from '@uportal/open-id-connect';
import get from 'lodash.get';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faExclamationCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import 'regenerator-runtime/runtime';

library.add(faExclamationCircle, faCheckCircle);

// FIXME: remove this
const log = (type) => console.log.bind(console, type);

class App extends Component {
    static propTypes = {
        fbmsBaseUrl: PropTypes.string,
        fbmsFormFname: PropTypes.string.isRequired,
        oidcUrl: PropTypes.string,
        showErrorList: PropTypes.bool
    };

    static defaultProps = {
        fbmsBaseUrl: '/fbms',
        showErrorList: true
    };

    state = {
        schema: {},
        uiSchema: {},
        formData: {},
        hasError: false,
        submissionStatus: {},
        hasSuccess: false,
        fbmsFormFname: this.props.fbmsFormFname,
    };

    handleOidcError = (err) => {
        console.error(err);
        this.setState({hasError: true, errorMessage: 'There was a problem authorizing this request.'});
    };

    handleFbmsError = (err) => {
        if (err.type === 'submission') {
            err.messageHeader = 'There was a problem submitting your form.';
        } else {
            err.messageHeader = 'There was a problem finding your form.';
        }

        this.setState({hasError: true});
    };

    handleChange = (data) => {
        this.setState({formData: data.formData});
    };

    getToken = async () => {
        const {oidcUrl} = this.props;

        try {
            return (await oidc({userInfoApiUrl: oidcUrl, timeout: 18000}));
        } catch (err) {
            console.error(err);
            this.handleOidcError(err);
        }
    };

    fetchSchema = async () => {
        const {fbmsBaseUrl} = this.props;
        const {fbmsFormFname} = this.state;
        try {
            const response = await fetch(fbmsBaseUrl + '/api/v1/forms/' + fbmsFormFname, {
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + (await this.getToken()).encoded,
                    'content-type': 'application/jwt',
                }
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const payload = await response.json();
            const fbmsFormVersion = payload.version;
            const uiSchema = payload.metadata;
            const schema = payload.schema;

            this.setState({fbmsFormVersion, schema, uiSchema});
            this.fetchFormData();
        } catch (err) {
            // error
            this.handleFbmsError(err);
            console.error(err);
        }
    };

    fetchFormData = async () => {
        const {fbmsBaseUrl} = this.props;
        const {fbmsFormFname} = this.state;

        // Add a random query string token to the URL to get around the way
        // Safari caches content, despite explicit Cache-Control header settings.
        const submissionUrl = fbmsBaseUrl + '/api/v1/submissions/' + fbmsFormFname + '?safarifix=' + Math.random();

        try {
            const response = await fetch(submissionUrl, {
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + (await this.getToken()).encoded,
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

    transformBody = (formData, username) => {
        const {fbmsFormFname, fbmsFormVersion} = this.state;
        return {
            username: username,
            formFname: fbmsFormFname,
            formVersion: fbmsFormVersion,
            timestamp: Date.now(),
            answers: formData
        };
    };

    conditionallyHideSubmit = (schema) => {
        if (schema.properties && Object.keys(schema.properties).length === 0) {
            return (
                ' '
            )
        }
    };

    submitForm = async (userFormData) => {
        const {fbmsBaseUrl} = this.props;
        const {fbmsFormFname} = this.state;
        const token = await this.getToken();
        const body = this.transformBody(userFormData, token.decoded.sub);
        this.setState({hasError: false});

        try {
            const response = await fetch(fbmsBaseUrl + '/api/v1/submissions/' + fbmsFormFname, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + token.encoded,
                    'content-type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            let submissionStatus = await response.json();
            this.setState({submissionStatus});

            if (!response.ok) {
                submissionStatus.type = 'submission';
                this.handleFbmsError(submissionStatus);
                throw new Error(response.statusText);
            }

            this.fetchFormData();

            /* Note: for...of was not used here because of IE */
            const entries = response.headers.entries();
            let formForward,
                item = entries.next();
            while (!item.done) {
                let headerName = item.value[0],
                    headerValue = item.value[1];
                if (headerName.toLowerCase() === 'x-fbms-formforward') {
                    formForward = headerValue;
                    break;
                }
                item = entries.next();
            }

            if (formForward) {
                this.setState({fbmsFormFname: formForward});
                this.getForm();
            }

            this.setState({hasSuccess: true});
            this.scrollToNotification();
        } catch (err) {
            console.error(err);
            this.scrollToNotification();
        }
    };

    scrollToNotification = () => {
        const element = document.getElementById('form-builder-notification');
        if (element) {
            element.scrollIntoView({behavior: 'smooth'});
        }
     };

    getForm = () => {
        this.fetchSchema();
    };

    /**
     * Allows any message from a validation rule to be overridden.
     * Overrides come from a "messages" object, with a property matching the
     * rule that will be overridden.
     * For example to override a string pattern, that following schema could be
     * used.
     *
     * "example": {
     *   "type": "string",
     *   "pattern": "^[A-Z]{3}$",
     *   "messages": {
     *     "pattern": "Must be three upper case letters"
     *   }
     * }
     */
    transformErrors = (errors) => errors.map((err) => {
      const {property, name} = err;
      const {schema} = this.state;
      const pathParts = property.split('.');
      const prefix = pathParts.join('.properties.').substring(1); // remove leading period (.)
      const messageLocation = prefix + '.messages.' + name;
      const customMessage = get(schema, messageLocation);
      if (customMessage) {
        err.message = customMessage;
      }
      return err;
    });

    componentDidMount = this.getForm;

    render = () => {
        const {schema, uiSchema, formData, hasError, hasSuccess, submissionStatus} = this.state;
        const onSubmit = ({formData}) => this.submitForm(formData);
	
        // this.props.children come through as a DocumentFragment, 
        // and cannot be added directly as a React element.
        let tempElem = document.createElement("div");
        tempElem.appendChild(this.props.children);
	let childrenHtmlStr = tempElem.innerHTML;
	console.log("this.props.children is: ["+ childrenHtmlStr + "]");

        return (
            <div>
		<div dangerouslySetInnerHTML={{__html: childrenHtmlStr}}/>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css"></link>
                { hasError &&
                    <div id="form-builder-notification" className="alert alert-danger" role="alert">
                        <h3><FontAwesomeIcon icon="exclamation-circle" style={{width: '1em'}} /> {submissionStatus.messageHeader}</h3>
                        {submissionStatus && submissionStatus.messages && submissionStatus.messages.length > 0 &&
                            <ul>
                                {submissionStatus.messages.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        }
                    </div>
                }
                { hasSuccess &&
                    <div id="form-builder-notification" className="alert alert-success" role="alert">
                        <FontAwesomeIcon icon="check-circle" style={{width: '1em'}} /> Your form was successfully submitted.
                        {submissionStatus && submissionStatus.messages && submissionStatus.messages.length > 0 &&
                            <ul>
                                {submissionStatus.messages.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        }
                    </div>
                }

                <Form
                        schema={schema}
                        uiSchema={uiSchema}
                        formData={formData}
                        onChange={this.handleChange}
                        onSubmit={onSubmit}
                        onError={log("errors")}
                        showErrorList={this.props.showErrorList}
                        transformErrors={this.transformErrors}
                        safeRenderCompletion={true}>
                    {this.conditionallyHideSubmit(schema)}
                </Form>
            </div>
        );
    }
}

export default App;
