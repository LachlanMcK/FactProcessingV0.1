function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
/// <reference path="../../../../scripts/require.js" />
/// <reference path="shims.js" />
define([
  "./shims"
], function (
  shims
) {
  "use strict";

  function checkNumeric(value, maxDigits) {
    value = Math.floor(value || 0);
    var maxPlusOne = Math.pow(10, maxDigits);
    return (value < maxPlusOne) ? value : value % maxPlusOne;
  }

  function checkString(value, maxLength) {
    value = (value || "").trimSpace();
    return (value.length <= maxLength) ? value : value.substr(0, maxLength);
  }

  var HeaderDetails = function() {
    this._clientInternalId = 0;
    this._accountId = "";
    this._accountSequenceNumber = 0;
    this._roleType = 0;
    this._periodBeginDate = "";
    this._periodEndDate = "";

    this._transactionId = 0;
    this._transactionType = 0;
    this._linkedTransactionId = 0;
    this._suspendedClientInternalId = 0;

    this._formId = 0;
    this._formType = 0;
    this._formYear = 0;
    this._formMonth = 0;

    this._lodgmentCompletedDate = "";
    this._receivedDate = "";
    this._batchId = 0;
    this._externalBatchId = "";
    this._externalAgency = "";
    this._channelUsed = 0;

    this._updateUserId = "TODO";
    this._updateSource = 0;
    this._updateReason = 0;
  };

  HeaderDetails.prototype.clientInternalId      = function(value) { if (arguments.length) this._clientInternalId = checkNumeric(value, 13);     else return this._clientInternalId };
  HeaderDetails.prototype.accountId             = function(value) { if (arguments.length) this._accountId = checkString(value, 12);             else return this._accountId };
  HeaderDetails.prototype.accountSequenceNumber = function(value) { if (arguments.length) this._accountSequenceNumber = checkNumeric(value, 5); else return this._accountSequenceNumber };
  HeaderDetails.prototype.roleType              = function(value) { if (arguments.length) this._roleType = checkNumeric(value, 3);              else return this._roleType };
  HeaderDetails.prototype.periodBeginDate       = function(value) { if (arguments.length) this._periodBeginDate = checkString(value, 10);       else return this._periodBeginDate };
  HeaderDetails.prototype.periodEndDate         = function(value) { if (arguments.length) this._periodEndDate = checkString(value, 10);         else return this._periodEndDate };

  HeaderDetails.prototype.transactionId             = function(value) { if (arguments.length) this._transactionId = checkNumeric(value, 13);             else return this._transactionId };
  HeaderDetails.prototype.transactionType           = function(value) { if (arguments.length) this._transactionType = checkNumeric(value, 3);            else return this._transactionType };
  HeaderDetails.prototype.linkedTransactionId       = function(value) { if (arguments.length) this._linkedTransactionId = checkNumeric(value, 13);       else return this._linkedTransactionId };
  HeaderDetails.prototype.suspendedClientInternalId = function(value) { if (arguments.length) this._suspendedClientInternalId = checkNumeric(value, 13); else return this._suspendedClientInternalId };

  HeaderDetails.prototype.formId    = function(value) { if (arguments.length) this._formId = checkNumeric(value, 5);    else return this._formId };
  HeaderDetails.prototype.formType  = function(value) { if (arguments.length) this._formType = checkNumeric(value, 5);  else return this._formType };
  HeaderDetails.prototype.formYear  = function(value) { if (arguments.length) this._formYear = checkNumeric(value, 4);  else return this._formYear };
  HeaderDetails.prototype.formMonth = function(value) { if (arguments.length) this._formMonth = checkNumeric(value, 2); else return this._formMonth };

  HeaderDetails.prototype.lodgmentCompletedDate = function(value) { if (arguments.length) this._lodgmentCompletedDate = checkString(value, 10); else return this._lodgmentCompletedDate };
  HeaderDetails.prototype.receivedDate          = function(value) { if (arguments.length) this._receivedDate = checkString(value, 10);          else return this._receivedDate };
  HeaderDetails.prototype.batchId               = function(value) { if (arguments.length) this._batchId = checkNumeric(value, 13);              else return this._batchId };
  HeaderDetails.prototype.externalBatchId       = function(value) { if (arguments.length) this._externalBatchId = checkString(value, 30);       else return this._externalBatchId };
  HeaderDetails.prototype.externalAgency        = function(value) { if (arguments.length) this._externalAgency = checkString(value, 12);        else return this._externalAgency };
  HeaderDetails.prototype.channelUsed           = function(value) { if (arguments.length) this._channelUsed = checkNumeric(value, 3);           else return this._channelUsed };

  HeaderDetails.prototype.updateUserId = function(value) { if (arguments.length) this._updateUserId = checkString(value, 8);  else return this._updateUserId };
  HeaderDetails.prototype.updateSource = function(value) { if (arguments.length) this._updateSource = checkNumeric(value, 3); else return this._updateSource };
  HeaderDetails.prototype.updateReason = function(value) { if (arguments.length) this._updateReason = checkNumeric(value, 3); else return this._updateReason };

  return HeaderDetails;
});