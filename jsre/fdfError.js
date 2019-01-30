function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
define(function () {
  "use strict";

  var FdfError = function() {
    this.sectionId = 0;
    this.ruleId = 0;
    this.errorCode = 0;
    this.text = "";

    this.operatorIndex = 0;
    this.operator = "";
    this.rulePosition = 0;

    this.dataIndex = 0;
    this.dataValue = "";

    this.fieldSectionId = 0;
    this.fieldId = 0;
    this.fieldOccurrence = 0;
  };
  FdfError.prototype.toString = function() {
    return "SectionId: " + this.sectionId + ", RuleId: " + this.ruleId + ", FieldId: " + this.fieldId + ", ErrorCode: " + this.errorCode + ", Text: \"" + this.text + "\"";
  };

  return FdfError;
});