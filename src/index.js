import 'core-js/es6/symbol';
import 'core-js/es7/object';
import 'document-register-element';

import registerReact from '@christianmurphy/reactive-elements';
import App from './App';

registerReact('form-builder', App);
