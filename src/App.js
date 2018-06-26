import React, { Component } from 'react';
import './App.css';
import Form from "react-jsonschema-form";
import PropTypes from 'prop-types';
import oidc from '@uportal/open-id-connect/esm/open-id-connect';

const log = (type) => console.log.bind(console, type);

class App extends Component {
    static propTypes = {
        formUrl: PropTypes.string.isRequired,
        responseUrl: PropTypes.string.isRequired,
        oidcUrl: PropTypes.string
    };

    state = {
        schema: {},
        uiSchema: {},
        formData: {}
    };

    fetchSchema = async () => {
        const {formUrl, oidcUrl} = this.props;

        try {
            // open /Applications/Google\ Chrome.app --args --disable-web-security --user-data-dir
            const response = await fetch(formUrl, {
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + (oidcUrl ? (await oidc({userInfoApiUrl: oidcUrl, timeout: 18000})).encoded : (await oidc({timeout: 18000})).encoded),
                    'content-type': 'application/jwt',
                  }
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const payload = await response.json();
            const uiSchema = payload.metadata;
            const schema = payload.schema;

            this.setState({schema, uiSchema});
        } catch (err) {
            // error
            console.error(err);
        }
    };

    fetchFormData = async () => {
        const {responseUrl, oidcUrl} = this.props;

        try {
            const response = await fetch(responseUrl, {
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + (oidcUrl ? (await oidc({userInfoApiUrl: oidcUrl, timeout: 18000})).encoded : (await oidc({timeout: 18000})).encoded),
                    'content-type': 'application/jwt',
                  }
            });

            if (!response.ok) {
                throw new Error(response.statusText);
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
        this.fetchFormData();
    };

    componentDidMount = this.getForm;

    render = () => {
        const {schema, uiSchema, formData} = this.state;
        return (
            <Form schema={schema} uiSchema={uiSchema} formData={formData} onChange={log("changed")} onSubmit={log("submitted")} onError={log("errors")} />
        );
    }
}

export default App;
