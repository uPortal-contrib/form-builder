// See: https://facebook.github.io/create-react-app/docs/proxying-api-requests-in-development#configuring-the-proxy-manually

const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(proxy('/uPortal', { target: 'http://localhost:8080' }));
  app.use(proxy('/fbms', { target: 'http://localhost:8080' }));
};
