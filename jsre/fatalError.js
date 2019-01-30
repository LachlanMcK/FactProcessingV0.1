function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../scripts/require.js" />
/// <reference path="fatalErrorNumber.js" />
define([
  "./fatalErrorNumber"
], function (
  FatalErrorNumber
) {
  "use strict";

  var FatalError = function(message, errorCode, rule, value) {
    this.name = "JSRE";
    this.message = message || "";
    this.errorCode = errorCode || FatalErrorNumber.LT_LP_FDF_ERRS;
    this.rule = rule && rule.id || "";
    this.value = value;
  };
  FatalError.prototype = new Error();
  FatalError.prototype.constructor = FatalError;

  FatalError.prototype.toString = function() {
    return this.errorCode + ": " + this.message + " on rule " +
      this.rule + " for value '" + this.value + "'";
  };

  return FatalError;
});