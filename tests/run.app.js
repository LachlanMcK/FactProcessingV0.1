//I used this file to be able to run tests in debug mode.
//I just stripped app.test.js down to the test that is giving me a problem 
//the run with ...forms/tests/run.app.js
const request = require('supertest');

require('dotenv').config({ path: '../.env' });
var app = require('../app');

var th = require('./testingHelpers')

function expect(condition){
  console.log("Actual: " + condition);
  return {toBe: (expected) => console.log("Expected: " + expected),
          toBeTruthy: () => console.log("Expected: to be true" ),
          toEqual: (expected) => console.log("Expected: " + expected)
  }
}

// *****************************************************************************
// built own expect function to make checking form details easier
// *****************************************************************************

// *****************************************************************************
// Get Tests
// *****************************************************************************


  // *****************************************************************************
// JSRE Tests
// *****************************************************************************


  const longURI =  "/api/v1/Clients/ABN/1234567890/Accounts/1/Roles/IT/Forms/10131Form/111222333";
  function jsreDummyform() {
    let f = require("../jsre/forms/oTH_PAYROLL_EVENT_CHILDForm.js");
    expect(f.id).toBe(10131);
    expect(f.sections.length).toBe(27);
    expect(f.validateRules.length).toBe(88);
    //expect(f.validateBusinessRules.length).toBe(88);
    expect(f.updateRules.length).toBe(6); 

    let re = require("../loadRulesEngineWithPatches");
    expect(re.name).toBe("RulesEngine");

    var stp = require('../jsre/forms/oTH_PAYROLL_EVENT_CHILDValidate');
    expect(stp.name).toBe("executeRules"); //not what you'd expect,is it!
    
    //LM fudge assumed globals until get the windows dependency removed
    const { addMissingBrowserStuff } = require("../addMissingBrowserStuff");
    addMissingBrowserStuff();
    expect(console.group).toBeTruthy();   

    function ViewModel() {}
    let vm = new ViewModel();
    
    var th = require('./testingHelpers')
    vm = th.standardHeader({});
    vm = th.standardPayrollEventChild(vm,{});  //I didn't notice the provided sample form until after I did this.
    
    //LM interesting to note that no fields are required! ruleEngine.js lines 50 
    //LM there is a bug in rulesEngine.js line 163, it is trying to do a reduce over an object, not an array, hence not passing anything to GenVal.validate()!
    f[10956].validateRules[5].rule=function(e){e.set(e.li(11128, 26142), 110);}
    //LM It is dodgy that these form rules are using "Lookup" on TF2Forms.
    //LM but we'll have access to the lodged STP forms, I guess there is no reason not to do it.
    //LM for the moment I'm just fudging it by returning '0' which I'm guessing means not found.
    f[60088].validateRules[1].rule=function(e){e.set(e.li(60088, 19537), '0');}

    //LM crashing in FdfValueOf - although current date is recorded as a string, it is trying to get it as a numeric - line 52
    //LM ...looking at constructor, if string this._numericValue = null; but here in FdfValueOf if numericValue is null it still calls getNumeric???
    FdfValue = require("../jsre/fdfValue");
    FdfValue.prototype.oldValueOfFunc = FdfValue.prototype.valueOf;
    FdfValue.prototype.valueOf = function () {
            return (this.type == "ALPHA") ? this._value: this.oldValueOfFunc();
        };
    
    expect(FdfValue.name).toBe("FdfValue");

    return vm;
  }
  


    var stp = require('../jsre/forms/oTH_PAYROLL_EVENT_CHILDValidate');
    const vm = jsreDummyform();
    expect(vm.formYear).toBe("2019");
    const x =  vm.oTH_WAGE_AND_TAX_ITEM_PaymentSummaryTotalGrossPaymentAmount();
    expect(x).toBe(30000.3);

    let postData = {};
    stp.mapVMToLI(vm, postData);
    console.log("***************************************************");
    console.log(JSON.stringify(postData));
    console.log("***************************************************");
    expect(postData[10936][26716]._value).toBe("30000.3");
    
    return request(app).put(longURI)
    .set('Accept', 'application/json')
    .send(postData)
    .then(response => {
        
        if (response.body.createdAt == response.body.updatedAt) 
          expect(response.statusCode).toEqual(201);
        else
          expect(response.statusCode).toEqual(200);
        
    });
  
