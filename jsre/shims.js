function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
define(function () {
  "use strict";

  if (typeof String.prototype.trimSpace !== "function") {
    String.prototype.trimSpace = function() {
      return this.replace(/^ +/, "").replace(/ +$/, "");
    };
  }

  if (typeof String.prototype.trimSpaceLeft !== "function") {
    String.prototype.trimSpaceLeft = function() {
      return this.replace(/^ +/, "");
    };
  }

  if (typeof String.prototype.trimSpaceRight !== "function") {
    String.prototype.trimSpaceRight = function() {
      return this.replace(/ +$/, "");
    };
  }

  if (typeof String.prototype.compare !== "function") {
    String.prototype.compare = function(that) {
      return (this > that) ? +1 : (this < that) ? -1 : 0;
    };
  }

  if (typeof String.prototype.repeat !== "function") {
    String.prototype.repeat = function(times) {
      return new Array(times + 1).join(this);
    };
  }

  if (typeof Array.prototype.count !== "function") {
    Array.prototype.count = function(predicate) {
      return this.reduce(function(a, x) { if (predicate(x)) a++; return a; }, 0);
    };
  }

  if (typeof Array.prototype.find !== "function") {
    Array.prototype.find = function(predicate) {
      if (this == null) {
        throw new TypeError('Array.prototype.find called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      var list = Object(this);
      var length = list.length >>> 0;
      var thisArg = arguments[1];
      var value;

      for (var i = 0; i < length; i++) {
        if (i in list) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return value;
          }
        }
      }
      return undefined;
    };
  }

  if (!Math.trunc) {
    Math.trunc = function(x) {
      return (x < 0) ? Math.ceil(x) : Math.floor(x);
    };
  }

  return { };
});
