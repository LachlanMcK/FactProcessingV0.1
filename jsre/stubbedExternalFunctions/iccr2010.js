/// <reference path="../../../../../scripts/require.js" />
/// <reference path="../../../../../scripts/bignumber.js" />
/// <reference path="../extFunction.js" />
/// <reference path="../extFunctionReturnValue.js" />
/// <reference path="../fatalError.js" />
/// <reference path="../fdfValue.js" />
/// <reference path="../ioType.js" />
/// <reference path="../limits.js" />
/// <reference path="../param.js" />
/// <reference path="../paramType.js" />
/// <reference path="../../../services/refData/refDataService.js" />
define([
  "bignumber", "../extFunction", "../extFunctionReturnValue", "../fatalError",
  "../fdfValue", "../ioType", "../limits", "../param", "../paramType", "services/RefData/v1/ClientJSRE"
], function (
  BigNumber, ExtFunction, ExtFunctionReturnValue, FatalError,
  FdfValue, IOType, Limits, Param, ParamType, RefDataService
) {
  "use strict";

  var addLeadingCharactersSig = [
    new Param("fieldToPad",       IOType.BOTH,  ParamType.CHAR,     200, true,  false, "",  "" ),
    new Param("lengthToPadTo",    IOType.INPUT, ParamType.U_INTEGER,  3, true,  false, "",  "Must be >= content length of @fieldToPad." ),
    new Param("paddingCharacter", IOType.INPUT, ParamType.CHAR,       1, false, false, " ", "" )];

  return {
    name: "ICCR2010",

    addLeadingCharacters: function (re, parameters) {
      parameters = ExtFunction.getAllParams(re, parameters, addLeadingCharactersSig);

      var fieldToPad = parameters[0];
      var lengthToPadTo = (parameters[1].valueOfIgnoreSpaces().trunc().mod(10000));
      var paddingCharacter = parameters[2].getValue().charAt(0) || " ";

      var paddingSize = lengthToPadTo.sub(fieldToPad.getValue().length);
      if (paddingSize < 0) {
        throw new FatalError(
            "AddLeadingCharacters: INPUT LINE ITEM TOO BIG", 0, re.rule, parameters[0]);
      }
      paddingSize = paddingSize.mod(100); // HACK: add bug to stay same as MF

      fieldToPad.setValue(paddingCharacter.repeat(+paddingSize) + fieldToPad.getValue());

      return ExtFunctionReturnValue.TRUE;
    },

    checkComplexCalculation: function (re, parameters) {

      // call generic codes table to get complex calculation thresholds for current form
      var response = RefDataService.get({
        tableName: "TCTGCDDCD",
        filters: [
          { name: "CD_ENV_LANGUAGE", value: "'E'" },
          { name: "CD_ICP_KEY_GCDDCD", value: "1" },
          { name: "CD_TYPE_GCDDCD", value: "'FRM-AMT-CHK-" + re.headerDetails.formId() + "'" }
        ]
      });

      var returnValue = new ExtFunctionReturnValue(FdfValue.TRUE);

      var today = re.currentDate().getValue();
      var startDateColumn = response.columnMap["DT_EFFECT"];
      var endDateColumn = response.columnMap["DT_END"];
      var rows = response.rows.filter(function (r) {
        return r[startDateColumn] <= today && today <= r[endDateColumn];
      });
      if (rows.length === 0) return returnValue;

      // TODO(ubrmq): should probably cache this with the form meta data?
      // build list of all fields that have a special indicator that only occurs
      // once on the form
      var fieldsWithUniqueSI = {};
      for (var si = 0, sl = re.form.sections.length; si < sl; si++) {
        var fields = re.form.sections[si].fields;
        for (var fi = 0, fl = fields && fields.length; fi < fl; fi++) {
          var f = fields[fi];
          if (!f.si) continue;
          // if we have already found this SI before then mark it as appearing on
          // multiple fields by setting its value to null otherwise just store it
          fieldsWithUniqueSI[f.si] =
            (fieldsWithUniqueSI[f.si] !== undefined) ? null : f;
        }
      }

      var codeColumn = response.columnMap["CD_CODE_GCDDCD"];
      var decodeColumn = response.columnMap["DC_VALUE_GCDDCD"];
      for (var ri = 0, rl = rows.length; ri < rl; ri++) {
        var r = rows[ri];

        // code column contains the SI to look for
        var si = r[codeColumn].trimSpace() >> 0;
        if (si <= 0) continue;

        // In MF land the form line item data can be in one of two states:
        // compressed and expanded. When compressed only non-null line items are
        // stored, when expanded all line items both null and non-null are stored.
        // Generally the compressed format is used for passing around the form
        // line item data from one sub-system to another and then it is expanded
        // before doing any processing on it. This is important because in the
        // loop below if the data is compressed then whether or not an SI occurs
        // only once (or at all) can vary depending on whether the line items with
        // it are null or not.
        // This is why we must search through the fields for the SI rather than
        // the line items as in the midrange/JS rules engine the line items are
        // essentially always partially compressed in that if they haven't had a
        // value assigned to them or been accessed they will not exist in the
        // LineItems collection.

        // see if we have a field with given SI and check that it's a single
        // occurrence, i.e. another field doesn't have the same SI and that it is
        // non-repeating
        var f = fieldsWithUniqueSI[si];
        if (!f || f.repeating) continue;

        var li = re.li(f.sectionId, f.id);
        if (li.isNull()) continue;

        // check the field value is under the threshold

        // decode column contains the error code and threshold
        var errorAndThresholdString = r[decodeColumn];
        var errorCode = errorAndThresholdString.substring(0, 5).trimSpace() >> 0;
        if (errorCode === 0) continue;
        // note: the MF checks whether the error code exists in the TC2FDFERR
        // codes table and if not ignores this threshold check, I currently don't
        // do this as it seems like a great way to hide errors and screw things up
        var thresholdString = errorAndThresholdString.substring(8, 17).trimSpace();
        var threshold = (thresholdString)
          // note: the errorCode value is first checked to see if it is numeric
          // before trying to convert it to a number, the threshold value is not
          // and will thus throw an exception if it isn't, this is how it is
          // coded on the MF
          ? new BigNumber(thresholdString).round(2) : new BigNumber(0);

        var value = li.valueOfIgnoreSpaces().round(2);
        // note: this probably contains a logic bug since if threshold is positive
        // then negative values are not allowed and vice versa, however this is how
        // the MF behaves so...
        if (value.gt(0) && value.gte(threshold) ||
            value.lt(0) && value.lte(threshold)) {
          // value outside threshold so add error to form
          returnValue.errors.push(errorCode);
          if (returnValue.errors.length === Limits.MAX_FORM_ERRORS) break;
        }
      }

      return returnValue;
    }
  };
});