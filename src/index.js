import './index.css';
import App from './App';
import RegisterReact from 'reactive-elements';
import registerServiceWorker from './registerServiceWorker';

RegisterReact.registerReact('communication-preferences', App);
registerServiceWorker();
