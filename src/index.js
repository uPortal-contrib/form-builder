import 'core-js/es6/symbol';
import 'core-js/es7/object';

import App from './App';
import 'document-register-element';

import RegisterReact from 'reactive-elements';

RegisterReact.registerReact('form-builder', App);
