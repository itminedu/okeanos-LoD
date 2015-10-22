/* global require, module */
var EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function(defaults) {
  var app = new EmberApp(defaults, {
    // Add options here
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  app.import(app.bowerDirectory + '/AdminLTE/plugins/jQuery/jQuery-2.1.4.min.js');
  app.import(app.bowerDirectory + '/AdminLTE/plugins/jQueryUI/jquery-ui.min.js');
  app.import(app.bowerDirectory + '/handlebars/handlebars.js');
  //app.import(app.bowerDirectory + '/bootstrap/dist/js/bootstrap.js');
  //app.import(app.bowerDirectory + '/bootstrap/dist/css/bootstrap.css');
  app.import(app.bowerDirectory + '/AdminLTE/bootstrap/js/bootstrap.min.js');
  app.import(app.bowerDirectory + '/AdminLTE/dist/js/app.min.js');
  app.import(app.bowerDirectory + '/AdminLTE/bootstrap/css/bootstrap.min.css');
  app.import(app.bowerDirectory + '/AdminLTE/dist/css/AdminLTE.min.css');
  app.import(app.bowerDirectory + '/AdminLTE/dist/css/skins/_all-skins.min.css');
  app.import(app.bowerDirectory + '/AdminLTE/build/less/header.less');
  app.import(app.bowerDirectory + '/AdminLTE/build/less/dropdown.less');
  app.import(app.bowerDirectory + '/AdminLTE/build/less/sidebar.less');

  return app.toTree();
};
