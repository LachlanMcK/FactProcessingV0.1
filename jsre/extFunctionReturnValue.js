function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../scripts/require.js" />
/// <reference path="fdfValue.js" />
define([
  "./fdfValue"
], function (
  FdfValue
) {
  "use strict";

  var ExtFunctionReturnValue = function (returnValue, error) {
    this.returnValue = (typeof returnValue === "object") ? returnValue : new FdfValue(returnValue);
    this.errors = [];

    if (error !== undefined) {
      this.errors.push(error);
    }
  };

  ExtFunctionReturnValue.FALSE = new ExtFunctionReturnValue(FdfValue.FALSE);
  ExtFunctionReturnValue.TRUE  = new ExtFunctionReturnValue(FdfValue.TRUE);
  ExtFunctionReturnValue.ZERO  = new ExtFunctionReturnValue(FdfValue.ZERO);
  ExtFunctionReturnValue.ONE   = new ExtFunctionReturnValue(FdfValue.ONE);

  return ExtFunctionReturnValue;
});