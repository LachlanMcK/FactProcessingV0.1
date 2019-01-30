function define() { module.exports = require("../../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../../scripts/require.js" />
/// <reference path="../extFunctionReturnValue.js" />
/// <reference path="../fatalError.js" />
/// <reference path="../fatalErrorNumber.js" />
/// <reference path="../fdfValue.js" />
/// <reference path="./validateId.js" />
define([
  "../extFunctionReturnValue", "../fatalError", "../fatalErrorNumber",
  "../fdfValue", "./validateId"
], function (
  ExtFunctionReturnValue, FatalError, FatalErrorNumber,
  FdfValue, ValidateId
) {
  "use strict";

  return {
    name: "ICCR1601",

    validateExternalIdentifier: function (re, parameters) {
      var clientIdType = 0;
      if (parameters.length > 0 && parameters[0].getValue() !== "") {
        // there looks to be a bug in the parameter validation, if a non-numeric
        // value is passed in for the clientIdType or clientId then instead of
        // returning a fatal error (like everywhere else does with invalid
        // parameters) a normal forms error is returned. Because of this we need
        // to get the numeric value in a try catch to stop the fatal error
        try {
           clientIdType = Math.floor(+parameters[0]);
        } catch (e) {
          return new ExtFunctionReturnValue(
            FdfValue.FALSE, FatalErrorNumber.LT_INVALID_NUMERIC_FLD);
        }
      }

      if (clientIdType === 0) {
        // note: this will be thrown if the user passed the value 0 also, as per MF
        throw new FatalError(
          "CLIENT ID TYPE NOT PASSED IN", 0, re.rule, null);
      }

      if (parameters.length <= 1 || parameters[1].isNullOrSpaces()) {
        throw new FatalError(
          "ID ENTITY NOT PASSED IN", 0, re.rule, null);
      }
      var id = parameters[1].getValue();
      // maximum id length is 20 characters
      if (id.length > 20) id = id.substr(0, 20);

      // validate id depending on type
      var valid = false;
      switch (clientIdType) {
        case   5: valid = ValidateId.tfn(id, true); break;
        case  10: valid = ValidateId.abn(id, true); break;
        case  15: valid = ValidateId.tan(id, true); break;
        case  20: valid = ValidateId.arn(id, true); break;
        case  25: valid = ValidateId.acn(id, true); break;
        case  30: valid = ValidateId.crn(id, true); break;
        case  35: valid = ValidateId.chessn(id, true); break;

        case  50: valid = ValidateId.bet(id, true); break;
        case  93: valid = ValidateId.sfn(id, true); break;
        case 300: valid = ValidateId.san(id, true); break;

        default: throw new FatalError("UNEXPECTED 1644 RETURN CODE",
          FatalErrorNumber.LT_ID_TYPE_UNKNOWN, re.rule, null);
      }

      return new ExtFunctionReturnValue((valid) ? FdfValue.TRUE : FdfValue.FALSE);
    }
  };
});