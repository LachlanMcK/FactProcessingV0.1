function define() { module.exports = require("../../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../../scripts/require.js" />
/// <reference path="../extFunction.js" />
/// <reference path="../extFunctionReturnValue.js" />
/// <reference path="../ioType.js" />
/// <reference path="../param.js" />
/// <reference path="../paramType.js" />
define([
  "../extFunction", "../extFunctionReturnValue",
  "../ioType", "../param", "../paramType"
], function (
  ExtFunction, ExtFunctionReturnValue,
  IOType, Param, ParamType
) {
  "use strict";

  var sectionErrorCheckSig = [
    new Param("sectionId", IOType.INPUT, ParamType.U_INTEGER, 5, false, true, "", "If section ID not given, all sections will be checked.") ];

  return {
    name: "ICCR2030",

    sectionErrorCheck: function (re, parameters) {
      parameters = ExtFunction.getAllParams(re, parameters, sectionErrorCheckSig);
      var sectionId = parameters[0].valueOfIgnoreSpaces();

      // if there are no errors in the form result is false irrespective of parameter
      if (!re.errors.length) {
        return ExtFunctionReturnValue.FALSE;
      }

      function thisSection(element, index, array) { return (sectionId.eq(element.sectionId)); }

      if (sectionId.eq(0)) {
        // return true if errors in any section
        // must be errors since we didnt' return above
        return ExtFunctionReturnValue.TRUE;
      } else {
        // return true if errors in given section
        if (re.errors.some(thisSection)) {
          return ExtFunctionReturnValue.TRUE;
        }
      }

      return ExtFunctionReturnValue.FALSE;
    }
  };
});