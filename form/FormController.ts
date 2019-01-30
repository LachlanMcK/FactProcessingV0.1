import * as express from 'express';
console.log('Inside FormController');
export var router = express.Router();
import * as bodyParser from 'body-parser';
import * as mongoose from 'mongoose';

import { formQueryType, turnURLStemsIntoLookupObject } from './FormURL2Query';

import {Form, setFootprintProperties} from './Form';

// *****************************************************************************
// invoke middleware functions - express ceremony
// *****************************************************************************
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.use(function (req: any, res: any, next: any) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

router.use(function(req:any, res: any, next: any) {
    next();
})

// *****************************************************************************
// register the routes offered in this controller
// *****************************************************************************
// I tried to hide  the messsiness of setting up Form Routes in ./setupformroutes
// getForms & putForms are the functions that will be called respectively
// but I found different behaviour between registering the route here on in the submodule.
import * as FormRoutes from './SetUpFormRoutes';
import { networkInterfaces } from 'os';
FormRoutes.setUpGetRoutes(router,getForms, putForm);


var putMiddleware = [put_ExtractURLStemInfo, put_SetFootprintProps, put_JSREValidationRules, put_EncryptSensitiveData]

FormRoutes.formRoutes.forEach((r) => {
     router.get(r, getForms);
     //router.put(r, putForm);
     router.put(r, putMiddleware, putForm);
     router.put(r, /* putMoreMiddleware, */ putApplyUpdateRules); 
 });

// a couple extras
 router.get('/All/Forms', getAllFormsTestingUseOnly);
 router.put('/:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung/_id/:_id', putMiddleware, putForm);
 router.put('/:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung/_id/:_id', putApplyUpdateRules);
 router.delete('/:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung/_id/:_id', deleteForm);
 router.delete('/:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung/:TransactionId', deleteForm);
 // note carefully the absence of Post.  I can't see the use case for it; 
 // but this implies consumers must allocate BET numbers for new forms 
 // (nothing wrong with that - as long as they follow our rules);
 // but perhaps I don't understand some of the DraftForm usecases.
 // anyway, not available yet - code below not tested
 // router.post('/:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung', createForm);

// *****************************************************************************
// Get Methods
// *****************************************************************************
// RETURNS ALL THE FORMS IN THE DATABASE
function getAllFormsTestingUseOnly (req: any, res: any) {
    console.log('Inside FormController.js');
    Form.find({}, function (err: mongoose.Error, forms: mongoose.Document[]) {
        console.log('Find call back received with: ' + forms.length + ' forms');
        if (err) return res.status(500).send("There was a problem finding the forms.");
        console.log(forms);
        res.status(200).send(forms);
    });
};

// RETURNS ALL THE FORMS IN THE DATABASE THAT MATCH THE URL
export function getForms(req: express.Request, res: express.Response, next: express.NextFunction) {
    const lookup: formQueryType = turnURLStemsIntoLookupObject(req, next);

    Form.find(lookup, function (err: any, form: any) {
        if (err) return res.status(500).send("There was a problem finding the form." + err);
        if (!form) return res.status(404).send("No form found.!!");

            //todo: restify the response
            //todo: decrypt line items

        if ((form|| []).length == 0 ) return res.status(404).send("No form found.");
        else res.status(200).send(form);  
    }); 
};

function put_ExtractURLStemInfo(req: express.Request, res: express.Response, next:express.NextFunction) {
    console.log('Put originalUrl :', req.originalUrl)
    req.params.lookup = <formQueryType> turnURLStemsIntoLookupObject(req, next);
    next()
} 

function put_SetFootprintProps(req: express.Request, res: express.Response, next:express.NextFunction) {
    //this will blot out any inconsitent properties in the payload (extra fields will be removed by mongoose schema check)
    let newBody = {...req.body, ...req.params.lookup};
    req.body = setFootprintProperties(newBody);

    if (!req.body.DT_Update) throw new Error("missing footprint property.");
    console.log(`Updated body for update ${JSON.stringify(req.body)}`);

    next()
}

function put_JSREValidationRules(req: express.Request, res: express.Response, next:express.NextFunction) {
    
    if (req.body.FormType  == 10131) {
        let stpLineItems = req.body;
        let formMetaData = require("../jsre/forms/oTH_PAYROLL_EVENT_CHILDForm.js");
        let RulesEngine = require("../jsre/rulesEngine");
        let LineItem = require("../jsre/lineItem");
        
        //stpLineItems[10933][16585] = new LineItem(formMetaData[10933][16585], stpLineItems[10933][16585]._value);
        
        // this is stupid, isn't.  For some reason my line items lost their prototype methods.  If you know why, please give me a call and tell me. x63821.
        // I'm guessing it is becasue it was serialised and desearalised (without methods)
        Object.keys(stpLineItems).forEach(function (sId) {
            if ( typeof(stpLineItems[sId]) == "object") { // not (typeof stpLineItems[sId] === "string" || typeof stpLineItems[sId] === "number" || stpLineItems[sId] === null) 
                Object.keys(stpLineItems[sId]).forEach( function (fId){
                    
                    let v = (stpLineItems[sId][fId].field.repeating) ? stpLineItems[sId][fId]._values : stpLineItems[sId][fId]._value;
                    stpLineItems[sId][fId] = new LineItem(formMetaData[sId][fId], v)  ;  
                })
            }
        });

        var re = new RulesEngine(formMetaData, stpLineItems, "validate");
        console.log("+++++++++++ about to call JSRE ++++++++++++++++");
        re.run();
        if (re.errors.length !== 0) 
            res.status(500).send({FailureMessage: "Failed validation rules with " + re.errors.length +  "found",
                                  error: re.errors});

        console.log("+++++++++++ passed validation by  JSRE ++++++++++++++++");
        
        // put known secions/fields into sections & LineItem arrays so can use defined schema in mongoose.
        stpLineItems.Sections = [];
        for (let i = 0; i < formMetaData.sections.length; i++){
            let thisSecId = formMetaData.sections[i].id;
            if (stpLineItems[thisSecId]) {
                let newLineItems =[];
                for (let j = 0; j < (formMetaData.sections[i].fields || []).length; j++) {
                    let thisFieldId = formMetaData.sections[i].fields[j].id;
                    if (stpLineItems[thisSecId][thisFieldId]) {
                        const newLI = {
                            FieldId: thisFieldId,
                            FieldIndex:  stpLineItems[thisSecId][thisFieldId].index,
                            Value:  stpLineItems[thisSecId][thisFieldId]._value

                        }
                        newLineItems.push(newLI);
                    }
                }
                
                let newSection ={SectionId: formMetaData.sections[i].id, LineItems: newLineItems};
                stpLineItems.Sections.push(newSection);
                stpLineItems[thisSecId]=null;
            }
        }
        
        //todo: work out if this form will require update rules.  If it doesn't, set the processing status to "Done", otherwise set the processing status to "Pending Update Rules".
        stpLineItems.ProcessingStatusCd = 1;
        
        res.locals.stpForm = stpLineItems;
    };
        
    next();
}

function put_EncryptSensitiveData(req: express.Request, res: express.Response, next:express.NextFunction) {
    //todo: selectively encrypt line items
    next()
}

// Upserts the form specified in the url into the database
export function putForm(req: express.Request, res: express.Response, next:express.NextFunction) {
    console.log("+++++++++++ about to talk to Mongo ++++++++++++++++");
    Form.findOneAndUpdate(req.params.lookup, req.body, { upsert:true, new: true}, function (err: any, form: any) {
        if (err) return res.status(500).send("There was a problem finding the form." + err);
        console.log("+++++++++++ no errors from Mongo ++++++++++++++++");
        res.locals.status =  (form && form._doc.createdAt.getTime() == form._doc.updatedAt.getTime()) ?  201: 200;
        res.locals.data = (form) ? form : "No form found, will try to add it.";
            
        next();
    });
};

// Upserts the form specified in the url into the database
export function putApplyUpdateRules(req: express.Request, res: express.Response, next:express.NextFunction) {

    console.log("+++++++++++ about to do update rules ++++++++++++++++");
    //todo: apply form update rules
    
    if (req.body.FormType  == 10131) {
        //todo: update mongo to record in status field that update rules now applied
        res.locals.data._do.ProcessingStatusCd = 2;
    }
    
    //todo: restify the response
    //todo: decrypt line items 

    let form = res.locals.data._doc;
    if (req.body.FormType  == 10131) {
        
        // put known secions/fields into sections & LineItem arrays so can use defined schema in mongoose.
        
        for (let i = 0; i < form.Sections.length; i++){
            let thisSecId = form.Sections[i].SectionId;
            form[thisSecId] = {};
            
            for (let j = 0; j < form.Sections[i].LineItems.length; j++) {
                let thisFieldId = form.Sections[i].LineItems[j].FieldId;
                form[thisSecId][thisFieldId] = {
                    index : form.Sections[i].LineItems[j].FieldIndex,
                    _value : form.Sections[i].LineItems[j].Value
                }
            }
        }
        //delete stpForm.Sections;
        
    }
    console.log("+++++++++++ all done here ++++++++++++++++");
    res.status(res.locals.status).send(form);
};

// Deletes the form specified in the url from the database
export function deleteForm(req: express.Request, res: express.Response, next:express.NextFunction) {
    const lookup: formQueryType = turnURLStemsIntoLookupObject(req, next);

    Form.findOneAndRemove(lookup,function(err:any, form:any) {
        if (err) return res.status(500).send("There was a problem finding the form." + err);
        if (!form) return res.status(404).send(`Form not found - for delete operation with keys: ${JSON.stringify(lookup)}`);
        else res.status(200).send(`Form deleted - with keys ${JSON.stringify(lookup)}`);
    });
};

// // UPDATES A SINGLE FORM - THIS SHOULD NEVER BE USED (OUTSIDE OF TESTING) BECAUSE NOONE WILL KNOW THE _ID
// router.put('/Forms/:id', putFormWithId);

// function putFormWithId (req:express.Request, res:express.Response) {
//     console.log(req.body);
//     const nextx = () => {};
//     const lookup: formQueryType = turnURLStemsIntoLookupObject(req, nextx);
//     console.log(`Posted body for update ${JSON.stringify(req.body)}`);
    
//     let newBody = setFootprintProperties(req.body,true);
//     console.log("About to apply update to: " + req.params._id + " with body " + JSON.stringify(newBody));
    
//     Form.findByIdAndUpdate(req.params._id, newBody, {upsert:false, new: true}, function (err: any, form: any) {
//     if (err) return res.status(500).send("There was a problem updating the form.");
//         res.status(200).send(form);
//     });  
// }; 

// CREATES A NEW FORM - don't think we need this!!  Just means the consumer must supply a valid bet# and call put
export function createForm(req: any, res: any) {
    console.log('Inside post');
    console.log('req.body: ' + req.body);

    //todo: if this is not thrown away:
    //todo: - ensure uri info matched against header, 
    //todo: - setup footprint info
    //todo: - selectively encrypt line items
    //todo: - call jsre validation rules


    Form.create(req.body,
        function (err: mongoose.Error, form: mongoose.Model<mongoose.Document> ) {
            console.log('post call back received');
            if (err) return res.status(500).send("There was a problem adding the information to the database.\n" + err.message );

            //todo: apply form update rules
            //todo: restify the response
            //todo: decrypt line items 

            res.status(200).send(form);
        });
};



export function codeLookup(decode:String): number{
    //todo: dummy
    if(decode == "IT") return 5;
    if(decode == "GST") return 10;
    if(decode == "STP") return 66;
    return -1;
}

export function externalIdLookup(ClientIdentifierType:"ABN" | "TFN" | "WPN", ClientIdentifierValue: string): formQueryType {
    //todo: write function
    return {ClientInternalId:12345};
}

module.exports = router;