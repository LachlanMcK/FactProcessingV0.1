const dependenciesMap = {
    
    "bignumber":"../Scripts/bignumber", 
    "services/refData/refDataService": "./refData/refDataService",
    "services/RefData/v1/ClientJSRE": "../services/RefData/v1/ClientJSRE", 
    
    "services/jsre/externalFunctions/iccr1535": "./jsre/externalFunctions/iccr1535",
    "services/jsre/externalFunctions/iccr1555": "./jsre/externalFunctions/iccr1555",    
    "services/jsre/externalFunctions/iccr1601": "./jsre/externalFunctions/iccr1601",
    "services/jsre/externalFunctions/iccr1611": "./jsre/externalFunctions/iccr1611",

    "../extFunction": "./jsre/extFunction",
    "../extFunctionReturnValue": "./jsre/extFunctionReturnValue", 
    "./fatalError": "./jsre/fatalError", 
    "../fatalError": "./jsre/fatalError", 
    "./fatalErrorNumber": "./jsre/fatalErrorNumber",
    "../fatalErrorNumber": "./jsre/fatalErrorNumber",
    "./fdfError": "./jsre/fdfError",
    "./fdfType": "./jsre/fdfType",
    "../fdfType": "./jsre/fdfType",
    "services/jsre/fdfType" : "./jsre/fdfType",
    "./fdfValue": "./jsre/fdfValue",
    "../fdfValue": "./jsre/fdfValue",
    "services/jsre/fdfValue": "./jsre/fdfValue",
    "./fieldType": "./jsre/fieldType",
    "../fieldType": "./jsre/fieldType",
    "services/jsre/fieldType": "./jsre/fieldType", 
    "./genVal": "./jsre/genVal",
    "./headerDetails": "./jsre/headerDetails",
    "./ioType": "./jsre/ioType",
    "../ioType": "./jsre/ioType",
    "./limits": "./jsre/limits",
    "../limits": "./jsre/limits", 
    "services/jsre/limits": "./jsre/limits",
    "./lineItem": "./jsre/lineItem",
    "services/jsre/lineItem": "./jsre/lineItem", 
    "./paramType": "./jsre/paramType",
    "../paramType": "./jsre/paramType",
    "services/jsre/rulesEngine": "./jsre/rulesEngine",

    "./shims": "./jsre/shims",
    "./validateId": "./jsre/validateId",
    "q": "./refData/q",
    "jquery": "./refData/jquery",
  
    "moment-timezone-data":"./moment-timezone-data",    
    "moment-timezone": "moment-timezone",
    
    "./oTH_PAYROLL_EVENT_CHILDMapping": "./jsre/forms/oTH_PAYROLL_EVENT_CHILDMapping",
    "./oTH_PAYROLL_EVENT_CHILDForm": "./jsre/forms/oTH_PAYROLL_EVENT_CHILDForm"
}

// the following doesn't work - the mod doesn't get exported.  even if I do module.exports = mod;
// it would be nice if it could work as then wouldn't have to make any changes any lines to supplied JSRE code
// at the moment I have to put this into every module: function define() { module.exports = require("../dependenciesMap").apply(this, arguments); }

// this doesn't work
// define = function() { module.exports = def(arguments[0], arguments[1], arguments[2])};
// const def =function () { module.exports = reDefine.apply(this, arguments); }
  
const reDefine = function(modName, depNames, mod) {
    let deps = [];
    let thisModule;
    let myName = module.filename.slice(__filename.lastIndexOf("\\")+1, module.filename.length -3);
    console.log('Loading module:'+ myName);
    
    function doDependencies(depNames){
        for (let i = 0; i < depNames.length; i++){
            let d = dependenciesMap[depNames[i]] || depNames[i];
            console.log(myName + " is loading dependency " + depNames[i] + " from " + d);
            const dp = require(d);
            deps.push(dp);
        }
        return deps;
    }

    if (typeof modName == 'string' && depNames.constructor === Array && typeof mod === "function" ) {
        deps = doDependencies(depNames);
        thisModule= mod.apply(mod, deps);  //was modName
    } else if ( modName.constructor === Array && typeof depNames === "function" ) {
        deps = doDependencies(modName);         //no modName, so modName is instead of depNames
        thisModule= depNames.apply(depNames, deps);   //no modName, so depNames is instead of mod
    } else if ( typeof modName === "function" ) {
        thisModule= modName.apply(modName);
    } else
        throw new Error("somethings wrong with define statement");
    
    return thisModule;
}

//module.exports = dependenciesMap;
module.exports = reDefine;
