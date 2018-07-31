# Form Builder

[![NPM Version](https://img.shields.io/npm/v/@uportal/form-builder.svg)](https://www.npmjs.com/package/@uportal/form-builder)
[![Maven Central](https://maven-badges.herokuapp.com/maven-central/org.webjars.npm/uportal__form-builder/badge.svg)](https://maven-badges.herokuapp.com/maven-central/org.webjars.npm/uportal__form-builder)
[![Build Status](https://travis-ci.org/uPortal-contrib/form-builder.svg?branch=master)](https://travis-ci.org/uPortal-contrib/form-builder)

> Create html input forms on the fly

## Installation

```bash
npm install @uportal/form-builder
```

## Usage

```html
<form-builder
    fbms-base-url="/fbms"
    fbms-form-fname="communication-preferences"
    oidc-url="/uPortal/api/v5-1/userinfo">
</form-builder>
```

## Properties

- **fbms-base-url**: Base URL of the form builder micro service.
- **fbms-form-fname**: Form name that is appended to the fbms-base-url.
- **oidc-url**: Open ID Connect URL to authenticate requests.

## Resources

- [React JSONSchema Form](https://github.com/mozilla-services/react-jsonschema-form)
- [Form Builder Microservice](https://github.com/drewwills/fbms)
- [React](https://reactjs.org/)
- [Create React App](https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/template/README.md)
- [Open ID Connect Helper](https://github.com/uPortal-contrib/uPortal-web-components/tree/master/%40uportal/open-id-connect)
