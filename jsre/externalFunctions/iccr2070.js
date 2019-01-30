function define() { module.exports = require("../../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../../scripts/require.js" />
/// <reference path="../../../../../scripts/bignumber.js" />
/// <reference path="../extFunction.js" />
/// <reference path="../extFunctionReturnValue.js" />
/// <reference path="../fatalError.js" />
/// <reference path="../fdfValue.js" />
/// <reference path="../ioType.js" />
/// <reference path="../param.js" />
/// <reference path="../paramType.js" />
/// <reference path="../../../services/refData/refDataService.js" />
define([
  "bignumber", "../extFunction", "../extFunctionReturnValue", "../fatalError",
  "../fdfValue", "../ioType", "../param", "../paramType", "services/RefData/v1/ClientJSRE"
], function (
  BigNumber, ExtFunction, ExtFunctionReturnValue, FatalError,
  FdfValue, IOType, Param, ParamType, RefDataService
) {
  "use strict";

  var comparePhirClaimCodeSig = [
    new Param("claimCode1",            IOType.INPUT,  ParamType.CHAR,       1, true,  false, "", "@claimCode1 cannot equal @claimCode2."),
    new Param("claimCode2",            IOType.INPUT,  ParamType.CHAR,       1, true,  false, "", "@claimCode1 cannot equal @claimCode2."),
    new Param("healthFundIds",         IOType.INPUT,  ParamType.CHAR,       3, true,  false, "", ""),
    new Param("fundMembershipNumbers", IOType.INPUT,  ParamType.CHAR,      15, true,  false, "", ""),
    new Param("rebatableComponents",   IOType.INPUT,  ParamType.U_INTEGER, 11, true,  false, "", ""),
    new Param("rebatesReceived",       IOType.INPUT,  ParamType.U_INTEGER, 11, true,  false, "", ""),
    new Param("benefitCodes",          IOType.INPUT,  ParamType.CHAR,       3, true,  false, "", ""),
    new Param("taxClaimCodes",         IOType.INPUT,  ParamType.U_INTEGER,  3, true,  false, "", ""),
    new Param("matchFoundFlag",        IOType.OUTPUT, ParamType.INDICATOR,  0, true,  false, "", "")];

  return {
    name: "ICCR2070",

    comparePhirClaimCode: function (re, parameters) {
      parameters = ExtFunction.getAllParams(re, parameters, comparePhirClaimCodeSig);

      // call generic codes table to get tax claim numeric code from the alpha code
      var response = RefDataService.getGeneric("GRP-PVT-HEALTH-INS-CLAIM-CODE");
      var codeColumn = response.columnMap["CD_CODE_GCDDCD"];
      var icpCodeColumn = response.columnMap["CD_ICP_KEY_GCDDCD"];

      // convert first claim code
      var claimCode1 = parameters[0].getValue().substring(0, 1);
      var rows = response.rows.filter(function(r) { return (r[codeColumn] === claimCode1); });
      if (rows.length !== 1) {
        throw new FatalError("ComparePhirClaimCode: INVALID-TAX-CLAIM-CODE", 0,
          re.rule, parameters[0]);
      }
      claimCode1 = rows[0][icpCodeColumn];

      // convert second claim code
      var claimCode2 = parameters[1].getValue().substring(0, 1);
      var rows = response.rows.filter(function(r) { return (r[codeColumn] === claimCode2); });
      if (rows.length !== 1) {
        throw new FatalError("ComparePhirClaimCode: INVALID-TAX-CLAIM-CODE", 0,
          re.rule, parameters[1]);
      }
      claimCode2 = rows[0][icpCodeColumn];

      // ensure claim codes are not the same
      if (claimCode1 === claimCode2) {
        throw new FatalError("ComparePhirClaimCode: Input ClaimCode1 same as ClaimCode2", 0,
          re.rule, parameters[1]);
      }

      var MAX_FUNDS = 25;
      var funds = [];

      // get the health fund ids
      var li = parameters[2];
      if (li.field.maxOccurrence > MAX_FUNDS) {
        throw new FatalError("ComparePhirClaimCode: HEALTH FUND ID LIST GREATER THAN LIMIT", 0,
          re.rule, li);
      }

      var li2 = parameters[2].values();
      var li3 = parameters[3].values();
      var li4 = parameters[4].values();
      var li5 = parameters[5].values();
      var li6 = parameters[6].values();
      var li7 = parameters[7].values();
      // number of items copied is determined by the occurrence of the tax claim
      // code parameter
      var nonNullRecs = 0, taxClaimCodeOcc = Math.min(li7.length, MAX_FUNDS);
      for (var i = 0; i < taxClaimCodeOcc; i++) {
        funds[i] = {
          // copy health fund ids to list, max 3 chars
          fundId: (i < li2.length) ? li2[i].substring(0, 3) : "",
          // copy membership numbers to list, max 15 chars (uses this field's occurrence not first)
          membershipNumber: (i < li3.length) ? li3[i].substring(0, 15) : "",
          // copy rebatable component to list, max 11 digit integer
          rebatableComponent: (i < li4.length) ?
            +FdfValue.getNumeric(li4[i], true).trunc().mod(100000000000) : 0,
          // copy rebate received to list, max 11 digit integer
          rebateReceived: (i < li5.length) ?
            +FdfValue.getNumeric(li5[i], true).trunc().mod(100000000000) : 0,
          // copy benefit code to list, max 3 chars (uses this field's occurrence not first)
          benefitCode: (i < li6.length) ? li6[i].substring(0, 3) : "",
          // copy tax claim code to list, max 3 uinteger
          taxClaimCode: (i < li7.length) ?
            +FdfValue.getNumeric(li7[i], true).trunc().mod(1000) : 0
        };
        // the number of non-null occurrences of the tax claim code determines number
        // of items in list
        var taxClaimCode = li7[i];
        if (taxClaimCode && taxClaimCode.length) nonNullRecs++;
      }

      // check for a match (all rows with a claim code equal to claimCode1 must have
      // a corresponding row with a claim code equal to claimCode2 and all other details
      // the same)
      var used = [];
      var match = false;
      for (var c1 = 0; c1 < nonNullRecs; c1++) {
        var f1 = funds[c1];
        if (f1.taxClaimCode !== claimCode1) continue;

        match = false;
        for (var c2 = 0; c2 < nonNullRecs; c2++) {
          var f2 = funds[c2];
          if (f2.taxClaimCode !== claimCode2 || used[c2]) continue;

          // check if PHIR details from record 1 matches current record
          if (f1.fundId === f2.fundId &&
              f1.membershipNumber === f2.membershipNumber &&
              f1.rebatableComponent === f2.rebatableComponent &&
              f1.rebateReceived === f2.rebateReceived &&
              f1.benefitCode === f2.benefitCode)
          {
            match = true;
            used[c2] = true;
            break;
          }
        }
        // if unsuccessful no point in checking rest of funds
        if (!match) break;
      }

      // write output
      parameters[8].setValue((match) ? "Y" : "N");

      return ExtFunctionReturnValue.TRUE;
    }
  };
});