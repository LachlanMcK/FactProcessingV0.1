function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../scripts/require.js" />
/// <reference path="../../../../scripts/moment-timezone.js" />
/// <reference path="../../../../scripts/moment-timezone-data.js" />
/// <reference path="fatalError.js" />
/// <reference path="fdfError.js" />
/// <reference path="fdfType.js" />
/// <reference path="fdfValue.js" />
/// <reference path="fieldType.js" />
/// <reference path="genVal.js" />
/// <reference path="headerDetails.js" />
/// <reference path="limits.js" />
/// <reference path="lineItem.js" />
/// <reference path="shims.js" />
/// <reference path="../../services/refData/refDataService.js" />
define([
  "bignumber", "moment-timezone", "moment-timezone-data",
  "./fatalError", "./fdfError", "./fdfType", "./fdfValue", "./fieldType", "./genVal",
  "./headerDetails", "./limits", "./lineItem", "./shims", "services/RefData/v1/ClientJSRE"
], function (
  BigNumber, moment, momentTZData,
  FatalError, FdfError, FdfType, FdfValue, FieldType, GenVal,
  HeaderDetails, Limits, LineItem, shims, RefDataService
) {
  "use strict";

  var RulesEngine = function(form, lineItems, processingMode) {
    if (!form) throw new Error("form not set.");
    if (!form.inited) RulesEngine.initMetaData(form);
    this.form = form;
    this.headerDetails = new HeaderDetails();
    this.headerDetails.formId(form.id);
    this.headerDetails.formType(form.type);
    this.disableGenVal = false;
    this.nonInteractiveMode = false;
    this.processingMode(processingMode || "validate");
    this.rule = null;
    this.errors = [];
    // ensure all sections exist in the line items collection
    this.formLineItems = lineItems || {};
    for (var si = 0, sl = form.sections && form.sections.length; si < sl; si++) {
      var s = form.sections[si];
      var sli = this.formLineItems[s.id];
      if (!sli) sli = this.formLineItems[s.id] = {};
      if (!this.disableGenVal) {
        // required fields must exist in the line items collection to be
        // correctly validated by GenVal
        for (var fi = 0, fl = s.fields && s.fields.length; fi < fl; fi++) {
          var f = s.fields[fi];
          if (f.required && !sli[f.id]) sli[f.id] = new LineItem(f);
        }
      }
    }
  };

  RulesEngine.prototype.getSectionName = function (sectionId) {
      var formName = this.form.__moduleId__.replace("Form", "").replace("jsre/forms/", "");
      return window.require("jsre/forms/" + formName + "Mapping")[formName].sections[sectionId];
  }

  RulesEngine.prototype.getFieldName = function (sectionId, fieldId) {
      var formName = this.form.__moduleId__.replace("Form", "").replace("jsre/forms/", "");
      var fields = window.require("jsre/forms/" + formName + "Mapping")[formName].fields;
      for (var i = 0; i < fields.length; i++) {
        if (fields[i][0] === sectionId && fields[i][1] === fieldId) {
            return fields[i][3];
        }
      }
      return "(internal)";
  }
  
  RulesEngine.prototype.processingMode = function(mode) {
    if (mode === undefined) {
      return this._processingMode.substring(0, this._processingMode.length - 5);
    }
    if (this._processingMode !== mode + "Rules") {
      this._processingMode = mode + "Rules";
      this.rules = this.form[this._processingMode] || [];
      this.businessRules = this.form[mode + "BusinessRules"] || [];
    }
  };

  RulesEngine.prototype.run = function(startSectionId, endSectionId) {
    var startIndex, endIndex;
    if (startSectionId === undefined) {
      startIndex = 0;
      endIndex = this.rules.length - 1;
    } else {
      var startSectionRules = validateSectionRules(startSectionId);
      startIndex = startSectionRules.startIndex;
      endIndex = startSectionRules.endIndex;
      if (endSectionId !== undefined) {
        var endSectionRules = validateSectionRules(endSectionId);
        if (startSectionRules.startIndex > endSectionRules.startIndex) {
          throw new Error("End section cannot be before start section.");
        }
        endIndex = endSectionRules.endIndex;
      }
    }

    if (window.ato.enableJSRELogging) {
        console.group("%cRules engine started (id=" + this.form.id + ", file=" + this.form.__moduleId__ + ")", "background: purple; color: white; display: block;");
    }

    this.runInternal(startIndex, endIndex);

    if (window.ato.enableJSRELogging) {
        console.groupEnd();
        console.groupEnd();
    }
  };

  function validateSectionRules(sectionId) {
    var section = this.form[sectionId];
    if (!section) {
      throw new Error("Section '" + sectionId + "' does not exist.");
    }
    var rules = section[this._processingMode];
    if (!rules) {
      throw new Error("Section '" + sectionId + "' does not have " + this.processingMode() + " rules.");
    }
    return rules;
  }

  RulesEngine.prototype.runBusinessRules = function(startBusinessRuleId, endBusinessRuleId) {
    var startRule, endRule;
    if (!startBusinessRuleId) {
      throw new Error("startBusinessRuleId not given.");
    }

    if (!this.businessRules.length) {
      throw new Error(
        "Form does not have " + this.processingMode() + " business rules.");
    }

    if (!(startRule = endRule = this.businessRules[startBusinessRuleId])) {
      throw new Error(
        "Business rule '" + startBusinessRuleId + "' does not exist in the " +
        this.processingMode() + " rules.");
    }

    if (endBusinessRuleId) {
      if (!(endRule = this.businessRules[endBusinessRuleId])) {
        throw new Error(
          "Business rule '" + endBusinessRuleId + "' does not exist in the " +
          this.processingMode() + " rules.");
      }
      if (startRule.startIndex > endRule.endIndex) {
        throw new Error("End rule cannot be before start rule.");
      }
    }

    return this.runInternal(startRule.startIndex, endRule.endIndex);
  };

  RulesEngine.prototype.runInternal = function(startRuleIndex, endRuleIndex) {
    // run genval validation and return straight away if there are errors
    // TODO(ubrmq): this may cause issues since we are validating all fields on
    // TODO(ubrmq): the form even if we are only running one section's rules.
    if (this.disableGenVal) {
      this.errors.length = 0;
    } else {
      Array.prototype.push.apply(this.errors, GenVal.validate(
        Array.prototype.reduce.call(this.formLineItems, function(a, x) {
          var i;
          for (i in x) if (x.hasOwnProperty(i)) {
            a.push(x[i]);
          }
          return a;
        }, [])));
      if (this.errors.length) return false;
    }

    // genval passed, run the main rules engine...
    if (!this.rules.length) return true;
    this.lookupKey = "";
    this.caseLevel = 0;
    this.topLevelSectionId = 0;

    // the top level segment contains all the sections of the form in order
    this.performStack = [{
      sectionId: this.rules[startRuleIndex].sectionId,
      startRule: startRuleIndex, endRule: endRuleIndex
    }];

    // while we have have a segment on the stack
    var previousLength = this.performStack.length;
    while (previousLength) {
      this.currentSegment = this.performStack[previousLength - 1];
      // this will handle setting section meta data and line items for all segments reached via a PERFORM
      this.section = this.form[this.currentSegment.sectionId];
      this.sectionLineItems = this.formLineItems[this.currentSegment.sectionId];

      for (this.ruleIndex = this.currentSegment.startRule;
        // execute each rule in the segment while not all done and a new
        // segment has not been added to the stack. "not all done" means:
        //   - we haven't reached the last rule specified for this segment, and
        this.ruleIndex <= this.currentSegment.endRule &&
        //   - we haven't added a segment to the stack (we haven't encountered
        //     a PERFORM)
        this.performStack.length === previousLength;
        this.ruleIndex++)
      {
        this.rule = this.rules[this.ruleIndex];

        // the TopLevelSectionId only changes for the top level section
        if (this.performStack.length === 1 && this.topLevelSectionId !== this.rule.sectionId) {
          this.topLevelSectionId = this.rule.sectionId;
          // this will handle setting section meta data and line items for all top level segments
          this.section = this.form[this.topLevelSectionId];
          this.sectionLineItems = this.formLineItems[this.topLevelSectionId];
        }

        this.repeatCount = this.o = 0;
          //try {

        if (window.ato.enableJSRELogging) {
            console.group("executing rule (form=" + this.form.id + ", section=" + this.rule.sectionId + ", sectionName='" + this.getSectionName(this.rule.sectionId) + "', id=" + this.rule.id + ", brId='" + this.rule.brId + "')");
        }

        var stackBefore = this.performStack.length;
        this.rule.rule(this);

        if (window.ato.enableJSRELogging) {
            if (stackBefore === this.performStack.length || this.performStack.length === 0) {
                console.groupEnd();
            }
        }
        //} catch (e) {
        //  this.error(e.errorCode);
        //  var err = this.errors[this.errors.length - 1];
        //  err.text = e.message;
        //  err.dataValue = e.value;
        //}
      }

      

      // if no new segment has been added, pop the current (finished) segment
      // and continue where left off in previous segment, otherwise either STOP
      // has been called, the stack is empty and the rules engine will exit or
      // PERFORM has been called, there is a new frame on the stack and we will
      // begin executing it
      if (this.performStack.length === previousLength) {
          console.groupEnd();
        this.performStack.pop();
      }
      previousLength = this.performStack.length;
    }

    // return true if we don't have errors
    return (!this.errors.length);
  };

  RulesEngine.prototype.li = function(sectionId, fieldId) {
    var li, s, f;

    if (fieldId !== undefined) {
      // sectionId and fieldId given
      s = this.formLineItems[sectionId];
      if ((li = s[fieldId]) !== undefined) return li;
      f = this.form[sectionId][fieldId];
    } else {
      // only fieldId given
      fieldId = sectionId;
      s = this.sectionLineItems;
      if ((li = s[fieldId]) !== undefined) return li;
      f = this.section[fieldId];
    }
    return s[fieldId] = new LineItem(f);
  };

  RulesEngine.prototype.lineItems = function() {
    return this.formLineItems;
  };

  // helper methods for repeating rules

  RulesEngine.prototype.maxUsedLineItem = function() {
    var i, maxUsed = maxUsedLineItem(arguments[0].values(), 1);
    for (i = 1; i < arguments.length; i++) {
      maxUsed = maxUsedLineItem(arguments[i].values(), maxUsed);
    }
    return maxUsed;
  };

  function maxUsedLineItem(values, maxUsed) {
    for (var i = values.length - 1; i >= maxUsed; i--) {
      if (!/^ *$/.test(values[i])) return i + 1;
    }
    return maxUsed;
  }

  // language elements

  RulesEngine.prototype.error = function(errorCode) {
    var e = new FdfError();
    e.errorCode = errorCode;
    e.sectionId = this.rule.sectionId;
    e.ruleId = this.rule.id;
    e.fieldOccurrence = (this.repeatCount) ? this.o + 1 : 0;
    e.fieldId = this.rule.targetFieldId || 0;
    this.errors.push(e);

    if (window.ato.enableJSRELogging) {
        console.error(" raise error (id=" + e.errorCode + ", section=" + e.sectionId + ", rule=" + e.ruleId + ", fieldOccurrence=" + e.fieldOccurrence + ", field=" + e.fieldId + ")");
    }

    if (e.fieldId == 0) return;

    // search through the entire form to find the first instance of the field (if any)
    // NOTE(ubrmq): this is an ill-conceived recent change to the MF rules engine.
    // NOTE(ubrmq): Not only is it rediculously inefficent (search the entire form
    // NOTE(ubrmq): for the field, a field can be repeating and not have a group id
    var sections = this.form.sections
    for (var si = 0, sl = sections.length; si < sl; si++) {
      var fields = sections[si].fields;
      if (fields == undefined) continue;

      for (var fi = 0, fl = fields.length; fi < fl; fi++) {
        var f = fields[fi];
        if (f.id === e.fieldId)
        {
          e.fieldSectionId = f.sectionId;
          // this next 'if' is a bug, the MF checks the group id instead of
          // the field's occurrence to determine if it's a repeating field,
          // if not it clears the occurrence value
          // NOTE(ubrmq): also the errors returned from external functions
          // do not set the target field id and do not run this code (and so
          // behave differently (another bug introduced by this change))
          if (!f.groupId) e.fieldOccurrence = 0;
          return;
        }
      }
    }
    // if we don't find the field reset the occurrence (this should not be here
    // either, this should be caught in the dtool)
    e.fieldOccurrence = 0;
  };

  RulesEngine.prototype.beginCase = function() {
    if (this.caseLevel++ >= Limits.MAX_CASE_DEPTH) {
      throw new FatalError(
        "MORE THEN 10 NESTED CASE STATEMENTS", 15138, this.rule, null);
    }
  };

  RulesEngine.prototype.select = function(test) {
    //return (test.toString() === "OTHER" || (bool) test);
    // note: select statements only except "OTHER", 0 or 1 as a value, anything
    // else is an error. Ideally anything other than 0 would be true but we want
    // to be consistent with the MF, so...
    if (typeof test === "number" || test.type === FdfType.NUMERIC) {
      if (test == 1) return true;
      if (test == 0) return false;
      throw new FatalError(
        "SEL ARGUMENT NOT 0 OR 1", 15113, this.rule, test);
    } else if (test.toString() === "OTHER") return true;
    throw new FatalError(
      "SEL ARGUMENT NOT 0, 1, OR OTHER(1)", 15114, this.rule, test);
  };

  RulesEngine.prototype.endCase = function() {
    if (--this.caseLevel < 0) {
      throw new FatalError(
        "ENDCASE OUTSIDE CASE BLOCK", 15140, this.rule, null);
    }
  };

  RulesEngine.prototype.stop = function() {
    // setup conditions so the rules engine will terminate after executing
    // this statement

    if (window.ato.enableJSRELogging) {
        console.log("%cstop rule engine execution", "color: red;");
    }

    this.performStack.length = 0;
    this.ruleIndex = this.rules.length;
    // relies on the transform inserting a return statement after the Stop()
  };

  RulesEngine.prototype.exitSection = function() {
    // set ruleIndex to the rule before the start of the next section so that on
    // continuation of the main loop it will be incremented to the next section
      this.ruleIndex = this.section[this._processingMode].endIndex;
  };

  RulesEngine.prototype.goto = function(sectionRuleId) {
    var si = this.getRuleIndex(sectionRuleId);

    // check the target does not occur before the current section / rule
    if (si.startRule < this.ruleIndex) {
      throw new FatalError(
        "GOTO REFERS TO AN EARLIER RULE", 15153, this.rule, sectionRuleId);
    }
    // note: because we subtract 1 from the target (so that on the next main loop
    // it will be incremented to point to the correct location) we can actually
    // branch backwards 1 rule at a time!
    this.ruleIndex = si.startRule - 1;
  };

  RulesEngine.prototype.perform = function(startSectionRuleId, endSectionRuleId) {
    var startSI, endSI;
    if (this.performStack.length >= Limits.MAX_PERFORM_STACK_DEPTH) {
      throw new FatalError(
        "EXCESSIVE PERFORM NESTING", 15150, this.rule, startSectionRuleId);
    }
    startSI = this.getRuleIndex(startSectionRuleId);
    if (endSectionRuleId !== undefined) {
      endSI = this.getRuleIndex(endSectionRuleId);
      // start and end rule must be in the same section and start must be before
      // or same as the end
      if (startSI.sectionId !== endSI.sectionId ||
        startSI.startRule > endSI.startRule) {
        throw new FatalError(
          "2ND PERFORM PARM INVALID", 15151, this.rule, endSectionRuleId);
      }
      startSI.endRule = endSI.startRule;
    }
    // set return point to next rule
    this.currentSegment.startRule = this.ruleIndex + 1;
      // add new frame for target location

    this.performStack.push(startSI);
    
    if (window.ato.enableJSRELogging) {
        console.groupEnd(); // end the rule group
        console.group("%cperform rules in section (id=" + startSectionRuleId + ", name='" + this.getSectionName(startSectionRuleId) + "', form=" + this.form.id + ", file=" + this.form.__moduleId__ + ")", 'background: green; color: white; display: block;');
    }
  };

  RulesEngine.prototype.getRuleIndex = function(target) {
    var section, rules, ruleId,
      value = (typeof target === "string") ? target :
        (target instanceof FdfValue && target.type === FdfType.ALPHA) ? target.toString() : "";
    if (value.length !== 5 && value.length !== 11) {
      throw new FatalError(
        "INVALID RULE-ID FORMAT", 15154, this.rule, target);
    }
    if (!/^[1-9]\d{4}(?:,\d{5})?$/.test(value)) {
      throw new FatalError(
        "NON-NUMERIC SECTION/RULE", 15155, this.rule, target);
    }
    if (value.length === 5) {
      // only section id given, return first rule in section
      if ((section = this.form[value]) && (rules = section[this._processingMode])) {
        return { sectionId: section.id, startRule: rules.startIndex, endRule: rules.endIndex };
      }
      throw new FatalError("SECTION NOT FOUND", 15156, this.rule, target);
    } else {
      // both section and rule id given
      var parts = value.split(",");
      if ((section = this.form[parts[0]]) && (rules = section[this._processingMode])) {
        ruleId = +parts[1];
        for (var ruleIndex = rules.startIndex; ruleIndex <= rules.endIndex; ruleIndex++) {
          if (this.rules[ruleIndex].id === ruleId) {
            return { sectionId: section.id, startRule: ruleIndex, endRule: rules.endIndex };
          }
        }
      }
      throw new FatalError("SECTION/RULE NOT FOUND", 15159, this.rule, target);
    }
  };

  RulesEngine.prototype.set = function(lineItem, expr) {
    var integerDigits;
    var sv = expr.toString();
      
    var getFldOutput = function (context, field, value) {
        return "(id=" + field.id + ", section=" + field.sectionId + ", name='" + context.getFieldName(field.sectionId, field.id) + "', value='" + value + "')";
    };

    // no formatting for null values
    if (!sv.length) {
        if (window.ato.enableJSRELogging) {
            console.log("%cset field " + getFldOutput(this, lineItem.field, lineItem._value) + " = ''", 'color:orange;');
        }
        lineItem.setValue("");
        return;
    }

    switch (lineItem.field.type) {
      // numeric types

      // numeric types have leading/trailing space trimmed

      // when setting values of these types store in format PIC -(18)9
      case FieldType.SMALL_INTEGER:
      case FieldType.INTEGER:
        sv = FdfValue.getNumeric(sv, true).toFixed(0);
        // values are truncated on the left to
        // MFLimits.MaxNumericFieldIntegerDigits digits
        // TODO: currently if the number is signed I keep it when
        // TODO: truncating, need to confirm this also happens on the MF
        // TODO: (the sign may be truncated also?)
        integerDigits = sv.length;
        if (sv.charAt(0) === "-")
        {
          if (integerDigits > Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS + 1)
            sv = "-" + sv.substr(-Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS);
        }
        else if (integerDigits > Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS)
        {
          sv = sv.substr(-Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS);
        }
        break;
      case FieldType.U_INTEGER: // for values of this type sign is ignored
        sv = FdfValue.getNumeric(sv, true).toFixed(0);
        if (sv.charAt(0) === "-") sv = sv.substr(1);
        // values are truncated on the left
        // to MFLimits.MaxNumericFieldIntegerDigits digits
        integerDigits = sv.length;
        if (integerDigits > Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS)
        {
          sv = sv.substr(-Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS);
        }
        break;

      // when setting values of these types store in format PIC -(18)9.9(2)
      case FieldType.PERCENT:
      case FieldType.DECIMAL:
        sv = FdfValue.getNumeric(sv, true).toFixed(2);
        // values are truncated on the left to
        // MFLimits.MaxNumericFieldIntegerDigits digits
        // TODO: currently if the number is signed I keep it when
        // TODO: truncating, need to confirm this also happens on the MF
        // TODO: (the sign may be truncated also?)
        integerDigits = sv.indexOf(".");
        //if (integerDigits == -1) integerDigits = sv.Length;
        if (sv.charAt(0) === "-")
        {
          if (integerDigits > Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS + 1)
            sv = "-" + sv.substr(integerDigits - Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS);
        }
        else if (integerDigits > Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS)
        {
          sv = sv.substr(integerDigits - Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS);
        }
        break;
      case FieldType.U_DECIMAL: // for values of this type sign is ignored
        sv = FdfValue.getNumeric(sv, true).toFixed(2);
        if (sv.charAt(0) === "-") sv = sv.substr(1);
        // values are truncated on the left to
        // MFLimits.MaxNumericFieldIntegerDigits digits
        integerDigits = sv.indexOf(".");
        //if (integerDigits == -1) integerDigits = sv.Length;
        if (integerDigits > Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS)
        {
          sv = sv.substr(integerDigits - Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS);
        }
        break;

      // when setting values of this type store in format PIC -(18)9.9(5)
      case FieldType.RATE:
        sv = FdfValue.getNumeric(sv, true).toFixed(5);
        // values are truncated on the left
        // to MFLimits.MaxRateFieldIntegerDigits digits
        // TODO: currently if the number is signed I keep it when
        // TODO: truncating, need to confirm this also happens on the MF
        // TODO: (the sign may be truncated also?)
        integerDigits = sv.indexOf(".");
        //if (integerDigits == -1) integerDigits = sv.Length;
        if (sv.charAt(0) === "-")
        {
          if (integerDigits > Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS + 1)
             sv = "-" + sv.substr(integerDigits - Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS);
        }
        else if (integerDigits > Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS)
        {
          sv = sv.substr(integerDigits - Limits.MAX_NUMERIC_FIELD_INTEGER_DIGITS);
        }
        break;

      // when setting values of this type store in format PIC 9999
      case FieldType.YEAR:
        sv = ("0000" + FdfValue.getNumeric(sv, true).abs().toFixed(0)).slice(-4);
        break;

      // non-numeric

      // when setting values of these types store as is with no space trimming
      case FieldType.CHAR:
      case FieldType.INDICATOR:
        break;

      // TODO we can get rid of this requirement by ensuring literals being assigned to dates are in the correct format in the parser
      // when setting values of this type from an alpha literal store in yyyy-MM-dd format
      case FieldType.DATE:
        if (typeof expr === "string" || expr.isLiteral && expr.type === FdfType.ALPHA) {
          sv = FdfValue.normaliseDate(sv);
        }
        break;

      // both

      // when setting values of these types store as is with no space trimming
      case FieldType.NUM_CHAR:
        break;
    }

    if (window.ato.enableJSRELogging) {
        if (typeof expr === "object" && !expr.isLiteral) {
            console.log("%cset field " + getFldOutput(this, lineItem.field, lineItem._value) + " = field " + getFldOutput(this, expr.field, sv), 'color:blue;');
        } else {
            console.log("%cset field " + getFldOutput(this, lineItem.field, lineItem._value) + " = '" + sv + "'", 'color:blue;');
        }
    }

    lineItem.setValue(sv);
  };

  RulesEngine.prototype.call = function(name) {
    var parameters = [];

    if (window.ato.enableJSRELogging) {
        console.log("call function (name='" + name + "')");
    }

    for (var i = 1, l = arguments.length; i < l; i++) {
      var arg = arguments[i];
      parameters.push((typeof arg === "object") ? arg : new FdfValue(arg));
    }
    var result = RulesEngine.extFunctions[name](this, parameters);

    for (i = 0, l = result.errors && result.errors.length; i < l; i++) {
      // note: same as calling ERROR(result.errors[i]) but doesn't set fieldId
      var e = new FdfError();
      e.errorCode = result.errors[i];
      e.sectionId = this.rule.sectionId;
      e.ruleId = this.rule.id;
      e.fieldOccurrence = (this.repeatCount) ? this.o + 1 : 0;
      this.errors.push(e);
    }

    return result.returnValue;
  };

  RulesEngine.prototype.lookup = function(tableName, equalityFilters, filterColumns, filterValues, filterFactory, outputColumnName) {
    var lookupKey = tableName + ":" + equalityFilters + ":" + filterColumns + ":" + filterValues + ":" + filterFactory,
        request, response, ci, fi, f, output;

    if (window.ato.enableJSRELogging) {
        console.log("lookup codes table (key='"+lookupKey+"')");
    }

    if (lookupKey !== this.lookupKey) {
      // if the lookup key has changed we need to fetch a new data row otherwise
      // use the previously cached value
      this.lookupKey = lookupKey;

      request = { tableName: tableName, filters: [] };
      if (equalityFilters) {
        for (f in equalityFilters) if (equalityFilters.hasOwnProperty(f)) {
          request.filters.push({ name: f, value: equalityFilters[f] });
        }
      }

      response = RefDataService.get(request);
      this.lookupColumns = response.columnMap;

      for (fi = 0; fi < filterColumns.length; fi++) {
        ci = this.lookupColumns[filterColumns[fi]];
        if (ci === undefined) {
          throw new Error("Bad LOOKUP call; codes table '" + tableName + "' does not have a column named '" + filterColumns[fi] + "'.");
        }
        filterValues.push(ci);
      }
//      var filtered = response.rows.filter(filterFactory.apply(null, filterValues));
//
//      if (filtered.length > 1) {
//        throw new FatalError("MORE THAN 1 ROW RETURNED", this.rule, null);
//      }
//      this.lookupRow = (filtered.length === 1) ? filtered[0] : null;
      this.lookupRow = response.rows.find(filterFactory.apply(null, filterValues));
    }

    // handle value in _lookupRow depending on whether we are checking for
    // existence or a value
    if (outputColumnName) {
      if (!this.lookupRow) {
        throw new FatalError("NO ROW RETURNED FOR LOOKUP(" + lookupKey + ") CALL.", this.rule, null);
      }
      output = this.lookupRow[this.lookupColumns[outputColumnName]].toString();
      // if the value can be treated as a numeric return as numeric, otherwise
      // return as alpha
      return (isNumeric(output.trimSpace())) ?
        // note: numeric value is not limited to any particular number of decimals
        new FdfValue(FdfValue.getNumeric(output, true)) :
        new FdfValue(output.trimSpaceRight());
    } else {
      return (this.lookupRow) ? FdfValue.TRUE : FdfValue.FALSE;
    }
  };

  RulesEngine.prototype.isFull = function(lineItem) {
    return (lineItem.toString().length === lineItem.field.maxLength)
      ? FdfValue.TRUE : FdfValue.FALSE;
  };

  RulesEngine.prototype.isAlphanum = function(lineItem) {
    return (lineItem.toString().length === lineItem.field.maxLength &&
      !/[^A-Za-z0-9]/.test(lineItem.toString()))
      ? FdfValue.TRUE : FdfValue.FALSE;
  };

  RulesEngine.prototype.isNumeric = function(expr) {
    return (isNumeric(expr.getValue())) ? FdfValue.TRUE : FdfValue.FALSE;
  };

  function isNumeric(value) {
    value = (value.length > Limits.MAX_LENGTH_FOR_NUMERIC_FUNCTION)
      ? value.substr(0, Limits.MAX_LENGTH_FOR_NUMERIC_FUNCTION) : value;
    return (/^[+-]?(?:\d*\.\d+|\d+\.?)$/.test(value));
  }

  RulesEngine.prototype.length = function(expr) {
    return new FdfValue(expr.toString().length);
  };

  RulesEngine.prototype.abs = function(expr) {
    if (typeof expr === "string" || expr.type === FdfType.ALPHA) {
      throw new FatalError(
        "INVALID PARAMETER FOR ABS FUNCTION", 15136, this.rule, expr);
    }
    return new FdfValue(Math.abs(+expr));
  };

  RulesEngine.prototype.negAbs = function(expr) {
    return new FdfValue(-Math.abs(+expr));
  };

  RulesEngine.prototype.sum = function(lineItem) {
    var sum = new BigNumber(0), values, i;
    if (lineItem.type === FdfType.ALPHA) {
      throw new FatalError(
        "INVALID PARAMETER FOR SUM FUNCTION", 15135, this.rule, lineItem);
    }
    // note: strictly speaking we should probably truncate the intermediate and final
    // values to 5 decimal places however it is unlikely (in normal operation) that a
    // lineitem will have a numeric value with more than 5 decimals so haven't done this
    // for efficiency
    if (lineItem.field.repeating) {
      values = lineItem.values();
      for (i = 0; i < values.length; i++) {
        sum = sum.plus(FdfValue.getNumeric(values[i], true));
      }
    } else {
      sum = FdfValue.getNumeric(lineItem.getValue(), true);
    }
    return new FdfValue(sum);
  };

  function validateRoundParams(expr, decimals) {
    var d;
    if (!expr.toString().length) {
      throw new FatalError(
        "FIRST PARAMETER MUST HAVE DATA", 15143, this.rule, expr);
    }
    if (decimals === undefined) {
      decimals = FdfValue.ZERO.valueOf();
    } else if (!decimals.toString().length) {
      throw new FatalError(
        "2nd PARM MUST HAVE DATA IF PROVIDED", 15144, this.rule, decimals);
    } else if (typeof decimals === "object") {
      decimals = decimals.valueOfIgnoreSpaces();
    } else if (typeof decimals === "string") {
      decimals = FdfValue.getNumeric(decimals, true);
    } else if (typeof decimals === "number") {
      decimals = new BigNumber(decimals);
    }
    d = decimals.round() | 0;
    if (d < 0 || d > 4) {
      throw new FatalError(
        "INVALID DECIMAL PLACES", 15145, this.rule, decimals);
    }
    return { value: (typeof expr === "object") ? expr.valueOfIgnoreSpaces() : FdfValue.getNumeric(expr, true), decimals: d };
  }

  RulesEngine.prototype.round = function(expr, decimals) {
    var params = validateRoundParams.call(this, expr, decimals);
    return new FdfValue(params.value.round(params.decimals, BigNumber.ROUND_HALF_UP));
  };

  RulesEngine.prototype.roundUp = function(expr, decimals) {
    var params = validateRoundParams.call(this, expr, decimals);
    return new FdfValue(params.value.round(params.decimals, BigNumber.ROUND_CEIL));
  };

  RulesEngine.prototype.roundDown = function(expr, decimals) {
    var params = validateRoundParams.call(this, expr, decimals);
    return new FdfValue(params.value.round(params.decimals, BigNumber.ROUND_FLOOR));
  };

  RulesEngine.prototype.isLeapYear = function(expr) {
    var value = expr.toString(),
        year;
    if (value.length !== 4 && value.length !== 10) {
      throw new FatalError(
        "ISLEAPYR PARM LENGTH NOT 4 OR 10", 15163, this.rule, expr);
    }
    if (!/^\d\d\d\d/.test(value)) {
      throw new FatalError(
        "ISLEAPYR YEAR NOT NUMERIC", 15162, this.rule, expr);
    }
    year = +value.substr(0, 4);
    return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))
      ? FdfValue.TRUE : FdfValue.FALSE;
  };

  RulesEngine.prototype.isEmptySection = function(expr) {
    var value = expr.toString(),
        lineItems, li, values, i, v, sectionId;
    if (value.length !== 5) {
      throw new FatalError(
        "EMPTYSEC PARM LENGTH NOT 5", 15165, this.rule, expr);
    }
    if (!/^[+-]?\d+$/.test(value)) {
      throw new FatalError(
        "EMPTYSEC PARM NOT NUMERIC", 15166, this.rule, expr);
    }
    lineItems = this.formLineItems[value];
    if (!lineItems) {
      throw new FatalError(
        "EMPTYSEC SECTION DOES NOT EXSIST IN FORM", 15167, this.rule, expr);
    }

    for (sectionId in lineItems) if (lineItems.hasOwnProperty(sectionId)) {
      li = lineItems[sectionId];
      // if any value contains a non-space character than return false (non-empty section)
      if (li.field.repeating) {
        values = li.values();
        for (i = 0; i < values.length; i++) {
          v = values[i];
          if (v.length && !/^ +$/.test(v)) return FdfValue.FALSE;
        }
      } else {
        v = li.getValue();
        if (v.length && !/^ +$/.test(v)) return FdfValue.FALSE;
      }
    }
    // all values are null or spaces
    return FdfValue.TRUE;
  };

  var timeZoneOffset = moment().zone() - moment().tz(Limits.TIME_ZONE).zone();
  
  RulesEngine.prototype.currentDate = function() {
    // convert current date (and timezone) to Canberra time so we can do all date
    // operations in local time
    return new FdfValue(moment().add("minutes", timeZoneOffset).format(Limits.DATE_FORMAT));
  };

  RulesEngine.prototype.headerField = function(fieldName) {
    switch (fieldName.toString()) {
      case "ID_INTERNAL":  return new FdfValue(this.headerDetails.clientInternalId());
      case "ID_ACCT":      return new FdfValue(this.headerDetails.accountId());
      case "CD_TYPE_ACCT": return new FdfValue(this.headerDetails.roleType());
      case "BEGIN_DATE":   return new FdfValue(this.headerDetails.periodBeginDate());
      case "END_DATE":     return new FdfValue(this.headerDetails.periodEndDate());

      case "ID_TRANS":             return new FdfValue(this.headerDetails.transactionId());
      case "TYPE_TRANS":           return new FdfValue(this.headerDetails.transactionType());
      case "ID_TRANS_LINK":        return new FdfValue(this.headerDetails.linkedTransactionId());
      case "SUSPENSE_ID_INTERNAL": throw new Error("not implemented");

      case "FORM_TYPE":  return new FdfValue(this.headerDetails.formType());
      case "FORM_YEAR":  return new FdfValue(this.headerDetails.formYear());
      case "FORM_MONTH": return new FdfValue(this.headerDetails.formMonth());

      case "PRJ_ISSUE_DATE": return new FdfValue(this.headerDetails.lodgmentCompletedDate());
      case "RECV_DATE":      return new FdfValue(this.headerDetails.receivedDate());
      case "KEY_DATE":       return new FdfValue(this.headerDetails.receivedDate());
      case "BATCH":          return new FdfValue(this.headerDetails.batchId());
      case "BATCH_EXTERNAL": return new FdfValue(this.headerDetails.externalBatchId());
      case "EXT_AGENCY":     return new FdfValue(this.headerDetails.externalAgency());
      case "CHANNEL":        return new FdfValue(this.headerDetails.channelUsed());

      case "ID_EMPLOYEE_UPDATE": return new FdfValue(this.headerDetails.updateUserId());
      case "CD_SOURCE_UPDATE":   return new FdfValue(this.headerDetails.updateSource());
      case "CD_REASON_UPDATE":   return new FdfValue(this.headerDetails.updateReason());

      default: throw new FatalError(
        "NO REQUIRED INPUT DATA IS FOUND", 0, this.rule, fieldName);
    }
  };

  RulesEngine.prototype.arrayMin = function(sourceField, sectionList) {
    var sections = arrayGetSections.call(this, sourceField, sectionList || FdfValue.BLANK, false),
        fieldId = sourceField.field.id,
        firstSourceField = this.form[sections[0]][fieldId],
        data, i, v;

    // find minimum value in array or null if empty
    if (firstSourceField.fdfType === FdfType.NUMERIC) {
      data = arrayGetNumericData.call(this, fieldId, sections);
      if (!data.length) return FdfValue.BLANK_NUMERIC;
      return new FdfValue(Math.min.apply(null, data));
    } else {
      data = arrayGetAlphaData.call(this, fieldId, sections);
      if (!data.length) return FdfValue.BLANK;
      var min = data[0];
      for (i = 1; i < data.length; i++) {
        v = data[i];
        if (v < min) min = v;
      }
      return new FdfValue(min);
    }
  };

  RulesEngine.prototype.arrayMax = function(sourceField, sectionList) {
    var sections = arrayGetSections.call(this, sourceField, sectionList || FdfValue.BLANK, false),
        fieldId = sourceField.field.id,
        firstSourceField = this.form[sections[0]][fieldId],
        data, i, v;

    // find maximum value in array or null if empty
    if (firstSourceField.fdfType === FdfType.NUMERIC) {
      data = arrayGetNumericData.call(this, fieldId, sections);
      if (!data.length) return FdfValue.BLANK_NUMERIC;
      return new FdfValue(Math.max.apply(null, data));
    } else {
      data = arrayGetAlphaData.call(this, fieldId, sections);
      if (!data.length) return FdfValue.BLANK;
      var max = data[0];
      for (i = 1; i < data.length; i++) {
        v = data[i];
        if (v > max) max = v;
      }
      return new FdfValue(max);
    }
  };

  RulesEngine.prototype.arrayDup = function(sourceField, sectionList) {
    var sections = arrayGetSections.call(this, sourceField, sectionList || FdfValue.BLANK, false),
        fieldId = sourceField.field.id,
        firstSourceField = this.form[sections[0]][fieldId],
        data, i, j;

    // return true if data contains duplicates
    if (firstSourceField.fdfType === FdfType.NUMERIC) {
      data = arrayGetNumericData.call(this, fieldId, sections);
      if (data.length <= 1) return FdfValue.FALSE;

      data.sort(function(a, b) { return a.minus(b); });
      for (i = 1, j = 0; i < data.length; j = i++) {
        if (data[j].eq(data[i])) return FdfValue.TRUE;
      }
      return FdfValue.FALSE;
    } else {
      data = arrayGetAlphaData.call(this, fieldId, sections);
      if (data.length <= 1) return FdfValue.FALSE;

      data.sort();
      for (i = 1, j = 0; i < data.length; j = i++) {
        if (data[j] === data[i]) return FdfValue.TRUE;
      }
      return FdfValue.FALSE;
    }
  };

  RulesEngine.prototype.arrayExists = function(sourceField, sectionList, searchValue) {
    var sections = arrayGetSections.call(this, sourceField, sectionList, false),
        fieldId = sourceField.field.id,
        firstSourceField = this.form[sections[0]][fieldId],
        data, count, values, i;

    if (firstSourceField.fdfType === FdfType.NUMERIC) {
      data = arrayGetNumericData.call(this, fieldId, sections);
      if (searchValue.isLiteral) {
        if (searchValue.toString() === "") {
          return new FdfValue(this.arrayMaxOccurrences - data.length);
        }

        searchValue = searchValue.valueOfIgnoreSpaces();
        return new FdfValue(data.count(function(x) { return (x.eq(searchValue)); }));
      } else {
        if (searchValue.field.repeating) {
          count = 0;
          values = searchValue.values();
          for (i = 0; i < values.length; i++) {
            searchValue = values[i];
            if (searchValue === "") continue;

            searchValue = FdfValue.getNumeric(searchValue, true);
            count += data.count(function(x) { return (x.eq(searchValue)); });
          }
          return new FdfValue(count);
        } else {
          if (searchValue.toString() === "") return FdfValue.ZERO;

          searchValue = searchValue.valueOfIgnoreSpaces();
          return new FdfValue(data.count(function(x) { return (x.eq(searchValue)); }));
        }
      }
    } else {
      data = arrayGetAlphaData.call(this, fieldId, sections);
      if (searchValue.isLiteral) {
        searchValue = searchValue.toString();
        if (searchValue === "") {
          return new FdfValue(this.arrayMaxOccurrences - data.length);
        }

        return new FdfValue(data.count(function(x) { return (x === searchValue); }));
      } else {
        if (searchValue.field.repeating) {
          count = 0;
          values = searchValue.values();
          for (i = 0; i < values.length; i++) {
            searchValue = values[i];
            if (searchValue === "") continue;

            count += data.count(function(x) { return (x === searchValue); });
          }
          return new FdfValue(count);
        } else {
          searchValue = searchValue.toString();
          if (searchValue === "") return FdfValue.ZERO;

          return new FdfValue(data.count(function(x) { return (x === searchValue); }));
        }
      }
    }
  };

  RulesEngine.prototype.arrayCreate = function(sourceField, sectionList, targetField) {
    var data = arrayGetAlphaData.call(this, sourceField.field.id,
      arrayGetSections.call(this, sourceField, sectionList, true)),
        target, i;

    target = targetField.values();
    target.length = 0;

    var limit = Math.min(data.length, targetField.field.maxOccurrence);
    for (i = 0; i < limit; i++) { target.push(data[i]); }

    return FdfValue.ZERO;
  };

  function arrayGetSections(sourceField, sectionList, isCreate) {
    var sections, i;
    if (sectionList.toString() === "") {
      // if section list empty then we expect the field to be repeating
      if (!sourceField.field.repeating) {
        throw new FatalError(
          "SINGLE FIELD IS NOT REPEATING", 15106, this.rule, sourceField);
      }

      // set section list to same section as field
      return [ sourceField.field.sectionId ];
    } else {
      if (!/^(?:[1-9]\d{4}(?:,[1-9]\d{4})*)?$/.test(sectionList.toString())) {
        throw new FatalError(
          "INVALID SECTION SPECIFICATION", 15109, this.rule, sectionList);
      }
      // check maximum sections, each section id is 5 digits, plus comma, minus
      // no first comma
      if (sectionList.toString().length > Limits.MAX_ARRAY_SECTIONS * 6 - 1) {
        throw new FatalError(
          "EXCESSIVE SECTIONS IN LIST", 15107, this.rule, sectionList);
      }

      sections = sectionList.toString().split(",");
      for (i = 0; i < sections.length; i++) { sections[i] = sections[i] >> 0; }

      // if section list has a single value then we expect the field to be
      // repeating (unless we are calling the CREATE function)
      // note: the check for the CREATE function here means that the behaviour
      // in regards to an empty section list is different than for one with a
      // single section, even though they both end up working on a single
      // section! I.e. if you call the CREATE function with an empty section
      // list (implying use the section of the field) than you will get an error
      // if the field isn't repeating, if you call it with a single section you
      // won't! In both cases you would have a single value in the array but one
      // causes an error one doesn't! I have left this inconsistency because
      // that's the way it is on the mainframe.
      if (!sourceField.field.repeating && sections.length < 2 && !isCreate)
      {
        throw new FatalError(
          "FIELD MUST REPEAT WHEN 1 SECTION GIVEN", 15108, this.rule, sourceField);
      }
      return sections;
    }
  }

  function arrayGetNumericData(fieldId, sections) {
    var source = [],
        occurrence, i, sectionId, li, v, values;
    if (sections.length > 1) {
      // return value of field (or first value if field is repeating) in each section
      // note: this is not what the documentation says but is how it's coded
      this.arrayMaxOccurrences = sections.length;
      occurrence = -1;
      for (i = 0; i < sections.length; i++) {
        // make sure all field/section combinations exist and have the same occurrence
        sectionId = sections[i];
        li = this.li(sectionId, fieldId);
        if (occurrence === -1) {
          occurrence = li.field.maxOccurrence;
        }
        else if (li.field.maxOccurrence !== occurrence) {
          throw new FatalError(
            "REPEAT COUNTS NOT SAME IN ALL SECTIONS", 15112, this.rule, sections);
        }

        v = li.getValue();
        // ignore null values
        if (v === "") continue;
        source.push(FdfValue.getNumeric(v, true));
      }
      return source;
    } else {
      // return all non-null values of repeating field in given section
      li = this.li(sections[0], fieldId);
      this.arrayMaxOccurrences = li.field.maxOccurrence;
      values = li.values();
      for (i = 0; i < values.length; i++) {
        v = values[i];
        // ignore null values
        if (v === "") continue;
        source.push(FdfValue.getNumeric(v, true));
      }
      return source;
    }
  }

  function arrayGetAlphaData(fieldId, sections) {
    var source = [],
        occurrence, i, sectionId, li, v, values;
    if (sections.length > 1) {
      // return value of field (or first value if field is repeating) in each section
      // note: this is not what the documentation says but is how it's coded
      this.arrayMaxOccurrences = sections.length;
      occurrence = -1;
      for (i = 0; i < sections.length; i++) {
        // make sure all field/section combinations exist and have the same occurrence
        sectionId = sections[i];
        li = this.li(sectionId, fieldId);
        if (occurrence === -1) {
          occurrence = li.field.maxOccurrence;
        }
        else if (li.field.maxOccurrence !== occurrence) {
          throw new FatalError(
            "REPEAT COUNTS NOT SAME IN ALL SECTIONS", 15112, this.rule, sections);
        }

        v = li.getValue();
        // ignore null values
        if (v === "") continue;
        source.push(v);
      }
      return source;
    } else {
      // return all non-null values of repeating field in given section
      li = this.li(sections[0], fieldId);
      // if we are calling the CREATE function with a single field value just
      // return it
      if (!li.field.repeating) {
        this.arrayMaxOccurrences = 1;
        v = li.getValue();
        return (v === "") ? [] : [ v ];
      }

      this.arrayMaxOccurrences = li.field.maxOccurrence;
      values =  li.values();
      for (i = 0; i < values.length; i++) {
        v = values[i];
        // ignore null values
        if (v === "") continue;
        source.push(v);
      }
      return source;
    }
  }

  // each of the SELECT_XXX entries below accepts any number of expressions (usually
  // field references)

  RulesEngine.prototype.select1 = function() {
    var count = 0, i;
    for (i = 0; i < arguments.length; i++) {
      if (arguments[i].toString().length && ++count > 1) {
        return FdfValue.FALSE;
      }
    }
    return (count === 1) ? FdfValue.TRUE : FdfValue.FALSE;
  };

  RulesEngine.prototype.select1Opt = function() {
    var count = 0, i;
    for (i = 0; i < arguments.length; i++) {
      if (arguments[i].toString().length && ++count > 1) {
        return FdfValue.FALSE;
      }
    }
    return FdfValue.TRUE;
  };

  RulesEngine.prototype.select1Min = function() {
    var i;
    for (i = 0; i < arguments.length; i++) {
      if (arguments[i].toString().length) {
        return FdfValue.TRUE;
      }
    }
    return FdfValue.FALSE;
  };

  RulesEngine.prototype.selectMult = function() {
    var count = 0, i;
    for (i = 0; i < arguments.length; i++) {
      if (arguments[i].toString().length && ++count > 1) {
        return FdfValue.TRUE;
      }
    }
    return FdfValue.FALSE;
  };

  RulesEngine.prototype.getReasonCode = function(lineItem) {
    var reasonCodeField = lineItem.field.adjReasonCodeField;
    if (!reasonCodeField) {
      throw new FatalError(
        "NO ASSOCIATED REASON CODE (2)", 15181, this.rule, lineItem);
    }
    return new FdfValue(+this.li(reasonCodeField.sectionId, reasonCodeField.id));
  };

  RulesEngine.prototype.setReasonCode = function(lineItem, expr) {
    var reasonCodeField = lineItem.field.adjReasonCodeField,
        reasonCodeLI, oldValue;
    if (!reasonCodeField) {
      throw new FatalError(
        "NO ASSOCIATED REASON CODE (1)", 15176, this.rule, lineItem);
    }
    reasonCodeLI = this.li(reasonCodeField.sectionId, reasonCodeField.id);
    oldValue = new FdfValue(+reasonCodeLI);
    reasonCodeLI.setValue(expr.getValue());
    return oldValue;
  };

  RulesEngine.initMetaData = function (metaData) {
    var sections = metaData.sections;
    var rulesPropertyRE = /(.*)Rules$/
    for (var si = 0, sl = sections && sections.length; si < sl; si++) {
      var s = sections[si], sId = s.id;

      // add section rules to top level rules
      for (var p in s) if (s.hasOwnProperty(p) && rulesPropertyRE.test(p)) {
        var formRules = metaData[p];
        var formBusinessRules;
        if (!formRules) {
          metaData[p] = formRules = [];
          metaData[RegExp.$1 + "BusinessRules"] = formBusinessRules = [];
        } else {
          formBusinessRules = metaData[RegExp.$1 + "BusinessRules"];
        }

        var sectionRules = s[p];
        sectionRules.startIndex = formRules.length;
        var lastBrId = "", br;
        for (var ri = 0, rl = sectionRules.length; ri < rl; ri++) {
          var r = sectionRules[ri];
          r.sectionId = sId;
          // TODO we currently don't check for duplicate rules in the js engine
          formRules.push(r);

          if (!r.brId) {
            lastBrId = "";
          } else if (r.brId !== lastBrId) {
            if (br) {
              br.endIndex = formRules.length - 2;
              formBusinessRules[lastBrId] = br;
            }
            lastBrId = r.brId;
            br = { startIndex: formRules.length - 1 };
          }
        }
        if (br) {
          br.endIndex = formRules.length - 1;
          formBusinessRules[lastBrId] = br;
        }
        sectionRules.endIndex = formRules.length - 1;
      }

      // set section and field lookups and initialise calculated field values
      metaData[sId] = s;
      var fields = s.fields;
      for (var fi = 0, fl = fields && fields.length; fi < fl; fi++) {
        var f = fields[fi];
        //if (s[f.id]) {
        //  throw new Error("Duplicate field '" + f.id + "' in section '" + sId + "'.");
        //}
        s[f.id] = f;
        f.sectionId = sId;
        if (f.maxOccurrence > 0) f.repeating = true;
        // f.maxOccurrence = f.maxOccurrence || 0;
        // f.required = f.required || false;
        // f.codeType = f.codeType || \"\";
        // f.si = f.si || 0;

        switch (f.type) {
          case FieldType.SMALL_INTEGER:
            f.fdfType = FdfType.NUMERIC;
            f.maxLength = 7;
            break;
          case FieldType.INTEGER:
          case FieldType.U_INTEGER:
            f.fdfType = FdfType.NUMERIC;
            f.maxLength = 11;
            break;
          case FieldType.DECIMAL:
          case FieldType.U_DECIMAL:
            f.fdfType = FdfType.NUMERIC;
            f.maxLength = 13;
            break;
          case FieldType.PERCENT:
            f.fdfType = FdfType.NUMERIC;
            f.maxLength = 5;
            break;
          case FieldType.RATE:
            f.fdfType = FdfType.NUMERIC;
            f.maxLength = 13;
            break;
          case FieldType.YEAR:
            f.fdfType = FdfType.NUMERIC;
            f.maxLength = 4;
            break;
          case FieldType.DATE:
            f.fdfType = FdfType.ALPHA;
            f.maxLength = 10;
            break;
          case FieldType.INDICATOR:
            f.fdfType = FdfType.ALPHA;
            f.maxLength = 1;
            break;
          case FieldType.CHAR:
          case FieldType.NUM_CHAR:
            if (f.maxLength === 0) {
              throw new Error("Maxlength must be specified for fields of type " + ((f.type === FieldType.CHAR) ? "CHAR" : "NUM_CHAR"));
            }
            f.fdfType = FdfType.ALPHA;
            break;
          case FieldType.CLOB:
            f.fdfType = FdfType.ALPHA;
            f.maxLength = Limits.MAX_LINE_ITEM_LENGTH;
            break;
          case FieldType.LABEL:
            f.fdfType = FdfType.ALPHA;
            break;
          default:
            throw new Error("Invalid field type '" + f.type + "'.");
        }
      }
    }
    metaData.inited = true;
  };

  // setup external functions

  RulesEngine.extFunctions = {};

  RulesEngine.addExternalFunctions = function (modules) {
    if (!Array.isArray(modules)) modules = [modules];
    for (var i = 0; i < modules.length; i++) {
      var m = modules[i];
      if (!m.name) {
        throw new Error("External function modules must have a name.");
      }
      for (var p in m) if (m.hasOwnProperty(p) && typeof m[p] === "function") {
        RulesEngine.extFunctions[m.name + "/" + p.charAt(0).toUpperCase() + p.substr(1)] = m[p];
      }
    }
  };

  return RulesEngine;
});
