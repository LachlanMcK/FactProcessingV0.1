function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
define(function () {
  "use strict";

  return {
    /// Maximum length for a single compiled rule (see ICCF2704.ASM).
    MAX_STACK_LENGTH: 600,
    /// Maximum number of items on the MF interpreter stack, each operator or operand
    /// is counted as 1 item (see ICCF2700.CBL).
    MAX_STACK_ITEMS: 200,
    /// Maximum length of a single stack item (operator or operand) (see ICCF2700.CBL).
    MAX_STACK_ITEM_LENGTH: 256,

    // language functions

    /// Maximum number of nested CASE blocks (see ICCF2700.CBL), Only checked at runtime.
    MAX_CASE_DEPTH: 10,
    /// Maximum number of nested PERFORM calls (see ICCF2700.CBL), Only checked at runtime.
    MAX_PERFORM_STACK_DEPTH: 10,

    /// Maximum number of arguments to a function call (see ICCF2700.CBL).
    MAX_FUNCTION_ARGS: 50,
    /// Maximum number of sections in an ARRAY section list (see ICCF2700.CBL).
    MAX_ARRAY_SECTIONS: 20,
    /// Maximum number of source items (specified by source field and section list)
    /// when processing an ARRAY function call (see ICCF2700.CBL).
    MAX_ARRAY_SOURCE_ITEMS: 999,

    /// Max length of 'test' number for the NUMERIC internal function.
    MAX_LENGTH_FOR_NUMERIC_FUNCTION: 30,

    // literals / values

    /// Maximum number of digits to the left of the decimal point for a numeric
    /// literal (see ICCF2700.CBL).
    MAX_NUMERIC_LITERAL_INTEGER_DIGITS: 18,
    /// Maximum number of digits to the right of the decimal point for a numeric
    /// literal (see ICCF2700.CBL).
    MAX_NUMERIC_LITERAL_DECIMAL_DIGITS: 5,
    /// Maximum length of an alpha numeric literal (see ICCF2700.CBL). Note in
    /// practice this will generally be limited by the maximum field size of 200.
    MAX_ALPHA_LITERAL_LENGTH: 255, // - 1 for 'A'
    /// Maximum number of digits to the left of the decimal point when setting a
    /// numeric field (see ICCF2700.CBL).
    MAX_NUMERIC_FIELD_INTEGER_DIGITS: 18,
    /// Maximum number of digits to the right of the decimal point when setting a
    /// numeric field (see ICCF2700.CBL).
    MAX_NUMERIC_FIELD_DECIMAL_DIGITS: 2,
    /// Maximum number of digits to the right of the decimal point when setting a
    /// rate field (see ICCF2700.CBL).
    MAX_RATE_FIELD_DECIMAL_DIGITS: 5,
    // valid date formats: yyyy-mm-dd, yyyy/mm/dd, dd-mm-yyyy, dd/mm/yyyy

    // forms / sections / fields / line items

    /// Maximum number of rules per form (see IFWS2407.CPY).
    MAX_RULES_PER_FORM: 5000,
    /// Maximum number of sections per form (see IFWS2407.CPY).
    MAX_SECTIONS_PERFORM: 300,
    /// Maximum number of fields per form (see IFWS2407.CPY).
    MAX_FIELDS_PER_FORM: 5000,
    /// Maximum number of line items per form (see IFWS2407.CPY).
    MAX_LINE_ITEMS_PER_FORM: 16000,
    /// Maximum number of fields per section (see IFWS2407.CPY and Dtool DB),
    /// This appears to have a limit of 99999 in the code but is limited to
    /// three digits i.e., 999 in the Dtool DB.
    MAX_FIELDS_PER_SECTION: 999,
    /// Maximum number of occurrences of a repeating field (see IFWS2407.CPY).
    MAX_LINE_ITEM_OCCURRENCE: 999,
    /// Maximum length of a line item (see IFWS2407.CPY).
    MAX_LINE_ITEM_LENGTH: 200,
    /// Maximum number of recorded errors in a form (see IFWS2407.CPY).
    MAX_FORM_ERRORS: 5,

    DATE_FORMAT: "YYYY-MM-DD",
    TIME_ZONE: "Australia/Sydney" // AUS Eastern Standard Time
  };
});