function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../scripts/require.js" />
/// <reference path="../../../../scripts/moment.js" />
/// <reference path="fatalError.js" />
/// <reference path="fdfError.js" />
/// <reference path="fdfType.js" />
/// <reference path="fieldType.js" />
/// <reference path="limits.js" />
/// <reference path="../../services/refData/refDataService.js" />
define([
  "moment",
  "./fatalError", "./fdfError", "./fdfType", "./fieldType", "./limits",
  "services/RefData/v1/ClientJSRE"
], function (
  moment,
  FatalError, FdfError, FdfType, FieldType, Limits,
  RefDataService
) {
  "use strict";

  // limit constants
  var MAX_NUMERIC_FIELD_LENGTH = 17,
      MAX_SMALL_INTEGER_FIELD_DIGITS = 7,
      MAX_INTEGER_FIELD_DIGITS = 11,
      MAX_DECIMAL_FIELD_INTEGER_DIGITS = 11,
      MAX_DECIMAL_FIELD_DECIMAL_DIGITS = 2,
      MAX_PERCENTAGE_FIELD_INTEGER_DIGITS = 3,
      MAX_PERCENTAGE_FIELD_DECIMAL_DIGITS = 2,
      MAX_RATE_FIELD_INTEGER_DIGITS = 8,
      MAX_RATE_FIELD_DECIMAL_DIGITS = 5,
      REQUIRED_YEAR_FIELD_DIGITS = 4;

  var validDateFormats = ["YYYY-MM-DD", "YYYY/MM/DD", "DD-MM-YYYY", "DD/MM/YYYY"];
  
  function validateLineItem(errors, li, value) {
    var field = li.field;
    if (field.required && value.length === 0) {
      addError(errors, li, 90556, "REQUIRED FIELD IS EMPTY");
      return;
    }

    // set field to null if it is numeric and not required and contains only spaces
    if (field.fdfType === FdfType.NUMERIC && !field.required && value.length > 0 && li.isNullOrSpaces()) {
      li.setValue("");
      return;
    }

    // further validation only required if field is not empty
    if (value.length === 0) return;

    // if we have a code type ensure (code) value exists in generic codes table
    if (field.codeType)
    {
      if (!parseNumber(errors, li, value)) return;
      if (!checkCodesTable(errors, li)) return;
    }

    // perform individual data-oriented checks
    switch (field.type) {
      case FieldType.DECIMAL:
      case FieldType.SMALL_INTEGER:
      case FieldType.INTEGER:
      case FieldType.PERCENT:
      case FieldType.RATE:
      case FieldType.U_DECIMAL:
      case FieldType.U_INTEGER:
      case FieldType.YEAR:
        // don't bother calling ParseNumber if CodeType isn't empty since we
        // will have already done it above
        if (!field.codeType && !parseNumber(errors, li, value)) return;
        break;

      case FieldType.CHAR:
      case FieldType.CLOB:
      case FieldType.NUM_CHAR:
        // note: on the MF for these field types we check the field length
        // using the code below, however currently, on the midrange, the
        // length of line items is limited to the max in the
        // LineItem.Value setter so we can never have a line item longer
        // than that at this point so this error will never occur (an
        // exception will be thrown when trying to set the line item
        // values)
        // TODO(ubrmq): this may be a problem?
        if (value.length > Limits.MAX_LINE_ITEM_LENGTH) {
          addError(errors, li, 90561, "CHARACTER FIELD EXCEEDS MAX LENGTH");
          return;
        }
        break;

      case FieldType.DATE:
        var d = moment(value, validDateFormats, true);
        if (!d.isValid()) {
          // note: the MF returns one of the two commented errors below
          // depending on whether the date fits one of the standard
          // formats and then on whether or not the month and day values
          // are valid. I haven't done this here (i.e. I have deviated
          // from strictly copying the MF functionality) because to do
          // so would be rediculously laborious for the small benifit of
          // gaining a slightly more specific error message (one of
          // which is actually incorrect since there are four valid date
          // formats!)
          // original errors:
          //AddError(errors, 90559, "DATE FIELD NOT YYYY-MM-DD OR YYYY/MM/DD", li);
          //AddError(errors, 90560, "DATE FIELD HAS AN INVALID MONTH OR DAY", li);
          // my error:
          addError(errors, li, 90559, "DATE FIELD DOES NOT CONTAIN A VALID DATE");
          return;
        }
        // store the date back in the field in standard format
        li.setValue(d.format(Limits.DATE_FORMAT));
        break;

      case FieldType.INDICATOR:
        // length must be 1, value 'Y' or 'N'
        if (value !== "Y" && value !== "N") {
          addError(errors, li, 90558, "INDICATOR FIELD LENGTH NOT 1 OR VALUE NOT Y/N");
          return;
        }
        break;

      case FieldType.LABEL:
        // no validation for label text
        break;

      default:
        throw new FatalError("INVALID DATA TYPE", 7002, null, li);
      }
  }

  function parseNumber(errors, li, value) {
    // max length is 15 + sign + decimal = 17
    value = value.toString();
    if (value.length > MAX_NUMERIC_FIELD_LENGTH) {
      addError(errors, li, 90562, "NUMERIC FIELD EXCEEDS MAX LENGTH");
      return false;
    }

    var signed = false;
    var scale = -1;
    var precision = 0;
    // note: this allows for garbage after the number, e.g. "123 garbage", so long
    // as the number ends with a space (and the total length is < 17) (the same as
    // the MF)
    for (var i = 0; i < value.length; i++) {
      var v = value.charAt(i);
      if (v >= "0" && v <= "9") {
        precision += 1;
        if (scale !== -1) scale += 1;
      } else if (v === ".") {
        if (scale !== -1) {
          addError(errors, li, 90564, "MULTIPLE DECIMAL POINTS");
          return false;
        }
        scale = 0;
      } else if (v === "+" || v === "-") {
        if (i !== 0) {
          addError(errors, li, 90563, "SIGN IS NOT FIRST CHARACTER");
          return false;
        }
        signed = true;
      } else if (v === " ") {
         break;
      } else {
        addError(errors, li, 90565, "INVALID CHARACTER IN NUMERIC FIELD");
        return false;
      }
    }

    // ensure at least 1 digit
    if (precision === 0) {
      addError(errors, li, 90569, "NUMERIC FIELD CONTAINS NO DIGITS");
      return false;
    }

    switch (li.field.type) {
      case FieldType.DECIMAL:
        return checkDecimal(errors, li, signed, precision, scale, MAX_DECIMAL_FIELD_INTEGER_DIGITS, MAX_DECIMAL_FIELD_DECIMAL_DIGITS, true);

      case FieldType.U_DECIMAL:
        return checkDecimal(errors, li, signed, precision, scale, MAX_DECIMAL_FIELD_INTEGER_DIGITS, MAX_DECIMAL_FIELD_DECIMAL_DIGITS, false);

      case FieldType.PERCENT:
        return checkDecimal(errors, li, signed, precision, scale, MAX_PERCENTAGE_FIELD_INTEGER_DIGITS, MAX_PERCENTAGE_FIELD_DECIMAL_DIGITS, true);

      case FieldType.RATE:
        return checkDecimal(errors, li, signed, precision, scale, MAX_RATE_FIELD_INTEGER_DIGITS, MAX_RATE_FIELD_DECIMAL_DIGITS, true);

      case FieldType.SMALL_INTEGER:
        return checkInteger(errors, li, signed, precision, scale, MAX_SMALL_INTEGER_FIELD_DIGITS, true);

      case FieldType.INTEGER:
        return checkInteger(errors, li, signed, precision, scale, MAX_INTEGER_FIELD_DIGITS, true);

      case FieldType.U_INTEGER:
        // note: the UnsignedInteger type has its components validated in the
        // opposite order to every other type, have keep this inconsistency
        // to be consistent with the way it's done on the MF!
        //return CheckInteger(signed, precision, scale, MaxIntegerFieldDigits, false, errors, li);
        if (signed) {
          addError(errors, li, 50137, "SIGN MAY NOT BE USED ON UNSIGNED VALUE");
          return false;
        }
        if (scale !== -1) {
          addError(errors, li, 90567, "NO DECIMAL POINT ALLOWED");
          return false;
        }
        if (precision > MAX_INTEGER_FIELD_DIGITS) {
          addError(errors, li, 90566, "MAX WHOLE DIGITS EXCEEDED");
          return false;
        }
        break;

      case FieldType.YEAR:
        if (scale !== -1 || signed || precision !== REQUIRED_YEAR_FIELD_DIGITS) {
          addError(errors, li, 90589, "YEAR MUST HAVE 4 DIGITS AND NO DECIMAL OR SIGN");
          return false;
        }
        break;

        //default: unknown types get caught further up
    }

    return true;
  }

  function checkDecimal(errors, li, signed, precision, scale, maxIntegerDigits, maxDecimalDigits, allowSign) {
    // note: if we tested the scale before the precision we could avoid having
    // to do the extra if test and subtraction, however the MF does it in this
    // order, and since we return the first error that we encounter only, to
    // be consistent with the MF we do it the dodgy way
    if (scale === -1) scale = 0;
    if (precision - scale > maxIntegerDigits) {
      addError(errors, li, 90566, "MAX WHOLE DIGITS EXCEEDED");
      return false;
    }
    if (scale > maxDecimalDigits) {
      addError(errors, li, 90568, "MAX DECIMAL PLACES EXCEEDED");
      return false;
    }
    if (!allowSign && signed) {
      addError(errors, li, 50137, "SIGN MAY NOT BE USED ON UNSIGNED VALUE");
      return false;
    }
    return true;
  }

  function checkInteger(errors, li, signed, precision, scale, maxDigits, allowSign) {
    if (precision > maxDigits) {
      addError(errors, li, 90566, "MAX WHOLE DIGITS EXCEEDED");
      return false;
    }
    if (scale !== -1) {
      addError(errors, li, 90567, "NO DECIMAL POINT ALLOWED");
      return false;
    }
    if (!allowSign && signed) {
      addError(errors, li, 50137, "SIGN MAY NOT BE USED ON UNSIGNED VALUE");
      return false;
    }
    return true;
  }

  function checkCodesTable(errors, li) {
    // determine if decode exists in the generic codes table
    var response = RefDataService.getGeneric(li.field.codeType);
    var fitlerIndex = response.columnMap["CD_ICP_KEY_GCDDCD"];
    // note: we convert the bignumber filterValue to a normal js numeric for the comparison
    // assuming the value is within range of a js numeric and we are not doing any
    // arithmetic with it
    var filterValue = +li.valueOfIgnoreSpaces().valueOf();
    var filtered = response.rows.filter(function(r) { return (r[fitlerIndex] === filterValue); });
    if (filtered.length === 1) return true;

    // note: same error message used if more than one row returned
    addError(errors, li, 90557, "CODES TABLE DECODE NOT FOUND");
    return false;
  }

  function addError(errors, li, code, text) {
    var error = new FdfError();

    error.errorCode = code;
    error.text = text;
    
    error.fieldSectionId = li.field.sectionId;
    error.fieldId = li.field.id;
    error.fieldOccurrence = (li.field.repeating) ? li.index + 1 : 0;
    
    error.dataValue = li.getValue();

    errors.push(error);
  }

  return {
    validate: function (lineItems) {
      var errors = [];

      // note: MF stops checking once we reach max errors
      for (var i = 0; i < lineItems.length; i++) {
        var li = lineItems[i];
        if (li.field.repeating) {
          // we only check through the used values, not up to MaxOccurrence
          var numValues = li.values().length;
          for (var j = 0; j < numValues; j++) {
            validateLineItem(errors, li, li.i(j).getValue());
          }
        } else {
          validateLineItem(errors, li, li.getValue());
        }
      }

      return errors;
    }
  };
});
