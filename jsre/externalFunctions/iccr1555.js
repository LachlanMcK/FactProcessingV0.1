function define() { module.exports = require("../../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../../scripts/require.js" />
/// <reference path="../extFunction.js" />
/// <reference path="../extFunctionReturnValue.js" />
/// <reference path="../fatalError.js" />
/// <reference path="../fatalErrorNumber.js" />
/// <reference path="../fdfType.js" />
/// <reference path="../fdfValue.js" />
/// <reference path="../fieldType.js" />
define([
  "../extFunction", "../extFunctionReturnValue", "../fatalError", "../fatalErrorNumber",
  "../fdfType", "../fdfValue", "../fieldType"
], function (
  ExtFunction, ExtFunctionReturnValue, FatalError, FatalErrorNumber,
  FdfType, FdfValue, FieldType
) {
  "use strict";

  return {
    name: "ICCR1555",

    compareLists: function (re, parameters) {
      // dumber than a bag of hammers!

      var MAX_ROWS = 1667;  // ICCR1555.cpy: WS-MAX-ROW
      var MAX_COLUMNS = 12; // ICCR1555.cpy: WS-MAX-COL

      var T1_FIRST_COLUMN = 0;
      var T2_FIRST_COLUMN = 1;

      // validate we have minimum params:
      //                       0,         1,                2,              3,                    4
      // CompareLists, t1Column1, t2Column1, t1ProcessRowFlag, processRowFlag, functionCompleteFlag
      // note: the MF does not do this check here, but it was getting rediculous
      // trying to handle all the possible ways the function can fall over without
      // it, this means that this function doesn't behave the same as the MF when
      // passed invalid parameters, but the MF behaves like a lobotomised monkey,
      // so no big loss...
      if (parameters.length < 5 || parameters.length % 2 !== 1) {
        throw new FatalError("CompareLists: insufficient parameters",
          FatalErrorNumber.LT_ETI_INVALID_INPUT, re.rule, null);
      }

      // check we have the same number of "rows" in each column and collect the
      // column parameters for each table

      var table1 = [];
      var t1Rows = 0;
      var t1LastColumn = (parameters.length - 3) >> 1 << 1;
      for (var i = T1_FIRST_COLUMN; i <= t1LastColumn; i += 2) {
        var col = parameters[i];
        if (col.isLiteral) continue;

        var rows = col.field.maxOccurrence || 1;
        if (i === T1_FIRST_COLUMN) {
          t1Rows = rows;
        } else if (rows !== t1Rows) {
          throw new FatalError("CompareLists: table 1 column occurrences do not match",
            FatalErrorNumber.LT_ETI_INVALID_INPUT, re.rule, col);
        }
        // if the first value in the column is null then ignore whole column!!!
        if (!(col.field.repeating ? col.i(0) : col).isNull()) {
          table1.push(col);
        }
      }

      var table2 = [];
      var t2Rows = 0;
      var t2LastColumn = t1LastColumn - 1;
      for (var i = T2_FIRST_COLUMN; i <= t2LastColumn; i += 2) {
        var col = parameters[i];
        if (col.isLiteral) continue;

        var rows = col.field.maxOccurrence || 1;
        if (i === T2_FIRST_COLUMN) {
            t2Rows = rows;
        } else if (rows !== t2Rows) {
          throw new FatalError("CompareLists: table 2 column occurrences do not match",
            FatalErrorNumber.LT_ETI_INVALID_INPUT, re.rule, col);
        }
        // if the first value in the column is null then ignore whole column!!!
        if (!(col.field.repeating ? col.i(0) : col).isNull()) {
          table2.push(col);
        }
      }

      // note: the MF checks the first columns' null coalesced row counts but uses
      // the line item occurrence to do the comparison. In theory this means it can
      // iterate past the end of the temporary array causing an ABORT. In practice
      // this will never happen since the maximum line item occurrence is 999
      // meaning the maximum coalesced count is always less than 999 and hence less
      // than max rows...
      if (t1Rows > MAX_ROWS) {
        throw new FatalError("CompareLists: table 1 column occurrences is too big",
          FatalErrorNumber.LT_ESC_LIST_OVERFLOW, re.rule, table1[0]);
      }
      if (t2Rows > MAX_ROWS) {
        throw new FatalError("CompareLists: table 2 column occurrences is too big",
          FatalErrorNumber.LT_ESC_LIST_OVERFLOW, re.rule, table2[0]);
      }

      // null values in the list are ignored so we need to remove nulls from the
      // list, note that this is a pretty naive way to go about it but who are we
      // to argue with the MF genius?

      var table1NullCoalesced = [];
      for (i = 0; i < table1.length; i++) {
        var c = table1[i];
        var nullCoalesced = [];
        table1NullCoalesced.push(nullCoalesced);
        if (c.field.repeating) {
          for (var r = 0; r < t1Rows; r++) {
            var v = c.i(r).getValue();
            if (v.length > 0) nullCoalesced.push(v);
          }
          // pad out with nulls to occurrence
          for (var r = nullCoalesced.length; r < t1Rows; r++) {
            nullCoalesced.push(null);
          }
        } else {
          nullCoalesced.push(c.getValue());
        }
        if (table1NullCoalesced.length > MAX_COLUMNS) {
          throw new FatalError("CompareLists: table 1 has too many columns",
            FatalErrorNumber.LT_ESC_LIST_OVERFLOW, re.rule, c);
        }
      }

      var table2NullCoalesced = [];
      for (i = 0; i < table2.length; i++) {
        var c = table2[i];
        var nullCoalesced = [];
        table2NullCoalesced.push(nullCoalesced);
        if (c.field.repeating) {
          for (var r = 0; r < t2Rows; r++) {
            var v = c.i(r).getValue();
            if (v.length > 0) nullCoalesced.push(v);
          }
          // pad out with nulls to occurrence
          for (var r = nullCoalesced.length; r < t2Rows; r++) {
            nullCoalesced.push(null);
          }
        } else {
          nullCoalesced.push(c.getValue());
        }
        if (table2NullCoalesced.length > MAX_COLUMNS) {
          throw new FatalError("CompareLists: table 2 has too many columns",
            FatalErrorNumber.LT_ESC_LIST_OVERFLOW, re.rule, c);
        }
      }

      var processRowFlag =
        ExtFunction.getInputParam(re, parameters, parameters.length - 2, true, false, FdfType.ALPHA)
          .getValue().charAt(0);
      if (processRowFlag === "" || processRowFlag === " ") processRowFlag = null;

      var t1ProcessRowFlag;
      var t1ProcessRowFlagCol = parameters[t1LastColumn];
      if (t1ProcessRowFlagCol.isLiteral ||
          (t1ProcessRowFlagCol.field.repeating ? t1ProcessRowFlagCol.i(0) : t1ProcessRowFlagCol).isNull()) {
        // if the t1ProcessRowFlag parameter is null then set it to default value of list of nulls
        t1ProcessRowFlag = [];
        for (var r1 = 0; r1 < t1Rows; r1++) {
          t1ProcessRowFlag.push(null);
        }
      } else {
        // otherwise trim to first character and convert any single spaces to nulls
        t1ProcessRowFlag = table1NullCoalesced[table1NullCoalesced.length - 1];
        for (var r1 = 0; r1 < t1Rows; r1++) {
          var v = t1ProcessRowFlag[r1];
            if (v !== null) {
              v = v.charAt(0);
              if (v === " ") v = null;
              t1ProcessRowFlag[r1] = v;
            }
        }
        table1.pop();
      }

      // ensure same number of columns in each table, note we don't error if
      // different column counts, just return 0 (no matches)
      // note: we could do this check before doing the null coalescing copies above
      // however the MF reports the column too big error before doing this check and
      // returning so we do too

      var functionCompleteFlag;
      if (table1.length === 0 || table2.length == 0 || table1.length !== table2.length) {
        // set output param to "true" indicate function has executed
        functionCompleteFlag = ExtFunction.validateOutputParam(re, parameters, parameters.length - 1, false, false, null);
        functionCompleteFlag.setValue("1");

        // return no matches
        return ExtFunctionReturnValue.ZERO;
      }

      // check if tables match

      var columns = table1.length;
      var match = false;
      var matchCount = 0;
      for (var r1 = 0; r1 < t1Rows && !(match && matchCount != r1 || !match && matchCount > 0); r1++) {
        match = false;
        if (t1ProcessRowFlag[r1] === processRowFlag) {
          for (var r2 = 0; r2 < t2Rows && !match; r2++) {
            match = true;
            for (var c = 0; c < columns && match; c++) {
              // TODO the field type test could be moved outside of loop
              if (table1[c].field.type !== table2[c].field.type ||
                  table1NullCoalesced[c][r1] !== table2NullCoalesced[c][r2]) {
                match = false;
              }
            }
            if (match) matchCount++;
          }
        }
      }

      // set output param to "true" indicate function has executed
      functionCompleteFlag = ExtFunction.validateOutputParam(re, parameters, parameters.length - 1, false, false, null);
      functionCompleteFlag.setValue("1");

      // evaluate the result
      if (matchCount === t1Rows && matchCount === t2Rows) {
        // return full match
        return new ExtFunctionReturnValue(2);
      } else if (matchCount >= 1) {
        // return partial match
        return ExtFunctionReturnValue.ONE;
      } else {
        // return no match
        return ExtFunctionReturnValue.ZERO;
      }
    },

    separateDate: function (re, parameters) {
      var dateString = ExtFunction.getInputParam(re, parameters, 0, false, false, FdfType.ALPHA).getValue();
      // silently truncate to 10 characters, note we truncate to mimic behaviour of
      // MF so that for example the string "2000-10-20some garbage" is a valid date
      // string since the end will be truncated before validation
      // TODO need to actually confirm the above comment but pretty sure I am correct
      var date = ExtFunction.validateDate(re, dateString.substr(0, 10));

      //MyTax applied a workaround here as the ordering of these statements were inconsistant with the rules
      ExtFunction.validateOutputParam(re, parameters, 1, false, false, null);
      parameters[1].setValue(date.format("DD"));
      ExtFunction.validateOutputParam(re, parameters, 2, false, false, null);
      parameters[2].setValue(date.format("MM"));
      ExtFunction.validateOutputParam(re, parameters, 3, false, false, null);
      parameters[3].setValue(date.format("YYYY"));

      return ExtFunctionReturnValue.TRUE;
    },

    separateField: function (re, parameters) {
      var input = ExtFunction.getInputParam(re, parameters, 0, false, false, FdfType.ALPHA).getValue();
      // note: if the source is a field trailing spaces are ignored (but not for literals)
      if (!parameters[0].isLiteral) input = input.trimSpaceRight();
      var fieldIndex = +ExtFunction.getInputParam(re, parameters, 1, false, false, FdfType.NUMERIC);

      if (fieldIndex > 0 && fieldIndex < input.length)
      {
        ExtFunction.validateOutputParam(re, parameters, 2, false, false, FieldType.CHAR);
        (parameters[2]).setValue(input.substr(0, fieldIndex));
        ExtFunction.validateOutputParam(re, parameters, 3, false, false, FieldType.CHAR);
        (parameters[3]).setValue(input.substr(fieldIndex));
      }
      else
      {
        ExtFunction.validateOutputParam(re, parameters, 2, false, false, FieldType.CHAR);
        (parameters[2]).setValue(input);
      }

      return ExtFunctionReturnValue.TRUE;
    },

    addElement: function (re, parameters) {
      // validate first param
      if (parameters.length <= 0 || parameters[0].isLiteral) {
        throw new FatalError("Destination not given or not a field",
            FatalErrorNumber.LT_CR_PARM_MANDATORY, re.rule, null);
      }

      var destination = parameters[0];
      var newElement;

      // validate second param
      if (parameters.length <= 1 ||
        (newElement = parameters[1]).isLiteral && newElement.getValue() === "") {
        throw new FatalError("New element not given",
          FatalErrorNumber.LT_CR_NO_PARM_VALUE, re.rule, null);
      }

      // note: there is no checking of the destination field type to ensure it
      // can take this value!

      // find the first empty value in the existing line items (if any)
      // TODO: questionable whether it is a good idea to have the consuming
      // functions handle this check for going past the end of the Values
      // collection. This should probably be internal to the LineItem class?
      var firstEmpty = destination.values().indexOf("");

      if (firstEmpty === -1) {
        if (destination.values().length < destination.field.maxOccurrence) {
          // if no empty values in existing data and haven't used max
          // occurrences then add a new value on end
          firstEmpty = destination.values().length;
        } else {
          // all line items are used return false
          return ExtFunctionReturnValue.FALSE;
        }
      }
      // set the new value and return true
      destination.values()[firstEmpty] = newElement.getValue();

      return ExtFunctionReturnValue.TRUE;
    },

    toUppercase: function (re, parameters) {
      // validate parameter is a non-empty line item
      if (parameters.length !== 1 || parameters[0].isLiteral) {
        throw new FatalError("INVALID INPUT",
          FatalErrorNumber.LT_ETI_INVALID_INPUT, re.rule, null);
      }
      var lineItem = parameters[0];
      if (!lineItem.getValue().length) {
        throw new FatalError("INVALID INPUT",
          FatalErrorNumber.LT_ETI_INVALID_INPUT, re.rule, null);
      }

      // if value is all spaces replace with empty string (null)
      if (lineItem.isNullOrSpaces()) {
        lineItem.setValue("");
        // TODO: as far as I can tell if the input contains only spaces (and has
        // a length greater than 0) then the return value of this function will be
        // null, i.e. neither 0 nor 1? Need to confirm this...
        return new ExtFunctionReturnValue(FdfValue.BLANK_NUMERIC);
      }

      // convert to uppercase
      lineItem.setValue(lineItem.getValue().toUpperCase());

      return ExtFunctionReturnValue.TRUE;
    }
  };
});