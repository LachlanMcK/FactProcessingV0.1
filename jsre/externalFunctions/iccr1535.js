function define() { module.exports = require("../../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../../scripts/require.js" />
/// <reference path="../../../../../scripts/moment.js" />
/// <reference path="../extFunction.js" />
/// <reference path="../extFunctionReturnValue.js" />
/// <reference path="../fatalError.js" />
/// <reference path="../fatalErrorNumber.js" />
/// <reference path="../fdfType.js" />
/// <reference path="../fdfValue.js" />
/// <reference path="../fieldType.js" />
/// <reference path="../limits.js" />
/// <reference path="../../../services/refData/refDataService.js" />
define([
  "moment", "../extFunction", "../extFunctionReturnValue", "../fatalError", "../fatalErrorNumber",
  "../fdfType", "../fdfValue", "../fieldType", "../limits", "services/RefData/v1/ClientJSRE"
], function (
  moment, ExtFunction, ExtFunctionReturnValue, FatalError, FatalErrorNumber,
  FdfType, FdfValue, FieldType, Limits, RefDataService
) {
  "use strict";

  var Iccr1535 = {
    name: "ICCR1535",

    holidays: null,
    holidayEpoch: null,

    dateMathAddition: function (re, parameters) {
      var dateString = ExtFunction.getInputParam(re, parameters, 0, false, false, FdfType.ALPHA).getValue();
      // silently truncate to 10 characters, note we truncate to mimic behaviour of
      // MF so that for example the string "2000-10-20some garbage" is a valid date
      // string since the end will be truncated before validation
      // TODO need to actually confirm the above comment but pretty sure I am correct
      // TODO also need to confirm what happens with dates before 01/01/1900, this
      // seems to be the minimum useable date but not sure what happens with earlier
      // ones? Currently don't do anything special, which is certainly wrong
      var date = ExtFunction.validateDate(re, dateString.substr(0, 10));
      // TODO maxlength is 3 believe it is truncated on left if longer?
      var valueToAdd = Math.abs(+ExtFunction.getInputParam(re, parameters, 1, false, false, FdfType.NUMERIC));
      // optional
      var domain = ExtFunction.getInputParam(re, parameters, 2, true, true, FdfType.ALPHA).getValue();
      var businessDaysFlag = ExtFunction.getInputParam(re, parameters, 3, true, true, FdfType.ALPHA).getValue();
      var returnIssueDateFlag = ExtFunction.getInputParam(re, parameters, 4, true, true, FdfType.ALPHA).getValue();

      if (returnIssueDateFlag === "Y") {
        // if the notCalculateFlag is set then just validate params and return the form issue date
        return new ExtFunctionReturnValue(re.headerDetails.lodgmentCompletedDate());
      }

      switch (domain) {
        case "YEARS": // add valueToAdd years
          date.add("years", valueToAdd);
          break;
        case "MONTHS": // add valueToAdd months
          date.add("months", valueToAdd);
          break;
        case "DAYS": // add valueToAdd days
        case "":
          if (businessDaysFlag === "Y") {
            // if adding business days then we don't include ANY non-business
            // days in the count (including intervening business days)
            return new ExtFunctionReturnValue(addBusinessDays(re, date, valueToAdd).format(Limits.DATE_FORMAT));
          }

          date.add("days", valueToAdd);
          break;
        default:
          throw new FatalError("Invalid date domain", 0, re.rule, parameters[2]);
      }

      // ICCFDTMT.CBL / A0620-PERFORM-ADDITION
      // if adding months or years with business days flag set we only ensure the
      // final date is a business day (intervening non-business days don't matter)
      if (businessDaysFlag === "Y") {
        date = addBusinessDays(re, date, 0);
      }

      return new ExtFunctionReturnValue(date.format(Limits.DATE_FORMAT));
    },

    dateMathSubtraction: function (re, parameters) {
      var dateString = ExtFunction.getInputParam(re, parameters, 0, false, false, FdfType.ALPHA).getValue();
      // silently truncate to 10 characters, note we truncate to mimic behaviour of
      // MF so that for example the string "2000-10-20some garbage" is a valid date
      // string since the end will be truncated before validation
      // TODO need to actually confirm the above comment but pretty sure I am correct
      // TODO also need to confirm what happens with dates before 01/01/1900, this
      // seems to be the minimum useable date but not sure what happens with earlier
      // ones? Currently don't do anything special, which is certainly wrong
      var date = ExtFunction.validateDate(re, dateString.substr(0, 10));
      var domain = ExtFunction.getInputParam(re, parameters, 1, false, true, FdfType.ALPHA).getValue();
      // TODO maxlength is 3 believe it is truncated on left if longer?
      var valueToSubtract = Math.abs(+ExtFunction.getInputParam(re, parameters, 2, false, false, FdfType.NUMERIC));
      // optional
      var businessDaysFlag = ExtFunction.getInputParam(re, parameters, 3, true, true, FdfType.ALPHA).getValue();

      switch (domain) {
        case "YEARS": // add valueToAdd years
          date.subtract("years", valueToSubtract);
        break;
        case "MONTHS": // add valueToAdd months
          date.subtract("months", valueToSubtract);
          break;
        case "DAYS": // add valueToAdd days
        case "":
          if (businessDaysFlag === "Y") {
              // if adding business days then we don't include ANY non-business
              // days in the count (including intervening business days)
              return new ExtFunctionReturnValue(
                  subtractBusinessDays(re, date, valueToSubtract).format(Limits.DATE_FORMAT));
          }

            date.subtract("days", valueToSubtract);
          break;
        default:
          throw new FatalError("Invalid date domain", 0, re.rule, parameters[1]);
      }

      // ICCFDTMT.CBL / A0610-PERFORM-SUBTRACTION
      // if subtracting months or years with business days flag set we only ensure the
      // final date is a business day (intervening non-business days don't matter)
      if (businessDaysFlag === "Y") {
          date = subtractBusinessDays(re, date, 0);
      }

      return new ExtFunctionReturnValue(date.format(Limits.DATE_FORMAT));
    },

    dateMathDifference: function (re, parameters) {
      // silently truncate dates to 10 characters, note we truncate to mimic
      // behaviour of MF so that for example the string "2000-10-20some garbage" is
      // a valid date string since the end will be truncated before validation
      // TODO need to actually confirm the above comment but pretty sure I am correct
      // TODO also need to confirm what happens with dates before 01/01/1900, this
      // seems to be the minimum useable date but not sure what happens with earlier
      // ones? Currently don't do anything special, which is certainly wrong
      var startDateString = ExtFunction.getInputParam(re, parameters, 0, false, false, FdfType.ALPHA).getValue();
      startDateString = startDateString.substr(0, 10);
      var endDateString = ExtFunction.getInputParam(re, parameters, 1, false, false, FdfType.ALPHA).getValue();
      endDateString = endDateString.substr(0, 10);
      // optional
      var domain = ExtFunction.getInputParam(re, parameters, 2, true, true, FdfType.ALPHA).getValue();
      var roundMonthsUp = ExtFunction.getInputParam(re, parameters, 5, true, true, FdfType.ALPHA).getValue();

      // NOTE: this test is done on the string value of the dates, before we
      // actually check that they are valid dates!!! This is how the MF does it
      if (startDateString > endDateString) {
        throw new FatalError("Start date greater than end date",
            FatalErrorNumber.LT_CR_INVALID_DATE_PARM, re.rule, parameters[0]);
      }
      var startDate = ExtFunction.validateDate(re, startDateString);
      var endDate = ExtFunction.validateDate(re, endDateString);

      var difference = 0;
      switch (domain) {
        case "YEARS":
          // calculate difference in whole months
          difference = 12 * (endDate.year() - startDate.year()) + endDate.month() - startDate.month();

          // if the end day is less than the start day don't count partial month
          if (endDate.date() < startDate.date()) difference -= 1;
          difference = Math.floor(difference / 12);
          break;

        case "MONTHS":
            // calculate difference in whole months
          difference = 12 * (endDate.year() - startDate.year()) + endDate.month() - startDate.month();

          // if the end day is less than than start day don't count partial month
          // unless the end day is the last day of the month
          var roundDown = (endDate.date() < startDate.date());
          if (roundDown) {
            switch (endDate.month() + 1) {
              case 2:
                if (endDate.date() === ((endDate.isLeapYear()) ? 29 : 28)) roundDown = false;
                break;
              case 4:
              case 6:
              case 9:
              case 11:
                if (endDate.date() === 30) roundDown = false;
                break;
            }
            if (roundDown) difference -= 1;
          } else if (roundMonthsUp === "1" && endDate.date() > startDate.date()) {
            difference += 1;
          }
          break;

        case "DAYS":
        case "":
          // calculate the difference in days
          difference = endDate.diff(startDate, "days");
          break;

        default:
          throw new FatalError(
            "Invalid date domain", 0, re.rule, parameters[2]);
      }

      var startDateLYOut = ExtFunction.validateOutputParam(re, parameters, 3, true, true, FieldType.CHAR);
      if (startDateLYOut !== null) {
        startDateLYOut.setValue(startDate.isLeapYear() ? "TRUE" : "FALSE");
      }

      var endDateLYOut = ExtFunction.validateOutputParam(re, parameters, 4, true, true, FieldType.CHAR);
      if (endDateLYOut !== null) {
        endDateLYOut.setValue(endDate.isLeapYear() ? "TRUE" : "FALSE");
      }

      return new ExtFunctionReturnValue(new FdfValue(difference));
    },

    determineAgeInYears: function (re, parameters) {
      // silently truncate dates to 10 characters, note we truncate to mimic
      // behaviour of MF so that for example the string "2000-10-20some garbage" is
      // a valid date string since the end will be truncated before validation
      // TODO need to actually confirm the above comment but pretty sure I am correct
      // TODO also need to confirm what happens with dates before 01/01/1900, this
      // seems to be the minimum useable date but not sure what happens with earlier
      // ones? Currently don't do anything special, which is certainly wrong
      var birthdayString = ExtFunction.getInputParam(re, parameters, 0, false, false, FdfType.ALPHA).getValue();
      birthdayString = birthdayString.substr(0, 10);
      var todayString = ExtFunction.getInputParam(re, parameters, 1, false, false, FdfType.ALPHA).getValue();
      todayString = todayString.substr(0, 10);

      // NOTE: this test is done on the string value of the dates, before we
      // actually check that they are valid dates!!! This is how the MF does it
      if (birthdayString > todayString) {
          throw new FatalError("Start date greater than end date",
              FatalErrorNumber.LT_CR_INVALID_DATE_PARM, re.rule, parameters[1]);
      }
      var birthday = ExtFunction.validateDate(re, birthdayString);
      var today = ExtFunction.validateDate(re, todayString);

      var age = today.year() - birthday.year();
      if (birthday.month() === today.month() && birthday.date() > today.date() ||
          birthday.month() > today.month()) {
          age -= 1;
      }

      return new ExtFunctionReturnValue(new FdfValue(age));
    },
    
    initHolidays: function () {
      // get the next business day data from the generic codes table
      var response = RefDataService.getGeneric("DT-NXT-BUS-DAY");
      if (!response.rows.length) {
        throw new FatalError(
          "Could not get holiday information from generic codes table for getHolidaysToDate function");
      }
      
      // NOTE: the generic codes table contains two tables, one for next business day
      // and one for previous business day. They both contain the same holidays apart
      // from in two places which I believe are errors, specifically: the next business
      // day table contains the date 2008-03-12 but the previous business day table
      // doesn't, the previous business day table doesn't contain 2006-01-02. I haven't
      // included these two differences since I am using the same table for both next
      // and previous business day calculations.
      var holidays = Iccr1535.holidays = [];
      var codeColumn = response.columnMap["CD_CODE_GCDDCD"];
      for (var r = 0; r < response.rows.length; r++) {
        var holiday = moment(response.rows[r][codeColumn], Limits.DATE_FORMAT, true);
        // the next/previous business tables contain weekends, we don't need them
        if (holiday.day() == 0 || holiday.day() == 6) continue;
        holidays.push(holiday);
      }
      Iccr1535.holidayEpoch = moment(response.rows[0][codeColumn], Limits.DATE_FORMAT, true);
    }
  };

  function addBusinessDays(re, date, businessDays) {
    // special case for Saturday
    if (date.day() === 6) {
      // treat as a Sunday (adding an extra day to total)
      date.add("days", 1);
    }

    // special case for Sunday
    if (date.day() === 0) {
      // treat adding 0 days same as adding 1 days
      if (businessDays === 0) businessDays = 1;
    }

    var startDayOffset = date.day() - 1;
    businessDays += startDayOffset;
    var daysToAdd = Math.floor(businessDays / 5) * 7 + businessDays % 5 - startDayOffset;

    // add in public holidays between start and end date
    // we work out holidays by repeatedly calling the getHolidaysToDate(...) with
    // the current end date
    var startHolidays = getHolidaysToDate(re, (daysToAdd === 0) ? date.clone().subtract("days", 1) : date, -1, false);
    businessDays -= startHolidays;

    var endDate = date.clone().add("days", daysToAdd);
    var prevEndHolidays = startHolidays;
    var endHolidays = getHolidaysToDate(re, endDate, startHolidays, false);
    while (endHolidays > prevEndHolidays) {
      var businessDaysAndHolidays = businessDays + endHolidays;
      endDate = date.clone().add("days", Math.floor(businessDaysAndHolidays / 5) * 7 + businessDaysAndHolidays % 5 - startDayOffset);
      prevEndHolidays = endHolidays;
      endHolidays = getHolidaysToDate(re, endDate, prevEndHolidays, false);
    }

    return endDate;
  };

  function subtractBusinessDays(re, date, businessDays) {
    // special case for Sunday
    if (date.day() === 0) {
      // treat as a Saturday (adding an extra day to total)
      date.subtract("days", 1);
    }

    // special case for Saturday
    if (date.day() === 6) {
      // treat subtracting 0 days same as subtracting 1 days
      if (businessDays === 0) businessDays = 1;
    }

    var startDayOffset = 5 - date.day();
    businessDays += startDayOffset;
    var daysToSubtract = Math.floor(businessDays / 5) * 7 + businessDays % 5 - startDayOffset;

    // add in public holidays between start and end date
    // we work out holidays by repeatedly calling the getHolidaysToDate(...) with
    // the current end date
    var startHolidays = getHolidaysToDate(re, (daysToSubtract === 0) ? date.clone().add("days", 1) : date, -1, true);
    businessDays += startHolidays;

    var endDate = date.clone().subtract("days", daysToSubtract);
    var prevEndHolidays = startHolidays;
    var endHolidays = getHolidaysToDate(re, endDate, startHolidays, true);
    while (endHolidays < prevEndHolidays) {
      var businessDaysAndHolidays = businessDays - endHolidays;
      endDate = date.clone().subtract("days", Math.floor(businessDaysAndHolidays / 5) * 7 + businessDaysAndHolidays % 5 - startDayOffset);
      prevEndHolidays = endHolidays;
      endHolidays = getHolidaysToDate(re, endDate, prevEndHolidays, true);
    }

    return endDate;
  };

  // TODO fix this implementation, currently is a bit naïve and inefficient (linear
  // TODO search through _holidays array)
  function getHolidaysToDate(re, date, startIndex, backwards) {
    if (Iccr1535.holidays === null) Iccr1535.initHolidays();
    var holidays = Iccr1535.holidays;
    
    if (date.isBefore(Iccr1535.holidayEpoch)) {
      throw new FatalError(
        "Date too early for getHolidaysToDate", 0, re.rule, date.format(Limits.DATE_FORMAT));
    }

    // TODO there is clearly a similar maximum date that can be passed to this
    // TODO function however it is not clear what this is. It depends on how many
    // TODO future year's worth of holidays are stored in the holiday table
    // TODO (generic codes table). There doesn't appear to be a check in the code
    // TODO to ensure that we don't go past the end however? It will just behave
    // TODO as though there are no holidays (including weekends in MF land!) after
    // TODO that date?

    var i;
    // return the number of holidays since start of epoch for latest holiday <= date
    if (backwards) {
      // searching backwards
      for (i = (startIndex === -1) ? holidays.length - 1 : startIndex; i >= 0; i--) {
        if (holidays[i].isBefore(date)) return i;
      }
      return -1;
    } else {
      // searching fowards
      for (i = (startIndex === -1) ? 0 : startIndex; i < holidays.length; i++) {
        if (holidays[i].isAfter(date)) return i;
      }
      return holidays.length;
    }
  };
  
  return Iccr1535;
});