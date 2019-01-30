function define() { module.exports = require("../../dependenciesMap").apply(this, arguments); }
define(function (require) {
  "use strict";

  var _result = true;

  var abnWeights = [ 10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19 ];
  var acnWeights = [ 8, 7, 6, 5, 4, 3, 2, 1, 1 ];
  var crnWeights = [ 6, 3, 7, 9, 10, 5, 8, 4, 2 ];
  var crnCheckDigit = [ 'X', 'V', 'T', 'S', 'L', 'K', 'J', 'H', 'C', 'B', 'A' ];
  var tanWeights = [ 7, 9, 8, 4, 6, 3, 5, 1 ];
  var sfnWeights = [ 32, 16, 8, 4, 2, 1, 128, 64 ];

  return {
    result: function (value) {
      _result = value;
    },

    // Validates an ABN (Australian Business Number).
    // abn: the ABN to validate.
    // trim: true to trim leading and trailing whitespace or false to not trim.
    // returns: true if the ABN is valid; otherwise, false.
    abn: function (abn, trim) {
      var sum, i;

      if (!abn || typeof abn !== "string") return false;
      if (trim) abn = abn.trim();

      // ensure ABN is string of 11 digits not starting with 0
      if (!/^[1-9]\d{10}$/.test(abn)) return false;

      // weighted sum the digits
      sum = -10;
      for (i = 0; i < 11; i++) sum += abn.charAt(i) * abnWeights[i];

      // for a valid ABN sum must be divisible by 89 with no remainder
      return (sum % 89 === 0);
    },

    // Validates an ACN (Australian Company Number).
    // acn: the ACN to validate.
    // trim: true to trim leading and trailing whitespace or false to not trim.
    // returns: true if the ACN is valid; otherwise, false.
    acn: function (acn, trim) {
      var sum, i;

      if (!acn || typeof acn !== "string") return false;
      if (trim) acn = acn.trim();

      // ensure ACN is string of 9 digits
      if (!/^\d{9}$/.test(acn)) return false;

      // weighted sum the digits
      sum = 0;
      for (i = 0; i < 9; i++) sum += acn.charAt(i) * acnWeights[i];

      // for a valid ACN sum must be divisible by 10 with no remainder
      return (sum % 10 === 0);
    },

    arn: function (arn, trim) {
      return _result;
    },

    bet: function (bet, trim) {
      return _result;
    },

    chessn: function (chessn, trim) {
      return _result;
    },

    // Validates a CRN (Centrelink Reference Number).
    // crn: the CRN to validate.
    // trim: true to trim leading and trailing whitespace or false to not trim.
    // returns: true if the CRN is valid; otherwise, false.
    crn: function (crn, trim) {
      var sum, i;

      if (!crn || typeof crn !== "string") return false;
      if (trim) crn = crn.trim();

      // ensure CRN is string of 9 digits and a check letter
      if (!/^\d{9}[XVTSLKJHCBA]$/.test(crn)) return false;

      // weighted sum the digits
      sum = 0;
      for (i = 0; i < 9; i++) sum += crn.charAt(i) * crnWeights[i];

      // for a valid CRN check digit must equal check digit mapping
      return (crn.charAt(9) === crnCheckDigit[sum % 11]);
    },

    // Validates a TAN (Tax Agent Number).
    // tan: the TAN to validate.
    // trim: true to trim leading and trailing whitespace or false to not trim.
    // returns: true if the TAN is valid; otherwise, false.
    tan: function (tan, trim) {
      var sum, i, l, j;

      if (!tan || typeof tan !== "string") return false;
      if (trim) tan = tan.trim();

      // ensure TAN is correct length: 4 - 8 digits
      if (!/^\d{4,8}$/.test(tan)) return false;

      // weighted sum the digits
      sum = 0;
      for (i = 0, l = tan.length, j = 8 - l; i < l; i++, j++) sum += tan.charAt(i) * tanWeights[j];

      // for a valid TAN sum must be divisible by 11 with no remainder
      return (sum % 11 == 0);
    },

    tfn: function (tfn, trim) {
      return _result;
    },

    san: function (san, trim) {
      return _result;
    },

    // Validates an SFN (Superannuation Fund Number).
    // sfn: the SFN to validate.
    // trim: true to trim leading and trailing whitespace or false to not trim.
    // returns: true if the SFN is valid; otherwise, false.
    sfn: function (sfn, trim) {
      var sum, i;

      if (!sfn || typeof sfn !== "string") return false;
      if (trim) sfn = sfn.trim();

      // ensure SFN is string of 9 digits
      if (!/^\d{9}$/.test(sfn)) return false;

      // weighted sum the digits
      sum = 0;
      for (i = 0; i < 8; i++) sum += sfn.charAt(i) * sfnWeights[i];

      // for a valid SFN remainder after dividing by 11 must equal the check digit
      sum %= 11;
      if (sum === 10) sum = 0;
      return (sum == sfn.charAt(8));
    }
  };
});