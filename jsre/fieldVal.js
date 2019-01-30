function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../scripts/require.js" />
/// <reference path="../../../../scripts/moment.js" />
/// <reference path="../../../../scripts/bignumber.js" />
/// <reference path="../../services/refData/refDataService.js" />
/// <reference path="externalFunctions/validateId.js" />
define([
  "moment", "bignumber", "knockout", 
  "services/RefData/v1/ClientJSRE", "./externalFunctions/validateId"
], function (
  moment, BigNumber, ko, refDataService, validateId
) {
  "use strict";

  ko.extenders.valI = function (target) {
    target.asBool = ko.pureComputed({
      read:  function () { return (target() === "Y"); },
      write: function (newValue) { target((newValue) ? "Y" : "N"); }
    });
    //this method checks explicitly for N value so that the return result is not affected by the undefined value
    target.asNBool = ko.pureComputed({
        read: function () { return (target() === "N"); }
    });
    return target;
  };


// Custom implementation of valN and valI so we can pass the target to get any observable parameter modifications 
  ko.extenders.valN_O = function (target) {
      target.extend({
          validation: {
              validator: function (val) {
                  return isEmptyVal(val) || checkDecimal(this, val, Math.min(MAX_DECIMAL_PRECISION, target.maxlength - 3), MAX_DECIMAL_DECIMALS, true);
              },
              message: "Unsigned Decimal"
          }
      });
  };

  ko.extenders.valA_O = function (target) {
      target.extend({
          validation: {
              validator: function (val) {
                  return isEmptyVal(val) || checkDecimal(this, val, Math.min(MAX_DECIMAL_PRECISION, target.maxlength - 3), MAX_DECIMAL_DECIMALS);
              },
              message: "Decimal"
          }
      });
  };

  // TODO(ubrmq): should output html5 forms validation attributes for things like maxLength min, max, data types etc also

  var kv = ko.validation, isEmptyVal = kv.utils.isEmptyVal;

  // required

kv.rules.required.message = "This is a required field";

    // data types

    kv.rules.valX = { // NumChar
        validator: function (v, validate) {
            return !validate || isEmptyVal(v) || /^\d+$/.test(v);
        },
        message: "Must be a non-signed whole number"
    };

    kv.rules.valI = { // Indicator
        validator: function (v, validate) {
            return !validate || isEmptyVal(v) || v === "Y" || v === "N";
        },
        message: "Must be either 'Y' or 'N'"
    };

    kv.rules.valY = { // Year
        validator: function (v, validate) {
            return !validate || isEmptyVal(v) || /^\d{4}$/.test(v);
        },
        message: "Must be a 4 digit year"
    };

    var VALID_DATE_FORMATS = ["YYYY-MM-DD", "YYYY/MM/DD", "DD-MM-YYYY", "DD/MM/YYYY"];

    kv.rules.valD = { // Date
        validator: function (v, validate) {
            return !validate || isEmptyVal(v) || moment(v, VALID_DATE_FORMATS, true).isValid();
        },
        message: "Enter a valid date (dd/mm/yyyy)"
    };

    var MAX_SMALL_INTEGER_PRECISION = 7,
        MAX_INTEGER_PRECISION = 11,
        MAX_DECIMAL_PRECISION = 13, MAX_DECIMAL_DECIMALS = 2,
        MAX_PERCENTAGE_PRECISION = 5, MAX_PERCENTAGE_DECIMALS = 2,
        MAX_RATE_PRECISION = 13, MAX_RATE_DECIMALS = 5;

  kv.rules.valP = {
    validator: function (v, validate) {
      return !validate || isEmptyVal(v) || checkDecimal(this, v, MAX_PERCENTAGE_PRECISION, MAX_PERCENTAGE_DECIMALS);
    },
    message: "Percent"
  };

  kv.rules.valR = {
    validator: function (v, validate) {
      return !validate || isEmptyVal(v) || checkDecimal(this, v, MAX_RATE_PRECISION, MAX_RATE_DECIMALS);
    },
    message: "Rate"
  };


  kv.rules.valA = {
    validator: function (v, validate) {
      return !validate || isEmptyVal(v) || checkDecimal(this, v, MAX_DECIMAL_PRECISION, MAX_DECIMAL_DECIMALS);
    },
    message: "Decimal"
  };

  kv.rules.valN = {
    validator: function (v, validate) {
      return !validate || isEmptyVal(v) || checkDecimal(this, v, MAX_DECIMAL_PRECISION, MAX_DECIMAL_DECIMALS, true);
    },
    message: "Unsigned Decimal"
  };


  kv.rules.valQ = {
    validator: function (v, validate) {
      return !validate || isEmptyVal(v) || checkInteger(this, v, MAX_SMALL_INTEGER_PRECISION);
    },
    message: "Small Integer"
  };

  kv.rules.valU = {
    validator: function (v, validate) {
      return !validate || isEmptyVal(v) || checkInteger(this, v, MAX_INTEGER_PRECISION);
    },
    message: "Integer"
  };

  kv.rules.valM = {
    validator: function (v, validate) {
      return !validate || isEmptyVal(v) || checkInteger(this, v, MAX_INTEGER_PRECISION, true);
    },
    message: "Unsigned Integer"
  };

  // code value

  kv.rules.valCV = {
    validator: function (v, codeType) {
      return isEmptyVal(v) || checkCodeValue(this, v, codeType);
    },
    message: "Code Value"
  };

 // id

    kv.rules.valId = {
        validator: function (v, type) {
            return isEmptyVal(v) || validateId[type.toLowerCase()](v, true);
        },
        message: "Must be a valid {0}"
    };

    // name

    kv.rules.valNameE = { // Name Entity
        validator: function (v, validate) {
            return !validate || isEmptyVal(v) || /^[A-Za-z0-9 .\/&()'-]+$/.test(v);
        },
        message: "Can only contain letters, numbers, space and the following symbols: . / & ( ) ' -"
    };

    kv.rules.valNameF = { // Name Family
        validator: function (v, validate) {
            return !validate || isEmptyVal(v) || /^[A-Za-z0-9 ._-]+$/.test(v);
        },
        message: "Can only contain letters, numbers, space and the following symbols: . _ -"
    };

    kv.rules.valNameG = { // Name Given
        validator: function (v, validate) {
            return !validate || isEmptyVal(v) || /^[A-Za-z0-9 ._-]+$/.test(v);
        },
        message: "Can only contain letters, numbers, space and the following symbols: . _ -"
    };

    kv.rules.valNameOG = { // Name Other Given
        validator: function (v, validate) {
            return !validate || isEmptyVal(v) || /^[A-Za-z0-9 ._-]+$/.test(v);
        },
        message: "Can only contain letters, numbers, space and the following symbols: . _ -"
    };

     // street address

    kv.rules.valAddrL1 = kv.rules.valAddrL2 = { // Line 1 / 2
        validator: function (v, validate) {
            if (!validate || isEmptyVal(v)) return true;
            if (!/^[A-Za-z0-9 \/&()'-]+$/.test(v)) {
                //this.message = "Can only contain letters, numbers, space and the following symbols: / & ( ) ' -";
                return false;
            }
            // TODO(ubrmq): too bad if you happen to live in "John Xxiii Ave Mt Claremont WA 6010"
            if (/(\D)\1\1/i.test(v)) {
                //this.message = "Can not have the same letter or symbol repeated 3 times in a row";
                return false;
            }
            // TODO(ubrmq): this is another pointless test and a dodgy regex too. Am assuming
            // TODO(ubrmq): they wanted to make sure address didn't consist of only numbers and
            // TODO(ubrmq): symbols better and easier to just check it contains a letter?
            if (/^[\d \/-]+$/.test(v)) {
                //this.message = "Can not consist of only numbers and symbols";
                return false;
            }
            return true;
        },
        message: "Address appears incorrect or has an invalid character, check your details or enter new address"
    };

    kv.rules.valAddrL1forRent = kv.rules.valAddrL2forRent = { // Line 1 / 2
        validator: function (v, validate) {
            if (!validate || isEmptyVal(v)) return true;
            if (!/^[A-Za-z0-9 \/&()'-]+$/.test(v)) {
                this.message = "Address appears incorrect or has an invalid character, check your details or enter new address.";
                return false;
            }
            if (/(\D)\1\1/i.test(v)) {
                this.message = "Address appears incorrect or has an invalid character, check your details or enter new address.";
                return false;
            }
            if (/^[\d \/-]+$/.test(v)) {
                this.message = "Residential address must be a street address.";
                return false;
            }
            return true;
        },
        message: "Residential address must be a street address."
    };

    kv.rules.valAddrSTL = { // Suburb / Town / Locality
        validator: function (v, params) {
            if (isEmptyVal(v)) return true;
            if (typeof params === 'boolean' || params.countryCode == 14) { // Australia
                if (!/^[A-Za-z &()'-]+$/.test(v)) {
                    //this.message = "Can only contain letters, space and the following symbols: & ( ) ' -";
                    return false;
                }
            } else { // not Australia
                if (!/^[A-Za-z0-9 &()'-]+$/.test(v)) {
                    //this.message = "Can only contain letters, numbers, space and the following symbols: & ( ) ' -";
                    return false;
                }
            }
            return true;
        },
        message: "Suburb appears incorrect or may contain an invalid character, review your details or enter a new  suburb/town/locality"
    };

    // this assumes state is only required for australia (i don't agree with this)
    //UCQ3W: State should not be made mandatory by default. State is always a dropdown with all Australian states and territory codified. 
    //UCQ3W: In the instance where the country is not Australia clients cannot supply a valid state
    kv.rules.valAddrS = { // State
        validator: function (v, params) {
            if (typeof params === 'boolean' || params.countryCode !== 14) { // Australia
                if (!isEmptyVal(v)) {
                    this.message = "Cannot be given if country is not Australia";
                    return false;
                }
            }
            return true;
        },
        message: "State"
    };

    kv.rules.valAddrPC = { // Postcode
        validator: function (v, params) {
            if (isEmptyVal(v)) return true;
            if (typeof params === 'boolean' || params.countryCode == 14) { // Australia 0200-0299, 0800-7499, and 7800-9799
                if (!/^(?:0[289]|[1-68]\d|7[0-48-9]|9[0-7])\d\d$/.test(v)) {
                    //this.message = "Must be a valid Australian postcode";
                    this.message = "Enter a valid postcode";
                    return false;
                }
            } else { // not Australia
                if (!/^[A-Za-z0-9 '\/-]*$/.test(v)) {
                    //this.message = "Can only contain letters, numbers, space and the following symbols: ' / -";
                    this.message = "Enter a valid postcode";
                    return false;
                }
            }
            return true;
        }
    };

    //kv.rules.valAddrC // Country

    kv.init();
    ko.validation.registerExtenders();

    function checkDecimal(self, v, maxPrecision, maxDecimals, nonNeg) {
        var a, s = String(v);
        // Validate numerics
        if (isNaN(v) || /[^0-9\+\-\.]/.test(s)) {
            self.message = "Enter numbers only";
            return false;
        }
        // Test the input length irrespective of leading or trailing zeros that would be trimmed by BigNumber
        if (/^[\-]/.test(s)) {
            if (nonNeg) {
                self.message = "Number cannot be negative";
                return false;
            }
            else {
                s = s.substring(1);
            }
        }

        // Check the validity of the length
        a = s.split(".");
        if (a[0].length > maxPrecision || (a.length > 1) && (a[1].length > maxDecimals)) {
            var maxPrecisionMsg = Array(maxPrecision + 1).join('9');
            var maxDecimalsMsg = Array(maxDecimals + 1).join('9');
            self.message = "Enter number to the limit of " + maxPrecisionMsg + "." + maxDecimalsMsg;
            return false;
        }
      
        return true;
    }

    function checkInteger(self, v, maxPrecision, nonNeg) {
        var s = String(v);
        if (isNaN(v) || /[\.\+]/.test(s) || /[^0-9\-]/.test(s)) {
            self.message = "Enter numbers only";
            return false;
        }
        // Avoid using BigNumber in case of excessive significant digits
        if (/^[\-]/.test(s)) {
            if (nonNeg) {
                self.message = "Number cannot be negative";
                return false;
            }
            else {
                s = s.substring(1);
            }
        }
        if (s.length > maxPrecision) {
            var maxPrecisionMsg = Array(maxPrecision + 1).join('9');
            self.message = "Enter number to the limit of " + maxPrecisionMsg;
            return false;
        }
        return true;
    }

    function checkCodeValue(self, v, codeType) {
        v = +v; // ensure a number for comparison
        if (isNaN(v)) {
            self.message = "Must be a number";
            return false;
        }
        // determine if decode exists in the generic codes table
        var request = {
            tableName: "TCTGCDDCD",
            filters: [
              { name: "CD_ENV_LANGUAGE", value: "'E'" },
              { name: "CD_TYPE_GCDDCD", value: "'" + codeType + "'" }
            ]
        };
        var response = refDataService.get(request);
        var fitlerIndex = response.columnMap["CD_ICP_KEY_GCDDCD"];
        var filtered = response.rows.filter(function (r) { return (r[fitlerIndex] === v); });
        if (filtered.length === 1) return true;

        // note: same error message used if more than one row returned
        self.message = "Must be a valid {0} code value";
        return false;
    }
});
