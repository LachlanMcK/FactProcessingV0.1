function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../scripts/require.js" />
/// <reference path="paramType.js" />
/// <reference path="ioType.js" />
/// <reference path="limits.js" />
define([
  "./paramType", "./ioType", "./limits"
], function (
  ParamType, IOType, Limits
) {
  "use strict";

  var param = function (name, ioType, type, maxLength, mandatory, nullable, defaultValue, description) {
    this.name = name || "";
    this.ioType = ioType;
    this.type = type;
    this.maxLength = maxLength || 0;
    this.mandatory = mandatory || false;
    this.nullable = nullable || false;
    this.defaultValue = defaultValue || "";
    this.description = description || "";

    this.allowableValues = [];
    this.allowableValuesD = [];

    //Args.NotNullOrWhiteSpace(name, "name");
    //Args.IsGTEZero(maxLength, "maxLength");
    //Args.NotNull(defaultValue, "defaultValue");
    //Args.NotNull(description, "description");
  };

  param.prototype.validate = function(moduleName, functionName, position, parameters) {
    // check maxlength is or isn't given as required
    var setLength = 0;
    switch (this.type)
    {
      case ParamType.ANY:           setLength = Limits.MAX_LINE_ITEM_LENGTH; break;

      case ParamType.SMALL_INTEGER: setLength =  7;  break;
      case ParamType.YEAR:          setLength =  4;  break;
      case ParamType.DECIMAL:       setLength = 13;  break;
      case ParamType.U_DECIMAL:     setLength = 13;  break;
      case ParamType.PERCENT:       setLength =  5;  break;
      case ParamType.RATE:          setLength = 13;  break;

      case ParamType.INDICATOR:     setLength =  1;  break;
      case ParamType.DATE:          setLength = 10;  break;
      case ParamType.CLOB:          setLength = Limits.MAX_LINE_ITEM_LENGTH; break;

      case ParamType.INTEGER:
      case ParamType.U_INTEGER:
        if (this.maxLength > 11) {
          throw new Error(
            "Parameter " + functionName + ":" + position + ":" + this.name +
            ", MaxLength for " + this.type + " parameters cannot be greater than 11.");
        }
        break;

      case ParamType.CHAR:
      case ParamType.NUM_CHAR:
        if (this.maxLength > Limits.MAX_LINE_ITEM_LENGTH) {
          throw new Error(
            "Parameter " + functionName + ":" + position + ":" + this.name +
            ", MaxLength for " + this.type + " parameters cannot be greater than " + Limits.MAX_LINE_ITEM_LENGTH + ".");
        }
        break;
    }

    // TODO: once we replace all Numerics from function sig list and add max
    // TODO: length to all Char types can remove this outer if
    if (this.type != ParamType.NUMERIC && this.type != ParamType.CHAR) {
      if (setLength === 0) {
        if (this.maxLength === 0) {
          throw new Error(
            "Parameter " + functionName + ":" + position + ":" + this.name +
            ", MaxLength must be given for parameters of type " +
            this.type + ".");
        }
      } else {
        if (this.maxLength !== 0) {
          throw new Error(
            "Parameter " + functionName + ":" + position + ":" + this.name +
            ", MaxLength cannot be given for parameters of type " + this.type + ".");
        }
        this.maxLength = setLength;
      }
    }

    // TODO(ubrmq): validate fields are used where required and repeating field max occurrence values

    // check default values

    if (this.defaultValue.length === 0) return;
    if (this.ioType === IOType.OUTPUT) {
      throw new Error(
        "Parameter " + functionName + ":" + position + ":" + this.name +
        " has invalid default value '" + this.defaultValue +"'. " +
        "Cannot have default values for output only parameters.");
    }
    if (this.defaultValue.charAt(0) === "@" && this.defaultValue.length > 1) {
      var name = this.defaultValue.substr(1);
      if (parameters.some(function(element) { return element.name === name; })) return;
      throw new Error(
        "Parameter " + functionName + ":" + position + ":" + this.name +
        " has invalid default value '" + this.defaultValue +"'. " +
        "Parameter '" + name + "' does not exist.");
    }
    else if (this.allowableValues.length !== 0) {
      if (this.allowableValues.some(function(element) { return element === this.defaultValue; })) return;
    }
    else if (this.allowableValuesD.length !== 0) {
      if (this.allowableValuesD.some(function(element) { return element === this.defaultValue; })) return;
    }
    else if (this.type == ParamType.INDICATOR && (this.defaultValue === "N" || this.defaultValue === "Y")) return;
    else if (this.defaults.some(function(element) { return element === this.param.defaultValue; })) return;

    // TODO remove these specific case hacks when the correct allowable values
    // TODO for the following properties can be determined
    if (
      moduleName === "ICCR1520" && functionName === "UpdateDataExtensionLineItems" && position === 35 ||
      moduleName === "ICCR1530" && functionName === "RetrieveAssessmentNumber"     && position === 11 ||
      moduleName === "ICCR1600" && functionName === "AddressElectronicAdd"         && position ===  4 ||
      moduleName === "ICCR1600" && functionName === "AddressElectronicAddValidate" && position ===  4 ||
      moduleName === "ICCR1600" && functionName === "AddressTelephonicAdd"         && position ===  9 ||
      moduleName === "ICCR1600" && functionName === "AddressTelephonicAddValidate" && position ===  9 ||
      moduleName === "ICCR1604" && functionName === "RoleAdd"                      && position ===  4 ||
      moduleName === "ICCR1604" && functionName === "RoleAddValidate"              && position ===  4 ||
      moduleName === "ICCR1612" && functionName === "FiaAdd"                       && position === 10 ||
      moduleName === "ICCR1612" && functionName === "FiaAddValidate"               && position === 10
    ) {
      if (this.allowableValues !== null || this.allowableValuesD !== null) {
        throw new Error(
          "Parameter" + functionName + ":" + position + ":" + this.name +
          ": as the allowable values have been added please remove " +
          "allowable value workaround from this exception location.");
      }
      return;
    }

    throw new Error(
      "Parameter " + functionName + ":" + position + ":" + this.name +
      " has invalid default value '" + this.defaultValue +"'.");
  };

  param.defaults = [
    "ID-INTERNAL",            // header field: client internal id
    "ID-ACCT",                // header field: account id
    "ID-NUM-SEQ-ACCT",        // header field: account sequence number
    "CD-TYPE-ACCT",           // header field: role type code
    "DT-PD-BEGIN",            // header field: period begin date
    "DT-PD-END",              // header field: period end date
    "ID-TRANS",               // header field: transaction id
    "TYPE-TRANS",             // header field: transaction type code
    "ID-FORM",                // header field: form id
    "CD-TYPE-FORM",           // header field: form type code
    "DT-FORM-YEAR",           // header field: form year
    "DT-FORM-MONTH",          // header field: form month
    "DT-ISSUE",               // header field: issue date
    "DT-RECEIPT",             // header field: receipt date
    "CD-CHANNEL-USED",        // header field: channel used
    "CD-REASON-UPDATE",       // header field: update reason code

    "CurrentDate",            // the current date
    "DT-RECEIPT or CurrentDate", // header field: receipt date or if null the current date
    "MinDate",                // the minimum date 0001-01-01
    "MaxDate"                 // the maximum date 9999-12-31
  ];

  return param;
});