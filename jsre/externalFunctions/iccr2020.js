function define() { module.exports = require("../../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../../scripts/require.js" />
/// <reference path="../extFunction.js" />
/// <reference path="../extFunctionReturnValue.js" />
/// <reference path="../fatalError.js" />
/// <reference path="../ioType.js" />
/// <reference path="../param.js" />
/// <reference path="../paramType.js" />
define([
  "../extFunction", "../extFunctionReturnValue", "../fatalError",
  "../ioType", "../param", "../paramType"
], function (
  ExtFunction, ExtFunctionReturnValue, FatalError,
  IOType, Param, ParamType
) {
  "use strict";

  var roundAmountSig = [
    new Param("amount",   IOType.INPUT,  ParamType.DECIMAL, 11, true,  false, "", "The value to round."),
    new Param("interval", IOType.INPUT,  ParamType.DECIMAL, 11, true,  false, "", "Interval to round to, e.g., 0.50, 1.00 or 10.00."),
    new Param("type",     IOType.INPUT,  ParamType.CHAR,     7, true,  false, "", "UP - round up to interval, DOWN - round down do interval, CLOSEST - round to closest interval."),
    new Param("result",   IOType.OUTPUT, ParamType.DECIMAL, 11, true,  false, "", "The rounded result.")];

  return {
    name: "ICCR2020",

    roundAmount: function (re, parameters) {
      parameters = ExtFunction.getAllParams(re, parameters, roundAmountSig);

      var amount = parameters[0].valueOfIgnoreSpaces().round(2);
      var interval = parameters[1].valueOfIgnoreSpaces().round(2);
      var type = parameters[2].getValue();

      // note: no check to ensure roundingInterval is not zero (which will cause a
      // divide by 0 error) or even greater than 0 (negative intervals don't make
      // sense)
      // also this algorithm is not correct for negative amounts and because all
      // values are truncated to 2 decimals before processing, calling this
      // function with an interval of 0.01 (i.e. rounding to 2 decimals) actually
      // truncates instead of rounding

      var remainder = amount.mod(interval).round(2);
      var result = amount.minus(remainder);
      switch (type) {
          case "CLOSEST":
              if (remainder.gte(interval.div(2))) result = result.plus(interval);
              break;

          case "UP":
              if (!remainder.eq(0)) result = result.plus(interval);
              break;

          case "DOWN":
              break;

          default:
              throw new FatalError("INVALID ROUNDING TYPE", re.rule, parameters[2]);
      }
      parameters[3].setValue(ExtFunction.formatNumber(re, parameters[3], result.round(2)));
 
      return ExtFunctionReturnValue.TRUE;
    }
  };
});