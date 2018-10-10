
import React, { Component } from 'react';
import Form from "react-jsonschema-form";
import PropTypes from 'prop-types';
import oidc from '@uportal/open-id-connect';
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

        try {
            const response = await fetch(fbmsBaseUrl + '/api/v1/submissions/' + fbmsFormFname, {
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

    componentDidMount = this.getForm;

    render = () => {
        const {schema, uiSchema, formData, hasError, hasSuccess, submissionStatus} = this.state;
        const onSubmit = ({formData}) => this.submitForm(formData);

        return (
            <div>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css"></link>
                { hasError &&
                    <div id="form-builder-notification" className="alert alert-danger" role="alert">
                        <h3><FontAwesomeIcon icon="exclamation-circle" /> {submissionStatus.messageHeader}</h3>
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
                        <FontAwesomeIcon icon="check-circle" /> Your form was successfully submitted.
                        {submissionStatus && submissionStatus.messages && submissionStatus.messages.length > 0 &&
                            <ul>
                                {submissionStatus.messages.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        }
                    </div>
                }

                <Form schema={schema} uiSchema={uiSchema} formData={formData} onChange={this.handleChange} onSubmit={onSubmit} onError={log("errors")} safeRenderCompletion={true}>
                    {this.conditionallyHideSubmit(schema)}
                </Form>
            </div>
        );
    }
}

export default App;
