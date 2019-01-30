function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }
define(["q", "jquery"], function (q, $) {
  "use strict";

  var serviceName = '/api/v1/codes/', // route to the WebApi controller
      codesTables = [];

  function calculateFullCacheKey(request) {
    var key = calculateFilteredCacheKey(request);

    if (request.startDate && request.endDate) {
      key += "|" + request.startDate + "|" + request.endDate;
    } else if (request.startDate) {
      key += "|" + request.startDate + "|";
    } else if (request.endDate) {
      key += "||" + request.endDate;
    }

    return key;
  }

  function calculateFilteredCacheKey(request) {
    var key = calculateTableCacheKey(request),
        filters = request.filters, fi, subTable;
    if (key === "TCTGCDDCD" && filters && filters.length) {
      for (fi = 0; fi < filters.length; fi++) {
        if (filters[fi].name === "CD_TYPE_GCDDCD") {
          subTable = filters[fi].value;
          key += "/" + subTable.substr(1, subTable.length - 2);
          break;
        }
      }
    }
    return key;
  }

  function calculateTableCacheKey(request) {
    return request.tableName;
  }

  function calculateQueryString(request) {
    var suffix = "";

    if (request.filters) {
      suffix += "?filters=";

      for (var i = 0; i < request.filters.length; i++) {
        if (i > 0) { suffix += ","; }
        suffix += request.filters[i].name + ":" + request.filters[i].value;
      }
    }

    if (request.startDate) {
      suffix += ((suffix) ? "&startDate=" : "?startDate=") + request.startDate;
    }

    if (request.endDate) {
      suffix += ((suffix) ? "&endDate=" : "?endDate=") + request.endDate;
    }

      suffix = request.tableName + "s" + suffix;

    return suffix;
  }

  var service = {
    getCache: function () {
      return codesTables;
    },

    setCache: function (cache) {
      codesTables = cache;
    },

    clearCache: function () {
    codesTables = [];
    },
    
    prime: function (request) {
      if (typeof request === "string") request = { tableName: request };
      if (!(request && request.tableName)) { throw new Error("tableName is mandatory."); }

    return q($.ajax({
      url: serviceName + calculateQueryString(request),
      dataType: 'json',

      success: function (data) {
          service.initTable(request, data);
        return true;
      },

      error: function (jqXHR, textStatus, error) {
        console.log(textStatus + ": " + error);
        return false;
      }
    }));
    },

    primeGeneric: function (subTable) {
      if (!subTable) { throw new Error("subTable is mandatory."); }
      return service.prime({ tableName: "TCTGCDDCD", filters: [{ name: "CD_TYPE_GCDDCD", value: "'" + subTable + "'" }] });
    },

    initTable: function (request, response) {
      var columns = response.columns, rows = response.rows,
          numericCols = [], ci, c, ri, r, d, columnMap = {};

      for (ci = 0; ci < columns.length; ci++) {
        c = columns[ci];
        if (c.type === "DECIMAL" || c.type === "INTEGER") {
          numericCols.push(ci);
        } else if (c.name === "DT_EFFECT") {
          response.startDateColumn = ci;
        } else if (c.name === "DT_END") {
          response.endDateColumn = ci;
        }
        columnMap[c.name] = ci;
      }
      response.columnMap = columnMap;

      if (numericCols.length > 0) {
        for (ri = 0; ri < rows.length; ri++) {
          r = rows[ri];
          for (ci = 0; ci < numericCols.length; ci++) {
            d = numericCols[ci];
            r[d] = +r[d];
          }
        }
      }

      codesTables[calculateFullCacheKey(request)] = response;
    },

    get: function (request) {
      if (typeof request === "string") request = { tableName: request };
      if (!(request && request.tableName)) { throw new Error("tableName is mandatory."); }
      var ct = codesTables[calculateFullCacheKey(request)] ||
               codesTables[calculateFilteredCacheKey(request)] ||
               codesTables[calculateTableCacheKey(request)],
          fi, f, ci, ri, r,
          tableName = request.tableName, columnMap,
          filters = request.filters, numericFilters = [], stringFilters = [],
          response, originalRows, filteredRows, applyDateFilter;

      if (ct === undefined) {
        throw new Error("Codes table '" + tableName + "' not primed with cache key less specific then '" + calculateFullCacheKey(request) + "'.");
      }

      columnMap = ct.columnMap;

      if (filters && filters.length) {
        for (fi = 0; fi < filters.length; fi++) {
          f = filters[fi];
          ci = columnMap[f.name];
          if (ci === undefined) {
            throw new Error("Filter column '" + f.name + "' does not exist in the '" + tableName + "' codes table.");
          }
          if (typeof f.value === "string" && f.value.charAt(0) === "'") {
            stringFilters.push([ci, f.value.substr(1, f.value.length - 2)]);
          } else {
            numericFilters.push([ci, +f.value]);
          }
        }
      } else if (!(request.startDate && request.endDate)) return ct; // should maybe return a clone?

      response = { name: tableName, columns: ct.columns, columnMap: columnMap, rows: [] };
      filteredRows = response.rows;
      originalRows = ct.rows;
      applyDateFilter = (ct.startDateColumn !== undefined && ct.endDateColumn !== undefined &&
        request.startDate && request.endDate);

      rowLoop:
      for (ri = 0; ri < originalRows.length; ri++) {
        r = originalRows[ri];

        // apply string filters
        for (fi = 0; fi < stringFilters.length; fi++) {
          f = stringFilters[fi];
          if (r[f[0]] !== f[1]) continue rowLoop;
        }
        // apply numeric filters
        for (fi = 0; fi < numericFilters.length; fi++) {
          f = numericFilters[fi];
          if (r[f[0]] !== f[1]) continue rowLoop;
        }
          // apply date filter
        if (applyDateFilter && (
          request.startDate < r[ct.startDateColumn] ||
          request.endDate > r[ct.endDateColumn])) continue rowLoop;

        filteredRows.push(r);
      }

    return response;
    },
    
    getGeneric: function (subTable) {
      if (!subTable) { throw new Error("subTable is mandatory."); }
      return service.get({ tableName: "TCTGCDDCD", filters: [{ name: "CD_TYPE_GCDDCD", value: "'" + subTable + "'" }] });
    }
  };
  return service;
});
