function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../scripts/require.js" />
/// <reference path="../../../../scripts/moment.js" />
/// <reference path="fatalError.js" />
/// <reference path="fatalErrorNumber.js" />
/// <reference path="fdfType.js" />
/// <reference path="fdfValue.js" />
/// <reference path="fieldType.js" />
/// <reference path="ioType.js" />
/// <reference path="limits.js" />
/// <reference path="lineItem.js" />
define([
  "moment", "./fatalError", "./fatalErrorNumber",
  "./fdfType", "./fdfValue", "./fieldType", "./ioType", "./limits", "./lineItem"
], function (
  moment, FatalError, FatalErrorNumber, FdfType, FdfValue, FieldType, IOType, Limits, LineItem
) {
  "use strict";

  return {
    getInputParam: function(form, parameters, index, optional, nullable, expectedType) {
      if (parameters.length <= index) {
        if (!optional) {
          throw new FatalError("Mandatory parameter not given",
            FatalErrorNumber.LT_CR_PARM_MANDATORY, form.rule, null);
        }
        return FdfValue.BLANK;
      }

      var param = parameters[index];
      var value;
      if (!param.isLiteral) {
        var field = param;

        if (field.type !== expectedType) {
          throw new FatalError("Parameter data type mismatch",
            FatalErrorNumber.LT_CR_PARM_DATATYPE_MISMATCH, form.rule, param);
        }
        value = field.getValue();
        if (value.length === 0) {
          if (!nullable) {
            throw new FatalError("Mandatory parameter not given",
              FatalErrorNumber.LT_CR_NO_PARM_VALUE, form.rule, param);
          }
          return FdfValue.BLANK;
        } else {
          if (field.isNullOrSpaces()) {
            throw new FatalError("Parameter value is spaces",
              FatalErrorNumber.LT_CR_PARM_VALUE_IS_SPACES, form.rule, param);
          }
          if (field.type === FdfType.ALPHA) {
            // note: the MF actually only treats CHAR, DATE, CLOB or NUMCHAR
            // as alpha here and everything else (including INDICATOR) as a
            // number. I can only assume that an indicator field has never
            // been passed to this method because it would cause an error
            // attempting to convert it to a number below
            return new FdfValue(value);
          } else {
            // return a new numeric literal truncated to 0 decimal places
            return new FdfValue(FdfValue.getNumeric(value, true).round(0));
          }
        }
      } else {
        // PARM IS PASSED AS LITERAL
        value = param.getValue();
        if (value.length === 0) {
          if (optional || nullable) {
            return FdfValue.BLANK;
          }
          // IF NO PARM PASSED AND NOT OPTIONAL, THEN ERROR
          throw new FatalError("Mandatory parameter not given",
            FatalErrorNumber.LT_CR_NO_PARM_VALUE, form.rule, param);
        }
        // VALIDATE LITERAL PARM
        if (param.type !== expectedType) {
          throw new FatalError("Parameter data type mismatch",
            FatalErrorNumber.LT_CR_PARM_DATATYPE_MISMATCH, form.rule, param);
        }
        // TODO(ubrmq): don't know why this check is here, doesn't make much
        // TODO(ubrmq): sense, and means even if the value is nullable it can't
        // TODO(ubrmq): contain only spaces?
        if (param.isNullOrSpaces()) {
          throw new FatalError("Parameter value is spaces",
            FatalErrorNumber.LT_CR_PARM_VALUE_IS_SPACES, form.rule, param);
        }
        if (param.type === FdfType.ALPHA) {
          return new FdfValue(value);
        } else {
          // return a new numeric literal truncated to 0 decimal places
          return new FdfValue(FdfValue.getNumeric(value, true).round(0));
        }
      }
    },

    validateOutputParam: function(form, parameters, index, optional, nullable, expectedType) {
      // IF PARM IS MISSING AND MANDATORY, THEN ERROR
      if (parameters.length <= index) {
        if (!optional) {
          throw new FatalError("Mandatory output parameter not given",
            FatalErrorNumber.LT_CR_INVALID_OUTPUT_PARM, form.rule, null);
        }
        return null;
      }

      // IF PARM EXISTS, THEN VALIDATE
      var param = parameters[index];

      if (!param.isLiteral) {
        // PARM IS PASSED AS INDEX
        var lineItem = param;

        // VALIDATE INDEX PARM
        // passing null as expected type => can be any numeric type, since all
        // numeric types are interchangable (according to MF) just set to any
        // numeric type (in this case Integer) for validation
        if (!expectedType) expectedType = FieldType.INTEGER;
        if (!(
            // ok if field type and expected type are the same, or...
            lineItem.field.type === expectedType ||
            // all numeric types are interchangable (apparently?!), or...
            lineItem.type === FdfType.NUMERIC &&
            (expectedType === FieldType.INTEGER ||
              expectedType === FieldType.U_INTEGER ||
              expectedType === FieldType.DECIMAL ||
              expectedType === FieldType.U_DECIMAL ||
              expectedType === FieldType.SMALL_INTEGER ||
              expectedType === FieldType.PERCENT ||
              expectedType === FieldType.RATE ||
              expectedType === FieldType.YEAR) ||
            // char can be stored in a numchar field
            lineItem.field.type === FieldType.NUM_CHAR &&
            expectedType === FieldType.CHAR)) {
          throw new FatalError("Parameter data type mismatch",
              FatalErrorNumber.LT_CR_PARM_DATATYPE_MISMATCH, form.rule, param);
        }
        // note: MF has check to see if line item exists here but we always have
        // a line item so don't do it
        return lineItem;
      } else {
        // PARM IS PASSED AS LITERAL
        // IF OUTPUT IS NULL AND NOT OPTIONAL, THEN ERROR
        if (optional || nullable) {
          return null;
        }
        throw new FatalError("Mandatory output parameter not given",
          FatalErrorNumber.LT_CR_INVALID_OUTPUT_PARM, form.rule, param);
      }
    },

    validateDate: function(form, date) {
      var d = moment(date, Limits.DATE_FORMAT, true);
      if (d.isValid()) {
        return d;
      }
      throw new FatalError("Invalid date parameter: '" + date + "'",
        FatalErrorNumber.LT_CR_INVALID_DATE_PARM, form.rule, date);
      // if date is min date (0001-01-01) or max date (9999-12-31) then is valid return it, else
    },

    getAllParams: function(form, parameters, expected) {
      var result = [];

      // check supplied parameters
      var i;
      for (i = 0; i < parameters.length && i < expected.length; i++) {
        result[i] = this.getEachParam(form, parameters[i], expected[i], i + 2);
      }
      // check for any remaining expected parameters that weren't supplied
      for (; i < expected.length; i++) {
        if (expected[i].mandatory) {
          throw new FatalError("ERROR AT PARM " + (i + 2) + " : MANDATORY PARM MISSING", 0, form.rule, null);
        }
        result[i] = FdfValue.BLANK;
      }

      return result;
    },

    // ICCCRULE.CPY / D4100-GET-EACH-PARM / D4200-VAL-EACH-PARM
    getEachParam: function(form, p, expected, index) {
      var isLiteral = p.isLiteral;
      var isLiteralNull = false;
      var isDataNull = false;

      if (p.getValue().length === 0) {
        isDataNull = true;
        if (isLiteral) isLiteralNull = true;
        // if param is null, is an input and has default value fetch it
        if (expected.ioType !== IOType.OUTPUT && expected.defaultValue.length > 0) {
          var headerDetails = form.headerDetails;
          switch (expected.defaultValue) {
            // if input is a null literal and has a default header value (note
            // this doesn't apply to null fields) then on the MF the param
            // type is used as the result type. We can't easily do this as the
            // MF only stores parameter types as character (C) or number (N)
            // whereas we store the specific field type to allow better
            // compile time validation, we could map these into C or N however
            // this would still not give the same result as the types we have
            // used are different (correct) from those on the MF. Instead we
            // set the type depending on which default header field is being
            // used, which seems a more senisble thing to do anyway.

            case "ID-INTERNAL":
              if (headerDetails.clientInternalId() > 0) p = new FdfValue(headerDetails.clientInternalId()); break;
            case "ID-ACCT":
              if (headerDetails.accountId() !== "") p = new FdfValue(headerDetails.accountId()); break;
            case "ID-NUM-SEQ-ACCT":
              if (headerDetails.accountSequenceNumber() > 0) p = new FdfValue(headerDetails.accountSequenceNumber()); break;
            case "CD-TYPE-ACCT":
              if (headerDetails.roleType() > 0) p = new FdfValue(headerDetails.roleType()); break;
            case "DT-PD-BEGIN":
              if (headerDetails.periodBeginDate() !== "") p = new FdfValue(headerDetails.periodBeginDate()); break;
            case "DT-PD-END":
              if (headerDetails.periodEndDate() !== "") p = new FdfValue(headerDetails.periodEndDate()); break;
            case "ID-TRANS":
              if (headerDetails.transactionId() > 0) p = new FdfValue(headerDetails.transactionId()); break;
            case "ID-FORM":
              if (headerDetails.formId() > 0) p = new FdfValue(headerDetails.formId()); break;
            case "CD-TYPE-FORM":
              if (headerDetails.formType() > 0) p = new FdfValue(headerDetails.formType()); break;
            case "DT-FORM-YEAR":
              if (headerDetails.formYear() > 0) p = new FdfValue(headerDetails.formYear()); break;
            case "DT-FORM-MONTH":
              if (headerDetails.formMonth() > 0) p = new FdfValue(headerDetails.formMonth()); break;
            // the following header values don't get automatically defaulted
            // and must be done in individual functions if required, I don't
            // think there is any reason for this other than they weren't
            // needed when the above header defaults were done and then never
            // got added later when they were (needed)
            //"TYPE-TRANS",       // transaction type code
            //"DT-ISSUE",         // issue date
            //"DT-RECEIPT",       // receipt date
            //"CD-CHANNEL-USED",  // channel used
            //"CD-REASON-UPDATE", // update reason code
          }
          if (p.getValue().length > 0) {
            isLiteralNull = false;
            isDataNull = false;
          }
          // TODO(ubrmq): there is a bug here if a Both type parameter has a
          // default value set then it will be replaced with a literal containing
          // the default value so the function will not be able to use it for
          // output, on the MF the field is returned with an occurence of 1 so
          // that it can still be used for output
        }
      }

      // validate
      if (expected.ioType !== IOType.OUTPUT) {
        // input parameter
        if (isLiteralNull) {
          if (expected.mandatory) {
            throw new FatalError(
              "ERROR AT PARM " + index + " : MANDATORY INPUT PARM MISSING", 0, form.rule, null);
          }
        } else if (!expected.nullable && isDataNull) {
          throw new FatalError(
            "ERROR AT PARM " + index + " : NON-NULLABLE INPUT PARM IS NULL", 0, form.rule, null);
        }
      }
      if (expected.ioType !== IOType.INPUT) {
        // output parameter
        if (isLiteralNull) {
          if (expected.mandatory) {
            throw new FatalError(
              "ERROR AT PARM " + index + " : MANDATORY OUTPUT PARM MISSING", 0, form.rule, null);
          }
        } else if (isLiteral) {
          throw new FatalError(
            "ERROR AT PARM " + index + " : FDF FLD EXPECTED FOR OUTPUT", 0, form.rule, null);
        }
      }

      return p;
    },

    // ICCCRULE.CPY / X6300-FORMAT-NUMBER
    /// <summary>
    /// Format a number as a string for output.
    /// </summary>
    /// <param name="form">The current rules form instance.</param>
    /// <param name="lineItem">The line item the number will be formatted for.</param>
    /// <param name="value">The number to format.</param>
    /// <returns><paramref name="value"/> formatted for the given line item's field
    /// type.</returns>
    formatNumber: function(form, lineItem, value) {
      var output = "";
      var field = lineItem.field;

      // 1 - HANDLE SIGN

      if (field.type === FieldType.SMALL_INTEGER ||
          field.type === FieldType.INTEGER ||
          field.type === FieldType.DECIMAL ||
          field.type === FieldType.PERCENT ||
          field.type === FieldType.RATE ||
          field.type === FieldType.NUM_CHAR ||
          field.type === FieldType.YEAR /* TODO treating year as signed looks like a bug? */) {
        output = (value.isNeg()) ? "-" : "+";
      }

      // 2 - HANDLE INTEGER PART OF NUMBER

      var max18Long = value.abs().toFixed(0);
      if (field.type == FieldType.NUM_CHAR) {
        // note: this could be longer than 18 characters if 'value' is big enough,
        // only ensures minimum of 18
        // todo: need to js convert
        var zeroPadded18Long = ("000000000000000000" + max18Long).substr(-18);
        if (zeroPadded18Long.length > 18) zeroPadded18Long = zeroPadded18Long.substr(zeroPadded18Long.length - 18);
        // add right most X digits to result
        // TODO note: if the fields length is > 18 then this will cause an
        // exception, need to find where on the MF NumChar fields max length is
        // enforced, haven't combined this with the line above to keep consistent
        // with the MF
        output += zeroPadded18Long.substr(18 - field.maxLength);
      } else {
        if (max18Long.length > 18) max18Long = max18Long.substr(max18Long.length - 18);
        output += max18Long;
      }

      // 3 - HANDLE DECIMAL PART OF NUMBER
      var decimalPosition;
      if (field.type == FieldType.RATE) {
        var with5decimals = value.toFixed(5);
        output += with5decimals.substr(with5decimals.indexOf(".")).substr(0,6);
      } else if (field.type == FieldType.DECIMAL ||
          field.type == FieldType.U_DECIMAL ||
          field.type == FieldType.PERCENT) {
        var with2decimals = value.toFixed(2);
        output += with2decimals.substr(with2decimals.indexOf(".")).substr(0, 3);
      }

      return output;
    },

    decimalLineItem: new LineItem({ type: FieldType.DECIMAL })
  };
});
