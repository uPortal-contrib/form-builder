# Form Builder

> Create html input forms on the fly

## Installation

```bash
npm install @uportal/form-builder
```

## Usage

```
<form-builder fbms-base-url="http://localhost:8091/api/v1/forms/" fbms-form-name="communication-preferences" response-url="http://localhost:8091/api/v1/responses/" oidc-url="http://localhost:8080/uPortal/api/v5-1/userinfo"></form-builder>
```

## Properties

- **fbms-base-url**: Base URL of the form builder micro service. Requires trailing forward slash.
- **fbms-form-name**: Form name that is appended to the fbms-base-url.
- **response-url**: URL that is called to get previously entered form data for prepopulation of form.
- **oidc-url**: Open ID Connect URL to authenticate requests.

## Resources

* [React JSONSchema Form](https://github.com/mozilla-services/react-jsonschema-form)
* [Form Builder Microservice](https://github.com/drewwills/fbms)
* [React](https://reactjs.org/)
* [Create React App](https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/template/README.md)
* [Open ID Connect Helper](https://github.com/uPortal-contrib/uPortal-web-components/tree/master/%40uportal/open-id-connect)
