function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../scripts/bignumber.js" />
/// <reference path="fatalError.js" />
/// <reference path="fdfType.js" />
/// <reference path="fieldType.js" />
define([
  "bignumber", "./fatalError", "./fdfType", "./fieldType"
], function (
  BigNumber, FatalError, FdfType, FieldType
) {
  "use strict";

  var FdfValue = function(value) {
    this.isLiteral = true;

    if (value instanceof BigNumber) {
      this._value = value.toString();
      this._numericValue = value;
      this.type = FdfType.NUMERIC;
    } else {
      switch (typeof value) {
        case "string":
          this._value = value;
          this._numericValue = null;
          this.type = FdfType.ALPHA;
          break;
        case "number":
          this._value = value.toString();
          this._numericValue = new BigNumber(value, 10);
          this.type = FdfType.NUMERIC;
          break;
        default:
          throw new Error("An FdfValue value can only be created from a number or string.");
      }
    }
  };

  FdfValue.prototype.getValue = function() {
    return this._value;
  };

  FdfValue.prototype.setValue = function() {
    throw new Error("Cannot change a literal value.");
  };

  FdfValue.prototype.toString = function() {
    return this._value;
  };

  FdfValue.prototype.valueOf = function() {
    if (this._numericValue === null) {
      this._numericValue = FdfValue.getNumeric(this._value, false).round(5);
    }
    return this._numericValue;
  };

  FdfValue.prototype.valueOfIgnoreSpaces = function() {
    if (this._numericValue === null) {
      this._numericValue = FdfValue.getNumeric(this._value, true).round(5);
    }
    return this._numericValue;
  };

  FdfValue.prototype.isNull = function() {
    return (this.getValue().length === 0);
  };

  FdfValue.prototype.isNullOrSpaces = function() {
    return (this.getValue().trimSpace().length === 0);
  };

  FdfValue.prototype.neg = function() {
    return new FdfValue(this.valueOf().neg());
  };

  FdfValue.prototype.plus = function(that) {
    return new FdfValue(this.valueOf().plus(that.valueOf()));
  };

  FdfValue.prototype.minus = function(that) {
    return new FdfValue(this.valueOf().minus(that.valueOf()));
  };

  FdfValue.prototype.times = function(that) {
    return new FdfValue(this.valueOf().times(that.valueOf()).round(5));
  };

  FdfValue.prototype.div = function(that) {
    var divisor = that.valueOf();
    if (divisor.toString() === "0")
    {
      throw new FatalError(
        "RULE PROCESSING TERMINATED DUE TO DIVISION BY 0", 50136, null, that);
    }
    return new FdfValue(this.valueOf().div(divisor));
  };

  FdfValue.prototype.eq = function (that) {
    var result = (compare(this, that).eq(0)) ? FdfValue.TRUE : FdfValue.FALSE;
    logCompare(this, that, "=", result);
    return result;
  };

  FdfValue.prototype.ne = function (that) {
    var result = (compare(this, that).eq(0)) ? FdfValue.FALSE : FdfValue.TRUE;
    logCompare(this, that, "!=", result);
    return result;
  };

  FdfValue.prototype.lt = function (that) {
    var result = (compare(this, that).lt(0)) ? FdfValue.TRUE : FdfValue.FALSE;
    logCompare(this, that, "<", result);
    return result;
  };

  FdfValue.prototype.lte = function (that) {
    var result = (compare(this, that).lte(0)) ? FdfValue.TRUE : FdfValue.FALSE;
    logCompare(this, that, "<=", result);
    return result;
  };

  FdfValue.prototype.gt = function (that) {
    var result = (compare(this, that).gt(0)) ? FdfValue.TRUE : FdfValue.FALSE;
    logCompare(this, that, ">", result);
    return result;
  };

  FdfValue.prototype.gte = function (that) {
    var result = (compare(this, that).gte(0)) ? FdfValue.TRUE : FdfValue.FALSE;
    logCompare(this, that, ">=", result);
    return result;
  };

  FdfValue.prototype.and = function (that) {
    return (this.valueOf().eq(1) & that.valueOf().eq(1)) ? FdfValue.TRUE : FdfValue.FALSE;
  };

  FdfValue.prototype.or = function(that) {
    return (this.valueOf().eq(1) | that.valueOf().eq(1)) ? FdfValue.TRUE : FdfValue.FALSE;
  };

  FdfValue.prototype.compare = function(that) {
    return new FdfValue(compare(this, that));
  };

  function logCompare(v1, v2, compareType, result) {
      //don't execute anything in this function if logging isn't enabled
      if (!window.ato.enableJSRELogging) return;

      var str1 = '', str2 = '';
      var v1IsLiteral = v1.isLiteral, v2IsLiteral = !(v2 instanceof FdfValue) || v2.isLiteral;

      if (v1IsLiteral) {
          str1 = "'" + v1 + "'";
      } else {
          str1 = "field (id=" + v1.field.id + ", section=" + v1.field.sectionId + ", value='" + v1._value + "')";
      }

      if (v2IsLiteral) {
          str2 = " '" + v2 + "'";
      } else {
          str2 = " field (id=" + v2.field.id + ", section=" + v2.field.sectionId + ", value='" + v2._value + "')";
      }

      console.log("compare " + str1 + " " + compareType + str2 + ". The result is %c" + (result == 1).toString(), "color:" + ((result == 1) ? "green" : "red"));
  }

  function compare(v1, v2) {
    var v1IsLiteral = v1.isLiteral,
        v2IsLiteral = !(v2 instanceof FdfValue) || v2.isLiteral,
        // if both values are either numeric (including logical results) or numchar fields
        //    treat both values as numeric
        v1IsNumeric = (                                                                               v1.type === FdfType.NUMERIC || !v1IsLiteral && v1.field.type === FieldType.NUM_CHAR),
        v2IsNumeric = (v2 instanceof BigNumber || typeof v2 === "number" || v2 instanceof FdfValue && v2.type === FdfType.NUMERIC || !v2IsLiteral && v2.field.type === FieldType.NUM_CHAR),
        v1String = v1.toString(),
        v2String = v2.toString();

    // note: a null field is length 0 (empty)

    // if both values are not null and types are not equal (0 !== null for numeric fields)
    //    error mismatched types,
    //    note this will let through different types if either is null! (this is probably a bug)
    if (v1String !== "" && v2String !== "" && v1IsNumeric ^ v2IsNumeric) {
      throw new FatalError(
        "CAN NOT COMPARE MISMATCHED DATA TYPES", 14119, null, v1);
    }

    // if either value is a field ref in date format and other value a non-null alpha
    //    normalise literal value, fatal error if not a date
    if (!v2IsLiteral && v2.field.type === FieldType.DATE &&
        v1IsLiteral && v1String !== "" && v1.type === FdfType.ALPHA) {
      v1String = FdfValue.normaliseDate(v1String);
    }
    else if (!v1IsLiteral && v1.field.type === FieldType.DATE &&
        v2IsLiteral && v2String !== "" && (typeof v2 === "string" || v2 instanceof FdfValue && v2.type === FdfType.ALPHA)) {
      v2String = FdfValue.normaliseDate(v2String);
    }

    //v1String =
    //  (v1IsLiteral && v1.type === FdfType.ALPHA && v1String !== "" && !v2IsLiteral && v2.field.type === FieldType.DATE) ?
    //  FdfValue.normaliseDate(v1String) : v1String;
    //v2String =
    //  (v2IsLiteral && (typeof v2 === "string" || v2 instanceof FdfValue && v2.type === FdfType.ALPHA) && v2String !== "" &&
    //  !v1IsLiteral && v1.field.type === FieldType.DATE) ?
    //  FdfValue.normaliseDate(v2String) : v2String;

    // if either field is a null non-numeric
    //     (note: the BLANK literal will trigger this condition rather than
    //      falling through and being compared as 0 when compared against a numeric,
    //      this is probably a bug since BLANK is supposed to represent an empty
    //      string or 0 numeric depending on context)
    //    return -1 if only first null
    //            0 if both null
    //           +1 if only second null
    if (!v1IsNumeric && v1String === "") {
      return (v2String === "") ? FdfValue.ZERO._numericValue : FdfValue.MINUS_ONE._numericValue;
    } else if (!v2IsNumeric && v2String === "") {
      return (v1String === "") ? FdfValue.ZERO._numericValue : FdfValue.ONE._numericValue;
    }

    // if first field is numeric
    //    compare both fields as numeric with nulls treated as 0:
    //     (note: it is possible to get to this point with 2nd field non-null
    //      non-numeric which will throw an error here, this is a bug although it
    //      would be an error in input anyway just not being caught above as
    //      a type mismatch where it should)
    //    return -1 if first < second
    //            0 if first = second
    //           +1 if first > second
    if (v1IsNumeric) {
      return v1.valueOf().minus((typeof v2 === "number") ? new BigNumber(v2, 10) : (v2 instanceof BigNumber) ? v2 : v2.valueOf());
    }

    // otherwise compare as alphas
    // TODO(ubrmq): ensure that alpha comparison is using the same collation order
    // as the MF which is probably EBCDIC
    return new BigNumber(v1String.compare(v2String), 10);
  };

  FdfValue.normaliseDate = function(v) {
    if (typeof v !== "string")
      throw new Error("normaliseDate can only be called with a string.");

    if (v.length === 0) return "";

    if (v.length !== 10) {
      throw new FatalError("INVALID DATE FORMAT (1)", 14122, null, v);
    }

    var parts = v.split(/[-\/]/);
    if (parts.length !== 3) {
      throw new FatalError("INVALID DATE FORMAT (2)", 14123, null, v);
    }

    var l0 = parts[0].length;
    var l1 = parts[1].length;
    var l2 = parts[2].length;

    if (// separators must be the same character
      v.charAt(l0) !== v.charAt(l0 + l1 + 1) ||
      // parts must either be 2-2-4 or 4-2-2 characters long (dd-MM-yyyy or yyyy-MM-dd)
      !(l0 === 2 && l1 === 2 && l2 === 4 || l0 === 4 && l1 === 2 && l2 === 2)) {
      throw new FatalError("INVALID DATE FORMAT (3)", 14124, null, v);
    }

    return (l0 == 2) ? parts[2] + "-" + parts[1] + "-" + parts[0] : parts[0] + "-" + parts[1] + "-" + parts[2];
  };

  // the result of this method should be truncated (by calling round(x)) to the required
  // (5 or less) decimal places
  FdfValue.getNumeric = function(v, trimStart)
  {
    if (v === "")
      return new BigNumber(0);

    var valueToParse = v;
    if (trimStart) {
      valueToParse = valueToParse.trimSpaceLeft();
      if (valueToParse.length === 0) {
        throw new FatalError("'" + v + "' is not a valid numeric value.", 15117);
      }
    } else if (v.charAt(0) === " ") {
      throw new FatalError("'" + v + "' is not a valid numeric value.", 15117);
    }

    if (isNaN(valueToParse)) {
      throw new FatalError("'" + v + "' is not a valid numeric value.", 15117);
    }
    return new BigNumber(valueToParse, 10);
  };

  FdfValue.ZERO          = new FdfValue(0);
  FdfValue.ONE           = new FdfValue(1);
  FdfValue.MINUS_ONE     = new FdfValue(-1);

  FdfValue.FALSE         = FdfValue.ZERO;
  FdfValue.TRUE          = FdfValue.ONE;

  FdfValue.BLANK         = new FdfValue("");
  FdfValue.BLANK_NUMERIC = new FdfValue(0); FdfValue.BLANK_NUMERIC._value = "";

  return FdfValue;
});
