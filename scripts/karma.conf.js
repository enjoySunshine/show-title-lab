const generate = require('videojs-generate-karma-config');

module.exports = function(config) {

  // see 
  // for options
  const options = {
    coverage: false,
    browsers(aboutToRun) {
      return aboutToRun.filter(function(launcherName) {
        return !(/^(Safari|Chromium)/).test(launcherName);
      });
    },
    browserstackLaunchers(defaults) {
      delete defaults.bsSafari15;
      delete defaults.bsSafari17;

      return defaults;
    }
  };

  config = generate(config, options);

  // any other custom stuff not supported by options here!
};
