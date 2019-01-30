function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../scripts/require.js" />
/// <reference path="limits.js" />
/// <reference path="fieldType.js" />
/// <reference path="fdfValue.js" />
define([
  "./limits", "./fieldType", "./fdfValue"
], function (
  Limits, FieldType, FdfValue
) {
  "use strict";

  var lineItem = function (field, value) {
    if (!field) {
      throw new Error("A field must be supplied.");
    }
    if (value === undefined) {
      if (field.repeating) {
        this._values = [];
      } else {
        this.setValue("");
      }
    } else if (typeof value === "string" || typeof value === "number" || value === null) {
      if (field.repeating) {
        throw new Error("Value must be an array for repeating fields.");
      }
      this.setValue(value);
    } else if (Array.isArray(value)) {
      if (!field.repeating) {
        throw new Error("Value must be a string for non-repeating fields.");
      }
      var l = value.length;
      if (l < 1 || l > field.maxOccurrence) {
        throw new Error("Value must contain between 1 and the field's max occurrence items.");
      }
      // TODO(ubrmq): do we want to take this copy? maybe not for efficiency
      this._values = [];
      for (var i = 0; i < l; i++) {
        var v = value[i];
        if (v === null) {
          this._value = "";
        } else {
          v = v.toString(); // ? do we need this?
          this._value = (v.length > Limits.MAX_LINE_ITEM_LENGTH) ?
            v.substr(0, Limits.MAX_LINE_ITEM_LENGTH) : v;
        }
        this._values[i] = this._value;
      }
    } else {
       throw new Error("Only strings, numbers and arrays are supported for value.");
    }

    this.field = field;
    this.type = field.fdfType;
    this.index = 0;
    this.modified = false;
    this.isLiteral = false;
  };
  lineItem.prototype = new FdfValue("");

  lineItem.prototype.getValue = function() {
    if (this._values === undefined) {
      return this._value;
    } else {
      // if we ask for an empty value on the end of the collection simulate
      // it rather than extending the collection with nulls
      return this._values[this.index] || "";
    }
  };

  lineItem.prototype.setValue = function(v) {
    if (v === null || v === undefined) {
      this._value = "";
    } else {
      v = v.toString(); // ? do we need this?
      this._value = (v.length > Limits.MAX_LINE_ITEM_LENGTH) ?
        v.substr(0, Limits.MAX_LINE_ITEM_LENGTH) : v;
    }
    this.modified = this.modified || lineItem.trackModified;
    if (this._values !== undefined) {
      // if we are setting a value past the end of the collection pad up
      // to new index with nulls ("")
      for (var i = this._values.length; i < this.index; i++) this._values[i] = "";
      this._values[this.index] = this._value;
    }
  };

  lineItem.prototype.values = function() {
    if (this._values === undefined) {
       throw new Error(this.field.sectionId + "," + this.field.id +
         " is not a repeating field, use Value property to access field value.");
    }
    return this._values;
  };

  lineItem.prototype.i = function(i) {
    if (this._values === undefined) {
       throw new Error(this.field.sectionId + "," + this.field.id +
         " is not a repeating field, use Value property to access field value.");
    }
    if (i >= this.field.maxOccurrence || i < 0)
    {
        throw new Error("Index out of range.");
    }
    this.index = i;
    return this;
  };

  lineItem.prototype.toString = function() {
    // if this is a field of type date return the normalised date value
    // otherwise return field value as is
    return (this.field.type === FieldType.DATE) ?
      FdfValue.normaliseDate(this.getValue()) :
      this.getValue();
  };

  lineItem.prototype.valueOf = function() {
    return FdfValue.getNumeric(this.getValue(), false).round(5);
  };

  lineItem.prototype.valueOfIgnoreSpaces = function() {
    return FdfValue.getNumeric(this.getValue(), true).round(5);
  };

  lineItem.trackModified = true;
  
  return lineItem;
});