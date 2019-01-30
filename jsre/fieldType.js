function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
define(function () {
  "use strict";

  return {
    SMALL_INTEGER: "Q",
    INTEGER:       "U",
    U_INTEGER:     "M",
    YEAR:          "Y",
    DECIMAL:       "A",
    U_DECIMAL:     "N",
    PERCENT:       "P",
    RATE:          "R",

    INDICATOR:     "I",
    DATE:          "D",
    CHAR:          "C",
    CLOB:          "B",
    LABEL:         "O",
    NUM_CHAR:      "X"
  };
});