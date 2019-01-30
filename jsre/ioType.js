function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
define(function () {
  "use strict";

  return {
    INPUT:  "INPUT",
    OUTPUT: "OUTPUT",
    BOTH:   "BOTH"
  };
});