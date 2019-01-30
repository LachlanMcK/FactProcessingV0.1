//LM sadly I had to include: 
//if (typeof define !== 'function') { var define = require('amdefine')(module) }
//flavour2 - no name, but with dependencies

// function define( depNames,mod) {

//     let deps = []
//     for (let i = 0; i < depNames.length; i++){
//       deps.push(require(depNames[i]));
//     }
    
//     const thisModule= mod.apply("", deps);
//     module.exports = thisModule;
// }

function define() { module.exports = require("./dependenciesMap").apply(this, arguments); }

define(["moment-timezone"], function (moment) {
    moment.tz.add({
        "zones": {
            "Australia/Sydney": [
                "10:4:52 - LMT 1895_1 10:4:52",
                "10 Aus EST 1971 10",
                "10 AN EST"
            ]
        },
        "rules": {
            "Aus": [
                "1917 1917 0 1 7 0:1 0 1",
                "1917 1917 2 25 7 2 0 0",
                "1942 1942 0 1 7 2 0 1",
                "1942 1942 2 29 7 2 0 0",
                "1942 1942 8 27 7 2 0 1",
                "1943 1944 2 0 8 2 0 0",
                "1943 1943 9 3 7 2 0 1"
            ],
            "AN": [
                "1971 1985 9 0 8 2 2 1",
                "1972 1972 1 27 7 2 2 0",
                "1973 1981 2 1 0 2 2 0",
                "1982 1982 3 1 0 2 2 0",
                "1983 1985 2 1 0 2 2 0",
                "1986 1989 2 15 0 2 2 0",
                "1986 1986 9 19 7 2 2 1",
                "1987 1999 9 0 8 2 2 1",
                "1990 1995 2 1 0 2 2 0",
                "1996 2005 2 0 8 2 2 0",
                "2000 2000 7 0 8 2 2 1",
                "2001 2007 9 0 8 2 2 1",
                "2006 2006 3 1 0 2 2 0",
                "2007 2007 2 0 8 2 2 0",
                "2008 9999 3 1 0 2 2 0",
                "2008 9999 9 1 0 2 2 1"
            ]
        },
        "links": {}
    });
});
