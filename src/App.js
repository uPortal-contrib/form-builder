import React, { Component } from 'react';
import './App.css';
import Form from "react-jsonschema-form";
import PropTypes from 'prop-types';
import oidc from '@uportal/open-id-connect/esm/open-id-connect';

const log = (type) => console.log.bind(console, type);

class App extends Component {
    static propTypes = {
        form: PropTypes.string
    };

    static defaultProps = {
        form: '/default/api/url/here'
    };

    state = {
        schema: {},
        uiSchema: {}
    };

    fetchSchema = async () => {
        const {form} = this.props;

        try {
            // open /Applications/Google\ Chrome.app --args --disable-web-security --user-data-dir
            const response = await fetch(form, {
                credentials: 'same-origin',
                headers: {
                    'Authorization': 'Bearer ' + (await oidc({userInfoApiUrl: 'http://localhost:8080/uPortal/api/v5-1/userinfo', timeout: 18000})).encoded,
                    'content-type': 'application/jwt',
                  }
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const payload = await response.json();
            const uiSchema = payload[0].metadata;
            const schema = payload[0].schema;

            this.setState({schema, uiSchema});
        } catch (err) {
            // error
            console.error(err);
        }
    };

    componentDidMount = this.fetchSchema;

    render = () => {
        const {schema, uiSchema} = this.state;
        return (
            <Form schema={schema} uiSchema={uiSchema} onChange={log("changed")} onSubmit={log("submitted")} onError={log("errors")} />
        );
    }
}

export default App;
