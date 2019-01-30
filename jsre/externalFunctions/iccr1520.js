function define() { module.exports = require("../../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../../scripts/require.js" />
/// <reference path="../extFunction.js" />
/// <reference path="../extFunctionReturnValue.js" />
/// <reference path="../fatalError.js" />
/// <reference path="../fatalErrorNumber.js" />
/// <reference path="../fdfType.js" />
define([
  "../extFunction", "../extFunctionReturnValue", "../fatalError", "../fatalErrorNumber",
  "../fdfType"
], function (
  ExtFunction, ExtFunctionReturnValue, FatalError, FatalErrorNumber, FdfType
) {
  "use strict";

  return {
    name: "ICCR1520",

    checkDuplicateEntry: function (re, parameters) {
      var c1, occurrence, columns, ignore, i, l, c, r1, c1r1Value, r2, c1r2Value;

      // first parameter must be provided and be a field
      if (parameters.length < 1 || parameters[0].isLiteral) {
        throw new FatalError("CheckDuplicateEntry: column01 not given.",
          FatalErrorNumber.LT_FRM_REQD_FIELD_EMPTY, re.rule,
          (parameters.length < 1) ? null : parameters[0]);
      }
      c1 = parameters[0];

      occurrence = c1.field.maxOccurrence;

      // other parameters must have the same occurrence
      // note: as soon as we find a literal value we ignore any following columns,
      // however their occurrence is still checked and we still return false if it
      // is different from the first column! This is a MF feature.
      columns = [];
      ignore = false;
      for (i = 1, l = Math.min(parameters.length, 10); i < l; i++) {
        c = parameters[i];
        if (c.isLiteral) {
          // literal
          ignore = true;
        } else {
          // line item
          if (c.field.maxOccurrence != occurrence)
          {
            // if occurrence is different return false
            return ExtFunctionReturnValue.FALSE;
          }
          if (!ignore) columns.push(c);
        }
      }

      // check for duplicate row
      l = columns.length;
      for (r1 = 0; r1 < occurrence; r1++) {
        // skip null or space only values
        if (c1.i(r1).isNullOrSpaces()) continue;
        c1r1Value = c1.i(r1).getValue();

        nextRow: for (r2 = r1 + 1; r2 < occurrence; r2++) {
          // skip null or space only values
          if (c1.i(r2).isNullOrSpaces()) continue;
          c1r2Value = c1.i(r2).getValue();

          // is this value is equal to the compare value?
          if (c1r1Value === c1r2Value) {
            // if yes, check other columns (if given)
            for (i = 0; i < l; i++) {
              c = columns[i];
              // note: null or space only values compare equal (rather
              // than being skipped like for the first column)
              if (c.i(r1).getValue().trimSpaceRight() !== c.i(r2).getValue().trimSpaceRight()) {
                continue nextRow;
              }
            }
            // we've found a row that matches for all columns so return true
            return ExtFunctionReturnValue.TRUE;
          }
        }
      }

      // if we get here we haven't found a row that matches so return false
      return ExtFunctionReturnValue.FALSE;
    },

    checkOverlappingDatePeriods: function (re, parameters) {
      var ranges, i, l, beginDate, i1, i2, r1, r2,
          periodBeginDates = parameters[0],
          periodEndDates   = parameters[1],
          groupIds         = parameters[2];
      ExtFunction.getInputParam(re, parameters, 0, false, false, FdfType.ALPHA);
      ExtFunction.getInputParam(re, parameters, 1, false, false, FdfType.ALPHA);
      ExtFunction.getInputParam(re, parameters, 2, true,  true,  FdfType.ALPHA);
      if (groupIds && groupIds.isLiteral) groupIds = null;

      if (periodBeginDates.field.maxOccurrence !== periodEndDates.field.maxOccurrence ||
          groupIds && periodBeginDates.field.maxOccurrence !== groupIds.field.maxOccurrence) {
        throw new FatalError(
          "CheckOverlappingDatePeriods: input occurrences not equal.",
          FatalErrorNumber.LT_LP_OCCURENCES_NOT_EQUAL, re.rule, null);
      }

      // collect non-null ranges
      ranges = [];
      for (i = 0, l = periodBeginDates.values().length; i < l; i++) {
        beginDate = periodBeginDates.i(i).getValue();
        if (beginDate.length) {
          ranges.push({
            beginDate: beginDate,
            endDate:   periodEndDates.i(i).getValue() || "9999-12-31",
            groupId:   (groupIds) ? groupIds.i(i).getValue().trimSpaceRight() : ""
          });
        }
      }

      // check for overlapping date range
      for (i1 = 0; i1 < ranges.length; i1++) {
        r1 = ranges[i1];
        for (i2 = i1 + 1; i2 < ranges.length; i2++) {
          r2 = ranges[i2];
          // group ids must be equal if given
          if (r1.groupId !== r2.groupId) continue;

          if (r1.beginDate >= r2.beginDate && r1.beginDate < r2.endDate ||
              r2.beginDate >= r1.beginDate && r2.beginDate < r1.endDate) {
            return ExtFunctionReturnValue.TRUE;
          }
        }
      }

      return ExtFunctionReturnValue.FALSE;
    }
  };
});