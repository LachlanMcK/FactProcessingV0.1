function define() { module.exports = require("../../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../../scripts/require.js" />
/// <reference path="../extFunctionReturnValue.js" />
/// <reference path="../fatalError.js" />
define([
  "../extFunctionReturnValue", "../fatalError"
], function (
  ExtFunctionReturnValue, FatalError
) {
  "use strict";

  return {
    name: "ICCR1611",

    editNameFields: function (re, parameters) {
      // I belive this is validation is correct in as far as what the MF does
      // however it doesn't really make sense? It looks as though at one point they
      // were going to make it so that if you passed in a field as one of the input
      // params and didn't have an associated output field param then the result
      // would be stored back into the input field, however this is not what happens?
      // Also you can pass in a value for "NAME 1" or pass in a literal value for
      // any of the other inputs and have no output field and nothing will happen,
      // including no error messages?!
      if (parameters.length === 0 || parameters[0].isLiteral && parameters[0].getValue() === "") {
        throw new FatalError("NAME 1 FIELD NOT PASSED IN", 0, re.rule,
          (parameters.length > 0) ? parameters[0] : null);
      }
      var i;
      var endInputParams = Math.min(5, parameters.length);
      for (i = 1; i < endInputParams; i++) {
        if (parameters[i].isLiteral && (parameters.length <= 6 + i || parameters[6 + i].isLiteral)) {
          throw new FatalError(
              "INPUT NAME FIELD " + (i + 1) + " HAS NO OUTPUT INDEX", 0, re.rule, parameters[i]);
        }
      }

      if (parameters.length > 6) {
        var removalRE = null;
        switch (parameters[5].getValue()) {
          case "1":
            // remove all characters other than A - Z, a - z, 0 - 9
            removalRE = /[^A-Za-z0-9]+/g;
            break;
          case "2":
            // remove all characters other than A - Z, a - z, 0 - 9 and space
            removalRE = /[^A-Za-z0-9 ]+/g;
            break;
        }
        for (i = 6; i < parameters.length; i++) {
          var outParam = parameters[i];
          if (outParam.isLiteral) continue;

          // if field is all spaces treat as if empty
          var inParam = parameters[i - 6];
          if (inParam.isNullOrSpaces() || removalRE === null) {
            outParam.setValue("");
          } else {
            var output = inParam.getValue().replace(removalRE, "");
            // maximum working length is 40 characters
            if (output.length > 40) output = output.substr(0, 40);
            outParam.setValue(output.toUpperCase());
          }
        }
      }

      return ExtFunctionReturnValue.TRUE;
    },

    concatenateFields: function (re, parameters) {
      // validate first param
      if (parameters.length < 1) {
        // note: this is a dodgy MF message
        throw new FatalError("CONCATENATION TYPE \"\" IS NOT VALID", 0, re.rule, null);
      }

      var textConcat = true;
      switch (parameters[0].getValue()) {
        case "TEXT": break;
        case "DATE": textConcat = false; break;
        default:
          // Note: if the type is empty the MF returns the error
          // "CONCATENATION TYPE NOT SUPPLIED" but only if the parameter is
          // a literal (i.e. not supplied in a field)
          if (parameters[0].isLiteral && parameters[0].getValue() === "") {
            throw new FatalError(
              "CONCATENATION TYPE NOT SUPPLIED", 0, re.rule, parameters[0]);
          }
          throw new FatalError(
            "CONCATENATION TYPE \"" + parameters[0].getValue() + "\" IS NOT VALID",
            0, re.rule, parameters[0]);
      }
      // validate other params (note that all parameters are validated for type
      // 'DATE' also even though only the first 3 and the 10th are used!)
      if (parameters.length > 1 && parameters[1].isLiteral && parameters[1].getValue() === "") {
        throw new FatalError(
          "FIRST CONCATENATION FIELD NOT SUPPLIED", 0, re.rule, parameters[1]);
      }
      if (parameters.length > 2 && parameters[2].isLiteral && parameters[2].getValue() === "") {
        throw new FatalError(
          "SECOND CONCATENATION FIELD NOT SUPPLIED", 0, re.rule, parameters[2]);
      }
      if (textConcat) {
        if (parameters.length > 10 && parameters[10].isLiteral) {
          throw new FatalError(
            "FDF INDEX FOR CONCATENATED TEXT NOT SUPPLIED", 0, re.rule, parameters[10]);
        }
      } else {
        if (parameters.length > 9 && parameters[9].isLiteral) {
          throw new FatalError(
            "FDF INDEX FOR CONCATENATED DATE NOT SUPPLIED", 0, re.rule, parameters[9]);
        }
      }
      // existence test (don't know why this test is different for v3 - v5 compared to v6 - v8?):
      // v3 - v5 => is non-empty literal or is field (which can be empty)
      var v3Exists = (parameters.length > 3 && (!parameters[3].isLiteral || parameters[3].getValue() !== ""));
      var v4Exists = (parameters.length > 4 && (!parameters[4].isLiteral || parameters[4].getValue() !== ""));
      var v5Exists = (parameters.length > 5 && (!parameters[5].isLiteral || parameters[5].getValue() !== ""));
      // v6 - v8 => is non-empty literal
      var v6Exists = (parameters.length > 6 &&   parameters[6].isLiteral && parameters[6].getValue() !== "");
      var v7Exists = (parameters.length > 7 &&   parameters[7].isLiteral && parameters[7].getValue() !== "");
      var v8Exists = (parameters.length > 8 &&   parameters[8].isLiteral && parameters[8].getValue() !== "");
      // TODO(ubrmq): even though all these error messages mention fields I think
      // we will only ever get these messages for empty literal values? (dodgy MF
      // implementation?)
      if (v4Exists && !v3Exists) {
        throw new FatalError(
          "FIELD 4 EXISTS BUT NO FIELD 3 FOUND", 0, re.rule, null);
      }
      if (v5Exists && !v4Exists) {
        throw new FatalError(
          "FIELD 5 EXISTS BUT NO FIELD 4 FOUND", 0, re.rule, null);
      }
      if (v6Exists && !v5Exists) {
        throw new FatalError(
          "FIELD 6 EXISTS BUT NO FIELD 5 FOUND", 0, re.rule, null);
      }
      if (v7Exists && !v6Exists) {
        throw new FatalError(
          "FIELD 7 EXISTS BUT NO FIELD 6 FOUND", 0, re.rule, null);
      }
      if (v8Exists && !v7Exists) {
        throw new FatalError(
          "FIELD 8 EXISTS BUT NO FIELD 7 FOUND", 0, re.rule, null);
      }

      // do the concatenation

      if (textConcat) { // text
        // note: the parameter validation is written to be consistent with MF
        // In particular I don't believe the MF will throw an error if less than 10
        // arguments are supplied (in some cases), it merely behaves as though all
        // the values are empty strings. I'm not sure but I think it will cause a
        // fatal error when it tries to store the result in a field with index 0?
        // This is definitely an error but have implemented it as much as possible
        // to be consistent.
        if (parameters.length <= 10 || parameters[10].isLiteral) {
            // TODO(ubrmq): not sure what will happen here?
            throw new Error("Invalid Operation");
        }
        // note: there is no checking of the destination field type to ensure it
        // can take this value!
        parameters[10].setValue(
          parameters[1].getValue() +
          parameters[2].getValue() +
          parameters[3].getValue() +
          parameters[4].getValue() +
          parameters[5].getValue() +
          parameters[6].getValue() +
          parameters[7].getValue() +
          parameters[8].getValue());
      } else { // date
        if (parameters.length <= 9 || parameters[9].isLiteral) {
            // TODO(ubrmq): not sure what will happen here?
            throw new Error("Invalid Operation");
        }
        var result = "";
        for (var v = 1; v < 4; v++) {
          // error if value longer than 4 characters
          var value = parameters[v].getValue().replace(/ /g, "");
          if (value.length > 4) {
            throw new FatalError("INVALID DATE COMPONENT", 0, re.rule, value);
          }
          // error if not an integer value (note: can have sign!)
          // note: this will let negative values through!!!
          var intValue = +value;
          if (value === "" || isNaN(intValue) || intValue % 1 !== 0) {
            // TODO if parameter is a field should return fdf error rather than a fatal error
            throw new FatalError("DATE COMPONENT IS NOT NUMERIC", 0, re.rule, value);
          }

          // if the value is two characters (not necessarily digits!) longer
          // ensure the first is a zero
          // note: not how I would do this but keeping it consistently bad with MF
          if (value.length > 0 && value.length < 3 && intValue < 10 && value.charAt(0) !== "0") {
            value = "0" + value.charAt(0);
          }
          // how about?
          //if (value.Length == 1)
          //{
          //    value = "0" + value.charAt(0);
          //}
          // concat value to result with separator
          // note: that no check is made to ensure the result is a valid date
          // and on the MF it is possible to get a resultant field with a length
          // longer than the non-space data with input values such as '1234',
          // '5678' and '9012' producing a result of '1234-5678-    ' with a
          // data length of 14!!! Input values like '-1', '+1' and '-1' would
          // give crazy results like '0--0+-0-'!!!
          result += value + "-";
        }
        // hack to ensure same output as MF
        parameters[9].setValue((result.length <= 11) ?
          result.substr(0, result.length - 1) :
          result.substr(0, 10) + " ".repeat(result.length - 11));
      }

      return ExtFunctionReturnValue.TRUE;
    }
  };
});