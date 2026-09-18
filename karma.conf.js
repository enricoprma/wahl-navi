const { join } = require("node:path");

module.exports = (config) => {
  config.set({
    basePath: "",
    frameworks: ['jasmine'],
    plugins: [
      require("karma-jasmine"),
      require("karma-chrome-launcher"),
      require("karma-jasmine-html-reporter"),
      require("karma-coverage"),
    ],
    client: {
      clearContext: false,
    },
    coverageReporter: {
      dir: join(__dirname, "coverage/wahl-navi"),
      subdir: ".",
      reporters: [{ type: "html" }, { type: "text-summary" }],
    },
    reporters: ["progress", "kjhtml"],
    customLaunchers: {
      ChromeHeadlessNoGpu: {
        base: "ChromeHeadless",
        flags: ["--disable-gpu", "--disable-gpu-shader-disk-cache"],
      },
    },
    restartOnFileChange: true,
  });
};
