/// <reference path="../../../../../scripts/require.js" />
/// <reference path="../extFunctionReturnValue.js" />
/// <reference path="../fatalError.js" />
define([
  "../extFunctionReturnValue", "../fatalError"
], function (
  ExtFunctionReturnValue, FatalError
) {
  'use strict';

  return {
    name: "ICCR1520",

    checkFormExistence: function (re, parameters) {

      if (parameters.length === 21) {
        // only apply it to the last condition (based on parameter count)
        /// Set tempID_INTERNAL to blank (as for .Net engine)
        (parameters[0]).setValue("");
      }
      /// Return Zero.
      return ExtFunctionReturnValue.ZERO;
    },

    getFormLineData: function (re, parameters) {
      var inParam = 8, outParam = 9;

      if (parameters.length < outParam) {
        throw new FatalError("REQUIRES AT LEAST 10 PARAMETERS", re.rule);
      }

      if (parameters.length > inParam && parameters[inParam].isLiteral && parameters[inParam].isNull()) {
        throw new FatalError("NAME " + inParam + " FIELD NOT PASSED IN", re.rule, parameters[outParam]);
      }
      if (parameters[inParam].isLiteral && parameters[outParam].isLiteral) {
        throw new FatalError(
          "INPUT NAME FIELD " + inParam + " HAS NO OUTPUT INDEX AT " + outParam, re.rule, parameters[outParam]);
      }

      switch (parameters[inParam].getValue()) {
        case "1681":
          parameters[9].setValue(re.li(84007, 71429).getValue());
          break;
        case "274":
          parameters[9].setValue("N");
          break;
      }
      return ExtFunctionReturnValue.TRUE;
    },

    findingCarp: function (re, parameters) {
      var outParam = 4;

      if (parameters.length < outParam) {
        throw new FatalError("REQUIRES AT LEAST " + (outParam + 1) + " PARAMETERS", re.rule);
      }

      if (parameters[outParam].isLiteral && parameters[outParam].isLiteral) {
        throw new FatalError(
          "FIELD " + outParam + " HAS NO OUTPUT INDEX", re.rule, parameters[outParam]);
      }

      parameters[outParam].setValue("");

      return ExtFunctionReturnValue.FALSE;
    }
  };
});