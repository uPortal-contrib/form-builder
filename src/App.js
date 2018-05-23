import React, { Component } from 'react';
import './App.css';
import Form from "react-jsonschema-form";

const schema = {
    "$schema":"http://json-schema.org/draft-06/schema#",
    "$id":"http://localhost:8090/communication-preferences.json",
    "title":"Communication Preferences",
    "description":"Please review your information that we have on file to make sure that our records are up-to-date.  Failure to provide current information can cause our self service not to work for you.",
    "type":"object",
    "properties":{
        "contact_information":{
            "$id":"/properties/contact_information",
            "description":"Be aware that confidential information may be sent to the cell numbers and/or email address provided here.",
            "type":"object",
            "properties":{
                "primary_cell_number":{
                    "$id":"/properties/contact_information/primary_cell_number",
                    "title":"Primary Cell Number",
                    "type":"string",
                    "pattern":"^\\d{3}-\\d{3}-\\d{4}$"
                },
                "secondary_cell_number":{
                    "$id":"/properties/contact_information/secondary_cell_number",
                    "title":"Secondary Cell Number",
                    "description":"(This number can be used to keep parents informed.)",
                    "type":"string",
                    "pattern":"^\\d{3}-\\d{3}-\\d{4}$"
                },
                "email_address":{
                    "$id":"/properties/contact_information/email_address",
                    "title":"Email Address",
                    "type":"string",
                    "format":"email"
                }
            }
        },
        "channels":{
            "$id":"/properties/channels",
            "description":"The following messaging services are available for you to subscribe.  Some services are available at multiple campuses;  your primary campus will be selected by default.",
            "type":"object",
            "properties":{
                "taco_truck":{
                    "$id":"/properties/channels/taco_truck",
                    "title":"Taco Truck",
                    "description":"This service keeps you informed about where to find tacos on campus",
                    "type":"object",
                    "properties":{
                        "receive":{
                            "$id":"/properties/channels/taco_truck/receive",
                            "type":"string",
                            "enum":[
                                "Yes",
                                "No"
                            ]
                        },
                        "locations":{
                            "$id":"/properties/channels/taco_truck/locations",
                            "type":"array",
                            "items":{
                                "type":"string",
                                "enum":[
                                    "Fresno City College",
                                    "Clovis Community College",
                                    "Reedley College"
                                ]
                            },
                            "uniqueItems":true
                        }
                    }
                }
            }
        },
        "preserve_selections":{
            "$id":"/properties/preserve_selections",
            "description":"Preserve subscribed notifications when no longer taking classes.  Review the Subscription Policy for more details.",
            "type":"boolean"
        }
    }
};

const uiSchema = {
    "channels": {
        "taco_truck": {
            "receive": {
                "ui:widget": "radio",
                "ui:options": {
                    "inline": true
                }
            },
            "locations": {
                "ui:widget": "checkboxes",
                "ui:options": {
                    "inline": true
                }
            }
        }
    }
};

const log = (type) => console.log.bind(console, type);

class App extends Component {
    render() {
        return (
            <Form schema={schema} uiSchema={uiSchema} onChange={log("changed")} onSubmit={log("submitted")} onError={log("errors")} />
        );
    }
}

export default App;
