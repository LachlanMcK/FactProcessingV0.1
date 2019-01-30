const request = require('supertest');
require('dotenv').config({ path: './.env' });

var app = require('../app');
var th = require('./testingHelpers')


// *****************************************************************************
// built own expect function to make checking form details easier
// *****************************************************************************
expect.extend({
  sameForm(received, expected, ignoreList) {
    const pass = th.mySimpleyObjectCompare(received, expected, (ignoreList || []));
    if (pass == true) {
      return {
        message: () =>
          `expected ${JSON.stringify(received)} passed test  ${JSON.stringify(expected)}, ${pass}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `failed because: \n${pass} \nreceived object is:\n${JSON.stringify(received)} \nexpected object is:\n${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  },
});

// *****************************************************************************
// todo: refactor stuff into before/after
// *****************************************************************************
beforeAll(() => {
  console.log("hi");
  process.env.NODE_ENV = "test";
});

afterAll(() => {

});

// *****************************************************************************
// Get Tests
// *****************************************************************************
describe("GET tests", () => { //return;//
  const ignoreList = ["_id", "__v", "createdAt", "updatedAt", "DT_Update", "TM_Update"];
  const testURI = "/api/v1/Clients/All/Forms";
  const clientFormURI = "/api/v1/Clients/ABN/1234567890/Forms/myFT6Form";
  const longURI =  "/api/v1/Clients/ABN/1234567890/Accounts/1/Roles/IT/Forms/myFT6Form/5432101";
  const notFoundURI =  "/api/v1/Clients/ABN/1234567890/Accounts/2/Roles/IT/Forms/myFT6Form/5432101";
  
  let mongoId ="";
  
  // there is no practial reason to list all.  Just doing 'because I can'
  test("Get 1 - List all " + testURI + " Should return 200 OK", () => {
    return request(app).get(testURI)
    .then(response => {
      expect(response.statusCode).toBe(200);
      expect(response.body[0].ClientInternalId).toEqual(12345);
      expect(response.body.length).toEqual(7);
    })
  });
  
  test("Get 2 - List " + clientFormURI + "Should return 200 OK", () => {
    return request(app).get(clientFormURI)
    .then(response => {
      expect(response.statusCode).toBe(200);
      expect(response.body[0].ClientInternalId).toEqual(12345);
      expect(response.body.length).toBeGreaterThan(0);
      //verify all item returned have a ClientInternalId property with value 12345
      expect(response.body.reduce( (total,item) => total += (item.ClientInternalId == 12345 ) ? 1:0 , 0 ) ).toEqual(response.body.length);
    })
  });
  
  test("Get 3 - List " + longURI + "Should return 200 OK", () => {
    return request(app).get(longURI)
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toEqual(1);
      //verify all item returned have a ClientInternalId property with value 12345, account = 1 & role = 5
      expect(response.body.reduce( (total,item) => total += (item.ClientInternalId == 12345 ) ? 1:0 , 0 ) ).toEqual(response.body.length);
      expect(response.body.reduce( (total,item) => total += (item.AccountSequenceNumber == 1 ) ? 1:0 , 0 ) ).toEqual(response.body.length);
      expect(response.body.reduce( (total,item) => total += (item.RoleTypeCode == 5 ) ? 1:0 , 0 ) ).toEqual(response.body.length);
  });
  
    test("Get 4 - List " + longURI + "0" + "Should return 404 OK", () => {
    return request(app).get(longURI + "0")
      expect(response.statusCode).toBe(404);
      expect(response.body.length).toEqual(0);
  });
  
    test("Get 5 - List " + notFoundURI + "Should return 404 OK", () => {
    return request(app).get(longURI + "0")
      expect(response.statusCode).toBe(404);
      expect(response.body.length).toEqual(0);
  });
  
});

describe("PUT tests ", () => { //return;//
    const ignoreList = ["_id", "__v", "createdAt", "updatedAt", "DT_Update", "TM_Update"];
    const shortURI = "/api/v1/Clients/ABN/1234567890/Forms/myFT6Form/5432101";
    const longURI =  "/api/v1/Clients/ABN/1234567890/Accounts/1/Roles/IT/Forms/myFT6Form/5432101";
    const secretURI = "/api/v1/Clients/ABN/1234567890/Forms/myFT6Form/_id/"; //e.g 5c410abc35f35809ad24ba1b"
    let mongoId ="";

    test("Put 1 - Delete form " + shortURI + " result not checked as just cleanup" , ()=> {

        return request(app).delete(shortURI)
        .then(response => {
          expect(response.statusCode).toEqual(200);
        });
    });

    test("Put 2 - GET " + longURI + " should return 404", ()=> {

        let postData = th.standardForm({TransactionId:5432101});
        
        return request(app).get(longURI)
        .then(response => {
            expect(response.statusCode).toEqual(404);
        });
        
    });

   test("Put 3 - Delete form "  + shortURI + " should return 404", ()=> {

        return request(app).delete(shortURI)
        .then(response => {
          expect(response.statusCode).toEqual(404);
        });
    });

    test("Put 4 - Adding a new FORM with PUT " + longURI + " should return 201", ()=> {

        let postData = th.standardForm({TransactionId:5432101});
        
        return request(app).put(longURI)
        .set('Accept', 'application/json')
        .send(postData)
        .then(response => {
            
            if (response.body.createdAt == response.body.updatedAt) 
                expect(response.statusCode).toEqual(201);
            else
                expect(response.statusCode).toEqual(200);
            
            const lessThanOneMinuteAgo = (new Date() - new Date(response.body.updatedAt)) < 60000;
            expect(lessThanOneMinuteAgo).toEqual(true);

            postData.TransactionId = 5432101;
            postData.ClientInternalId = 12345;
            delete postData.ClientIdentifierType;
            delete postData.ClientIdentifierValue;
            postData.RoleTypeCode = 5;
            postData.FormType = "myFT6";
            
            expect(response.body).sameForm(postData, ignoreList);
            mongoId = response.body._id;
        });
        
    });
    
    test("Put 5 - Updating existing Form with PUT " + longURI + " should return 200", ()=> {

        let postData = th.standardForm({TransactionId:5432101});
        
        return request(app).put(longURI)
        .set('Accept', 'application/json')
        .send(postData)
        .then(response => {
            
            if (response.body.createdAt == response.body.updatedAt) 
                expect(response.statusCode).toEqual(201);
            else
                expect(response.statusCode).toEqual(200);
            
            const lessThanOneMinuteAgo = (new Date() - new Date(response.body.updatedAt)) < 60000;
            expect(lessThanOneMinuteAgo).toEqual(true);

            postData.TransactionId = 5432101;
            postData.ClientInternalId = 12345;
            delete postData.ClientIdentifierType;
            delete postData.ClientIdentifierValue;
            postData.RoleTypeCode = 5;
            postData.FormType = "myFT6";
            //postData.PeriodStartDt = "2019-01-01T00:00:00.000Z"
            
            expect(response.body).sameForm(postData, ignoreList);
        });
        
    })
    
    test("Put 6 - Updating existing Form with " + secretURI + mongoId + ", should return 200", ()=> {

        let postData = th.standardForm({});
        delete postData.TransactionId;
        
        return request(app).put(secretURI + mongoId)
        .set('Accept', 'application/json')
        .send(postData)
        .then(response => {
            
            if (response.body.createdAt == response.body.updatedAt) 
                expect(response.statusCode).toEqual(201);
            else
                expect(response.statusCode).toEqual(200);
            
            const lessThanOneMinuteAgo = (new Date() - new Date(response.body.updatedAt)) < 60000;
            expect(lessThanOneMinuteAgo).toEqual(true);

            postData.TransactionId = 5;
            postData.ClientInternalId = 12345;
            delete postData.ClientIdentifierType;
            delete postData.ClientIdentifierValue;
            delete postData.RoleTypeCode;
            postData.FormType = "myFT6";

            expect(response.body).sameForm(postData, ignoreList);
        });
        
    })
    
        
    test("Put 7 - Updating failing optomistic locking " + longURI + ", should return 200", ()=> {
      // this test also checks unique index constraint on Transaction_Id
    
        let postData = th.standardForm({TransactionId:5432101, DT_Update: "2019-01-01"});
        
        return request(app).put(longURI)
        .set('Accept', 'application/json')
        .send(postData)
        .then(response => {
            expect(response.statusCode).toEqual(500);
            expect(response.text.slice(-38)).toEqual("TransactionId_1 dup key: { : 5432101 }");

        });
        
    })

  })

  // *****************************************************************************
// JSRE Tests
// *****************************************************************************
const stpTests = describe("STP tests", () => {

  const longURI =  "/api/v1/Clients/ABN/1234567890/Accounts/1/Roles/IT/Forms/10131Form/111222333";
  const ignoreList = ["_id", "__v", "createdAt", "updatedAt", "DT_Update", "TM_Update", "Sections"];
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
  // just test if can load form & rules engine
  test("STP 1 - STP Form loads", () => { //return;//
    var stp = require('../jsre/forms/oTH_PAYROLL_EVENT_CHILDValidate');
    const vm = jsreDummyform();
    expect(vm.formYear).toBe("2019");
    expect(vm.oTH_WAGE_AND_TAX_ITEM_PaymentSummaryTotalGrossPaymentAmount()).toBe(30000.3);
    const result = stp(vm);
    const didItWork = result.errors.length == 0;
    expect(didItWork).toBe(true);
    expect(result.formLineItems[10936][26716]._value).toBe("30000.3");
    //todo: add other expect statments around stored line items, but that'd mean I'd have to understand the business rules.
  });
  
  test("STP 2 - Adding a new FORM with PUT " + longURI + " should return 201", ()=> {

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
      
        expect(response.body).toEqual("rubbish");
        if (response.body.createdAt == response.body.updatedAt) 
          expect(response.statusCode).toEqual(201);
        else
          expect(response.statusCode).toEqual(200);
        
        const lessThanOneMinuteAgo = (new Date() - new Date(response.body.updatedAt)) < 60000;
        expect(lessThanOneMinuteAgo).toEqual(true);

        postData.TransactionId = 5432101;
        postData.ClientInternalId = 12345;
        delete postData.ClientIdentifierType;
        delete postData.ClientIdentifierValue;
        postData.RoleTypeCode = 5;
        postData.FormType = "10131";
        
        expect(response.body).sameForm(postData, ignoreList);
        mongoId = response.body._id;
    });
  });
});
