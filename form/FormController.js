"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
console.log('Inside FormController');
exports.router = express.Router();
const bodyParser = __importStar(require("body-parser"));
const FormURL2Query_1 = require("./FormURL2Query");
const Form_1 = require("./Form");
// *****************************************************************************
// invoke middleware functions - express ceremony
// *****************************************************************************
exports.router.use(bodyParser.json());
exports.router.use(bodyParser.urlencoded({ extended: true }));
exports.router.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
exports.router.use(function (req, res, next) {
    next();
});
// *****************************************************************************
// register the routes offered in this controller
// *****************************************************************************
// I tried to hide  the messsiness of setting up Form Routes in ./setupformroutes
// getForms & putForms are the functions that will be called respectively
// but I found different behaviour between registering the route here on in the submodule.
const FormRoutes = __importStar(require("./SetUpFormRoutes"));
FormRoutes.setUpGetRoutes(exports.router, getForms, putForm);
var putMiddleware = [put_ExtractURLStemInfo, put_SetFootprintProps, put_JSREValidationRules, put_EncryptSensitiveData];
FormRoutes.formRoutes.forEach((r) => {
    exports.router.get(r, getForms);
    //router.put(r, putForm);
    exports.router.put(r, putMiddleware, putForm);
    exports.router.put(r, /* putMoreMiddleware, */ putApplyUpdateRules);
});
// a couple extras
exports.router.get('/All/Forms', getAllFormsTestingUseOnly);
exports.router.put('/:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung/_id/:_id', putMiddleware, putForm);
exports.router.put('/:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung/_id/:_id', putApplyUpdateRules);
exports.router.delete('/:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung/_id/:_id', deleteForm);
exports.router.delete('/:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung/:TransactionId', deleteForm);
// note carefully the absence of Post.  I can't see the use case for it; 
// but this implies consumers must allocate BET numbers for new forms 
// (nothing wrong with that - as long as they follow our rules);
// but perhaps I don't understand some of the DraftForm usecases.
// anyway, not available yet - code below not tested
// router.post('/:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung', createForm);
// the current "public" format of a form has each section as a property of the form.
// I couldn't figure out hot to "type" that in mongoose.  So instead forms are stored with 
// an array of Sections.  This function converts the stored format of a form back to the public format.
function transformStorageFormatToPublicFormat(form) {
    for (let i = 0; i < form.Sections.length; i++) {
        let thisSecId = form.Sections[i].SectionId;
        form[thisSecId] = {};
        for (let j = 0; j < form.Sections[i].LineItems.length; j++) {
            let thisFieldId = form.Sections[i].LineItems[j].FieldId;
            form[thisSecId][thisFieldId] = {
                index: form.Sections[i].LineItems[j].FieldIndex,
                _value: form.Sections[i].LineItems[j].Value
            };
        }
    }
    delete form.Sections;
    return form;
}
// *****************************************************************************
// Get Methods
// *****************************************************************************
// RETURNS ALL THE FORMS IN THE DATABASE
function getAllFormsTestingUseOnly(req, res) {
    console.log('Inside FormController.js');
    Form_1.Form.find({}, function (err, forms) {
        console.log('Find call back received with: ' + forms.length + ' forms');
        if (err)
            return res.status(500).send("There was a problem finding the forms.");
        console.log(forms);
        res.status(200).send(forms);
    });
}
;
// RETURNS ALL THE FORMS IN THE DATABASE THAT MATCH THE URL
function getForms(req, res, next) {
    const lookup = FormURL2Query_1.turnURLStemsIntoLookupObject(req, next);
    Form_1.Form.find(lookup, function (err, forms) {
        if (err)
            return res.status(500).send("There was a problem finding the form." + err);
        if (!forms)
            return res.status(404).send("No form found.!!");
        //todo: restify the response
        //todo: decrypt line items
        if ((forms || []).length == 0)
            return res.status(404).send("No form found.");
        let result = [];
        forms.forEach((f) => result.push(transformStorageFormatToPublicFormat(f._doc)));
        res.status(200).send(result);
    });
}
exports.getForms = getForms;
;
function put_ExtractURLStemInfo(req, res, next) {
    console.log('Put originalUrl :', req.originalUrl);
    req.params.lookup = FormURL2Query_1.turnURLStemsIntoLookupObject(req, next);
    next();
}
function put_SetFootprintProps(req, res, next) {
    //this will blot out any inconsitent properties in the payload (extra fields will be removed by mongoose schema check)
    let newBody = Object.assign({}, req.body, req.params.lookup);
    req.body = Form_1.setFootprintProperties(newBody);
    if (!req.body.DT_Update)
        throw new Error("missing footprint property.");
    console.log(`Updated body for update ${JSON.stringify(req.body)}`);
    next();
}
function put_JSREValidationRules(req, res, next) {
    if (req.body.FormType == 10131) {
        let stpLineItems = req.body;
        let formMetaData = require("../jsre/forms/oTH_PAYROLL_EVENT_CHILDForm.js");
        let RulesEngine = require("../jsre/rulesEngine");
        let LineItem = require("../jsre/lineItem");
        //stpLineItems[10933][16585] = new LineItem(formMetaData[10933][16585], stpLineItems[10933][16585]._value);
        // this is stupid, isn't.  For some reason my line items lost their prototype methods.  If you know why, please give me a call and tell me. x63821.
        // I'm guessing it is becasue it was serialised and desearalised (without methods)
        Object.keys(stpLineItems).forEach(function (sId) {
            if (typeof (stpLineItems[sId]) == "object") { // not (typeof stpLineItems[sId] === "string" || typeof stpLineItems[sId] === "number" || stpLineItems[sId] === null) 
                Object.keys(stpLineItems[sId]).forEach(function (fId) {
                    let v = (stpLineItems[sId][fId].field.repeating) ? stpLineItems[sId][fId]._values : stpLineItems[sId][fId]._value;
                    stpLineItems[sId][fId] = new LineItem(formMetaData[sId][fId], v);
                });
            }
        });
        var re = new RulesEngine(formMetaData, stpLineItems, "validate");
        console.log("+++++++++++ about to call JSRE ++++++++++++++++");
        re.run();
        if (re.errors.length !== 0)
            res.status(500).send({ FailureMessage: "Failed validation rules with " + re.errors.length + "found",
                error: re.errors });
        console.log("+++++++++++ passed validation by  JSRE ++++++++++++++++");
        // put known secions/fields into sections & LineItem arrays so can use defined schema in mongoose.
        stpLineItems.Sections = [];
        for (let i = 0; i < formMetaData.sections.length; i++) {
            let thisSecId = formMetaData.sections[i].id;
            if (stpLineItems[thisSecId]) {
                let newLineItems = [];
                for (let j = 0; j < (formMetaData.sections[i].fields || []).length; j++) {
                    let thisFieldId = formMetaData.sections[i].fields[j].id;
                    if (stpLineItems[thisSecId][thisFieldId]) {
                        const newLI = {
                            FieldId: thisFieldId,
                            FieldIndex: stpLineItems[thisSecId][thisFieldId].index,
                            Value: stpLineItems[thisSecId][thisFieldId]._value
                        };
                        newLineItems.push(newLI);
                    }
                }
                let newSection = { SectionId: formMetaData.sections[i].id, LineItems: newLineItems };
                stpLineItems.Sections.push(newSection);
                stpLineItems[thisSecId] = null;
            }
        }
        //todo: work out if this form will require update rules.  If it doesn't, set the processing status to "Done", otherwise set the processing status to "Pending Update Rules".
        stpLineItems.ProcessingStatusCd = 1;
        res.locals.stpForm = stpLineItems;
    }
    ;
    next();
}
function put_EncryptSensitiveData(req, res, next) {
    //todo: selectively encrypt line items
    next();
}
// Upserts the form specified in the url into the database
function putForm(req, res, next) {
    console.log("+++++++++++ about to talk to Mongo ++++++++++++++++");
    Form_1.Form.findOneAndUpdate(req.params.lookup, req.body, { upsert: true, new: true }, function (err, form) {
        if (err)
            return res.status(500).send("There was a problem finding the form." + err);
        console.log("+++++++++++ no errors from Mongo ++++++++++++++++");
        res.locals.status = (form && form._doc.createdAt.getTime() == form._doc.updatedAt.getTime()) ? 201 : 200;
        res.locals.data = (form) ? form : "No form found, will try to add it.";
        next();
    });
}
exports.putForm = putForm;
;
// Upserts the form specified in the url into the database
function putApplyUpdateRules(req, res, next) {
    console.log("+++++++++++ about to do update rules ++++++++++++++++");
    //todo: apply form update rules
    if (req.body.FormType == 10131) {
        //todo: update mongo to record in status field that update rules now applied
        res.locals.stpForm.ProcessingStatusCd = 2;
    }
    //todo: restify the response
    //todo: decrypt line items 
    let form = res.locals.data._doc;
    if (req.body.FormType == 10131) {
        form = transformStorageFormatToPublicFormat(form);
    }
    console.log("+++++++++++ all done here ++++++++++++++++");
    res.status(res.locals.status).send(form);
}
exports.putApplyUpdateRules = putApplyUpdateRules;
;
// Deletes the form specified in the url from the database
function deleteForm(req, res, next) {
    const lookup = FormURL2Query_1.turnURLStemsIntoLookupObject(req, next);
    Form_1.Form.findOneAndRemove(lookup, function (err, form) {
        if (err)
            return res.status(500).send("There was a problem finding the form." + err);
        if (!form)
            return res.status(404).send(`Form not found - for delete operation with keys: ${JSON.stringify(lookup)}`);
        else
            res.status(200).send(`Form deleted - with keys ${JSON.stringify(lookup)}`);
    });
}
exports.deleteForm = deleteForm;
;
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
function createForm(req, res) {
    console.log('Inside post');
    console.log('req.body: ' + req.body);
    //todo: if this is not thrown away:
    //todo: - ensure uri info matched against header, 
    //todo: - setup footprint info
    //todo: - selectively encrypt line items
    //todo: - call jsre validation rules
    Form_1.Form.create(req.body, function (err, form) {
        console.log('post call back received');
        if (err)
            return res.status(500).send("There was a problem adding the information to the database.\n" + err.message);
        //todo: apply form update rules
        //todo: restify the response
        //todo: decrypt line items 
        res.status(200).send(form);
    });
}
exports.createForm = createForm;
;
function codeLookup(decode) {
    //todo: dummy
    if (decode == "IT")
        return 5;
    if (decode == "GST")
        return 10;
    if (decode == "STP")
        return 66;
    return -1;
}
exports.codeLookup = codeLookup;
function externalIdLookup(ClientIdentifierType, ClientIdentifierValue) {
    //todo: write function
    return { ClientInternalId: 12345 };
}
exports.externalIdLookup = externalIdLookup;
module.exports = exports.router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9ybUNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGb3JtQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQzFCLFFBQUEsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNyQyx3REFBMEM7QUFHMUMsbURBQThFO0FBRTlFLGlDQUFvRDtBQUVwRCxnRkFBZ0Y7QUFDaEYsaURBQWlEO0FBQ2pELGdGQUFnRjtBQUNoRixjQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzlCLGNBQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFdEQsY0FBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQVEsRUFBRSxHQUFRLEVBQUUsSUFBUztJQUM5QyxHQUFHLENBQUMsTUFBTSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQy9DLEdBQUcsQ0FBQyxNQUFNLENBQUMsOEJBQThCLEVBQUUsZ0RBQWdELENBQUMsQ0FBQztJQUM3RixJQUFJLEVBQUUsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDO0FBRUgsY0FBTSxDQUFDLEdBQUcsQ0FBQyxVQUFTLEdBQU8sRUFBRSxHQUFRLEVBQUUsSUFBUztJQUM1QyxJQUFJLEVBQUUsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFBO0FBRUYsZ0ZBQWdGO0FBQ2hGLGlEQUFpRDtBQUNqRCxnRkFBZ0Y7QUFDaEYsaUZBQWlGO0FBQ2pGLHlFQUF5RTtBQUN6RSwwRkFBMEY7QUFDMUYsOERBQWdEO0FBRWhELFVBQVUsQ0FBQyxjQUFjLENBQUMsY0FBTSxFQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUdwRCxJ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ZXNzIGZyb20gJ2V4cHJlc3MnO1xuY29uc29sZS5sb2coJ0luc2lkZSBGb3JtQ29udHJvbGxlcicpO1xuZXhwb3J0IHZhciByb3V0ZXIgPSBleHByZXNzLlJvdXRlcigpO1xuaW1wb3J0ICogYXMgYm9keVBhcnNlciBmcm9tICdib2R5LXBhcnNlcic7XG5pbXBvcnQgKiBhcyBtb25nb29zZSBmcm9tICdtb25nb29zZSc7XG5cbmltcG9ydCB7IGZvcm1RdWVyeVR5cGUsIHR1cm5VUkxTdGVtc0ludG9Mb29rdXBPYmplY3QgfSBmcm9tICcuL0Zvcm1VUkwyUXVlcnknO1xuXG5pbXBvcnQge0Zvcm0sIHNldEZvb3RwcmludFByb3BlcnRpZXN9IGZyb20gJy4vRm9ybSc7XG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyBpbnZva2UgbWlkZGxld2FyZSBmdW5jdGlvbnMgLSBleHByZXNzIGNlcmVtb255XG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxucm91dGVyLnVzZShib2R5UGFyc2VyLmpzb24oKSk7XG5yb3V0ZXIudXNlKGJvZHlQYXJzZXIudXJsZW5jb2RlZCh7IGV4dGVuZGVkOiB0cnVlIH0pKTtcblxucm91dGVyLnVzZShmdW5jdGlvbiAocmVxOiBhbnksIHJlczogYW55LCBuZXh0OiBhbnkpIHtcbiAgICByZXMuaGVhZGVyKFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCIsIFwiKlwiKTtcbiAgICByZXMuaGVhZGVyKFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiLCBcIk9yaWdpbiwgWC1SZXF1ZXN0ZWQtV2l0aCwgQ29udGVudC1UeXBlLCBBY2NlcHRcIik7XG4gICAgbmV4dCgpO1xufSk7XG5cbnJvdXRlci51c2UoZnVuY3Rpb24ocmVxOmFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkge1xuICAgIG5leHQoKTtcbn0pXG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyByZWdpc3RlciB0aGUgcm91dGVzIG9mZmVyZWQgaW4gdGhpcyBjb250cm9sbGVyXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8gSSB0cmllZCB0byBoaWRlICB0aGUgbWVzc3NpbmVzcyBvZiBzZXR0aW5nIHVwIEZvcm0gUm91dGVzIGluIC4vc2V0dXBmb3Jtcm91dGVzXG4vLyBnZXRGb3JtcyAmIHB1dEZvcm1zIGFyZSB0aGUgZnVuY3Rpb25zIHRoYXQgd2lsbCBiZSBjYWxsZWQgcmVzcGVjdGl2ZWx5XG4vLyBidXQgSSBmb3VuZCBkaWZmZXJlbnQgYmVoYXZpb3VyIGJldHdlZW4gcmVnaXN0ZXJpbmcgdGhlIHJvdXRlIGhlcmUgb24gaW4gdGhlIHN1Ym1vZHVsZS5cbmltcG9ydCAqIGFzIEZvcm1Sb3V0ZXMgZnJvbSAnLi9TZXRVcEZvcm1Sb3V0ZXMnO1xuaW1wb3J0IHsgbmV0d29ya0ludGVyZmFjZXMgfSBmcm9tICdvcyc7XG5Gb3JtUm91dGVzLnNldFVwR2V0Um91dGVzKHJvdXRlcixnZXRGb3JtcywgcHV0Rm9ybSk7XG5cblxudmFyIHB1dE1pZGRsZXdhcmUgPSBbcHV0X0V4dHJhY3RVUkxTdGVtSW5mbywgcHV0X1NldEZvb3RwcmludFByb3BzLCBwdXRfSlNSRVZhbGlkYXRpb25SdWxlcywgcHV0X0VuY3J5cHRTZW5zaXRpdmVEYXRhXVxuXG5Gb3JtUm91dGVzLmZvcm1Sb3V0ZXMuZm9yRWFjaCgocikgPT4ge1xuICAgICByb3V0ZXIuZ2V0KHIsIGdldEZvcm1zKTtcbiAgICAgLy9yb3V0ZXIucHV0KHIsIHB1dEZvcm0pO1xuICAgICByb3V0ZXIucHV0KHIsIHB1dE1pZGRsZXdhcmUsIHB1dEZvcm0pO1xuICAgICByb3V0ZXIucHV0KHIsIC8qIHB1dE1vcmVNaWRkbGV3YXJlLCAqLyBwdXRBcHBseVVwZGF0ZVJ1bGVzKTsgXG4gfSk7XG5cbi8vIGEgY291cGxlIGV4dHJhc1xuIHJvdXRlci5nZXQoJy9BbGwvRm9ybXMnLCBnZXRBbGxGb3Jtc1Rlc3RpbmdVc2VPbmx5KTtcbiByb3V0ZXIucHV0KCcvOkNsaWVudElkZW50aWZpZXJUeXBlLzpDbGllbnRJZGVudGlmaWVyVmFsdWUvRm9ybXMvOkZvcm1UeXBlTXVuZy9faWQvOl9pZCcsIHB1dE1pZGRsZXdhcmUsIHB1dEZvcm0pO1xuIHJvdXRlci5wdXQoJy86Q2xpZW50SWRlbnRpZmllclR5cGUvOkNsaWVudElkZW50aWZpZXJWYWx1ZS9Gb3Jtcy86Rm9ybVR5cGVNdW5nL19pZC86X2lkJywgcHV0QXBwbHlVcGRhdGVSdWxlcyk7XG4gcm91dGVyLmRlbGV0ZSgnLzpDbGllbnRJZGVudGlmaWVyVHlwZS86Q2xpZW50SWRlbnRpZmllclZhbHVlL0Zvcm1zLzpGb3JtVHlwZU11bmcvX2lkLzpfaWQnLCBkZWxldGVGb3JtKTtcbiByb3V0ZXIuZGVsZXRlKCcvOkNsaWVudElkZW50aWZpZXJUeXBlLzpDbGllbnRJZGVudGlmaWVyVmFsdWUvRm9ybXMvOkZvcm1UeXBlTXVuZy86VHJhbnNhY3Rpb25JZCcsIGRlbGV0ZUZvcm0pO1xuIC8vIG5vdGUgY2FyZWZ1bGx5IHRoZSBhYnNlbmNlIG9mIFBvc3QuICBJIGNhbid0IHNlZSB0aGUgdXNlIGNhc2UgZm9yIGl0OyBcbiAvLyBidXQgdGhpcyBpbXBsaWVzIGNvbnN1bWVycyBtdXN0IGFsbG9jYXRlIEJFVCBudW1iZXJzIGZvciBuZXcgZm9ybXMgXG4gLy8gKG5vdGhpbmcgd3Jvbmcgd2l0aCB0aGF0IC0gYXMgbG9uZyBhcyB0aGV5IGZvbGxvdyBvdXIgcnVsZXMpO1xuIC8vIGJ1dCBwZXJoYXBzIEkgZG9uJ3QgdW5kZXJzdGFuZCBzb21lIG9mIHRoZSBEcmFmdEZvcm0gdXNlY2FzZXMuXG4gLy8gYW55d2F5LCBub3QgYXZhaWxhYmxlIHlldCAtIGNvZGUgYmVsb3cgbm90IHRlc3RlZFxuIC8vIHJvdXRlci5wb3N0KCcvOkNsaWVudElkZW50aWZpZXJUeXBlLzpDbGllbnRJZGVudGlmaWVyVmFsdWUvRm9ybXMvOkZvcm1UeXBlTXVuZycsIGNyZWF0ZUZvcm0pO1xuXG4vLyB0aGUgY3VycmVudCBcInB1YmxpY1wiIGZvcm1hdCBvZiBhIGZvcm0gaGFzIGVhY2ggc2VjdGlvbiBhcyBhIHByb3BlcnR5IG9mIHRoZSBmb3JtLlxuLy8gSSBjb3VsZG4ndCBmaWd1cmUgb3V0IGhvdCB0byBcInR5cGVcIiB0aGF0IGluIG1vbmdvb3NlLiAgU28gaW5zdGVhZCBmb3JtcyBhcmUgc3RvcmVkIHdpdGggXG4vLyBhbiBhcnJheSBvZiBTZWN0aW9ucy4gIFRoaXMgZnVuY3Rpb24gY29udmVydHMgdGhlIHN0b3JlZCBmb3JtYXQgb2YgYSBmb3JtIGJhY2sgdG8gdGhlIHB1YmxpYyBmb3JtYXQuXG5mdW5jdGlvbiB0cmFuc2Zvcm1TdG9yYWdlRm9ybWF0VG9QdWJsaWNGb3JtYXQoZm9ybTphbnkpIHtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZm9ybS5TZWN0aW9ucy5sZW5ndGg7IGkrKyl7XG4gICAgICAgIGxldCB0aGlzU2VjSWQgPSBmb3JtLlNlY3Rpb25zW2ldLlNlY3Rpb25JZDtcbiAgICAgICAgZm9ybVt0aGlzU2VjSWRdID0ge307XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGZvcm0uU2VjdGlvbnNbaV0uTGluZUl0ZW1zLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBsZXQgdGhpc0ZpZWxkSWQgPSBmb3JtLlNlY3Rpb25zW2ldLkxpbmVJdGVtc1tqXS5GaWVsZElkO1xuICAgICAgICAgICAgZm9ybVt0aGlzU2VjSWRdW3RoaXNGaWVsZElkXSA9IHtcbiAgICAgICAgICAgICAgICBpbmRleCA6IGZvcm0uU2VjdGlvbnNbaV0uTGluZUl0ZW1zW2pdLkZpZWxkSW5kZXgsXG4gICAgICAgICAgICAgICAgX3ZhbHVlIDogZm9ybS5TZWN0aW9uc1tpXS5MaW5lSXRlbXNbal0uVmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBkZWxldGUgZm9ybS5TZWN0aW9ucztcblxuICAgIHJldHVybiBmb3JtO1xufVxuXG4vLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8gR2V0IE1ldGhvZHNcbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyBSRVRVUk5TIEFMTCBUSEUgRk9STVMgSU4gVEhFIERBVEFCQVNFXG5mdW5jdGlvbiBnZXRBbGxGb3Jtc1Rlc3RpbmdVc2VPbmx5IChyZXE6IGFueSwgcmVzOiBhbnkpIHtcbiAgICBjb25zb2xlLmxvZygnSW5zaWRlIEZvcm1Db250cm9sbGVyLmpzJyk7XG4gICAgRm9ybS5maW5kKHt9LCBmdW5jdGlvbiAoZXJyOiBtb25nb29zZS5FcnJvciwgZm9ybXM6IG1vbmdvb3NlLkRvY3VtZW50W10pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0ZpbmQgY2FsbCBiYWNrIHJlY2VpdmVkIHdpdGg6ICcgKyBmb3Jtcy5sZW5ndGggKyAnIGZvcm1zJyk7XG4gICAgICAgIGlmIChlcnIpIHJldHVybiByZXMuc3RhdHVzKDUwMCkuc2VuZChcIlRoZXJlIHdhcyBhIHByb2JsZW0gZmluZGluZyB0aGUgZm9ybXMuXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhmb3Jtcyk7XG4gICAgICAgIHJlcy5zdGF0dXMoMjAwKS5zZW5kKGZvcm1zKTtcbiAgICB9KTtcbn07XG5cbi8vIFJFVFVSTlMgQUxMIFRIRSBGT1JNUyBJTiBUSEUgREFUQUJBU0UgVEhBVCBNQVRDSCBUSEUgVVJMXG5leHBvcnQgZnVuY3Rpb24gZ2V0Rm9ybXMocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSwgbmV4dDogZXhwcmVzcy5OZXh0RnVuY3Rpb24pIHtcbiAgICBjb25zdCBsb29rdXA6IGZvcm1RdWVyeVR5cGUgPSB0dXJuVVJMU3RlbXNJbnRvTG9va3VwT2JqZWN0KHJlcSwgbmV4dCk7XG5cbiAgICBGb3JtLmZpbmQobG9va3VwLCBmdW5jdGlvbiAoZXJyOiBhbnksIGZvcm1zOiBhbnkpIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIHJlcy5zdGF0dXMoNTAwKS5zZW5kKFwiVGhlcmUgd2FzIGEgcHJvYmxlbSBmaW5kaW5nIHRoZSBmb3JtLlwiICsgZXJyKTtcbiAgICAgICAgaWYgKCFmb3JtcykgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5zZW5kKFwiTm8gZm9ybSBmb3VuZC4hIVwiKTtcblxuICAgICAgICAvL3RvZG86IHJlc3RpZnkgdGhlIHJlc3BvbnNlXG4gICAgICAgIC8vdG9kbzogZGVjcnlwdCBsaW5lIGl0ZW1zXG5cbiAgICAgICAgaWYgKChmb3Jtc3x8IFtdKS5sZW5ndGggPT0gMCApIHJldHVybiByZXMuc3RhdHVzKDQwNCkuc2VuZChcIk5vIGZvcm0gZm91bmQuXCIpO1xuXG4gICAgICAgIGxldCByZXN1bHQ6IGFueSA9IFtdO1xuICAgICAgICBmb3Jtcy5mb3JFYWNoKCAoZjphbnkpPT4gcmVzdWx0LnB1c2godHJhbnNmb3JtU3RvcmFnZUZvcm1hdFRvUHVibGljRm9ybWF0KGYuX2RvYykpKTtcbiAgICAgICAgXG4gICAgICAgIHJlcy5zdGF0dXMoMjAwKS5zZW5kKHJlc3VsdCk7ICBcbiAgICB9KTsgXG59O1xuXG5mdW5jdGlvbiBwdXRfRXh0cmFjdFVSTFN0ZW1JbmZvKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6ZXhwcmVzcy5OZXh0RnVuY3Rpb24pIHtcbiAgICBjb25zb2xlLmxvZygnUHV0IG9yaWdpbmFsVXJsIDonLCByZXEub3JpZ2luYWxVcmwpXG4gICAgcmVxLnBhcmFtcy5sb29rdXAgPSA8Zm9ybVF1ZXJ5VHlwZT4gdHVyblVSTFN0ZW1zSW50b0xvb2t1cE9iamVjdChyZXEsIG5leHQpO1xuICAgIG5leHQoKVxufSBcblxuZnVuY3Rpb24gcHV0X1NldEZvb3RwcmludFByb3BzKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6ZXhwcmVzcy5OZXh0RnVuY3Rpb24pIHtcbiAgICAvL3RoaXMgd2lsbCBibG90IG91dCBhbnkgaW5jb25zaXRlbnQgcHJvcGVydGllcyBpbiB0aGUgcGF5bG9hZCAoZXh0cmEgZmllbGRzIHdpbGwgYmUgcmVtb3ZlZCBieSBtb25nb29zZSBzY2hlbWEgY2hlY2spXG4gICAgbGV0IG5ld0JvZHkgPSB7Li4ucmVxLmJvZHksIC4uLnJlcS5wYXJhbXMubG9va3VwfTtcbiAgICByZXEuYm9keSA9IHNldEZvb3RwcmludFByb3BlcnRpZXMobmV3Qm9keSk7XG5cbiAgICBpZiAoIXJlcS5ib2R5LkRUX1VwZGF0ZSkgdGhyb3cgbmV3IEVycm9yKFwibWlzc2luZyBmb290cHJpbnQgcHJvcGVydHkuXCIpO1xuICAgIGNvbnNvbGUubG9nKGBVcGRhdGVkIGJvZHkgZm9yIHVwZGF0ZSAke0pTT04uc3RyaW5naWZ5KHJlcS5ib2R5KX1gKTtcblxuICAgIG5leHQoKVxufVxuXG5mdW5jdGlvbiBwdXRfSlNSRVZhbGlkYXRpb25SdWxlcyhyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlLCBuZXh0OmV4cHJlc3MuTmV4dEZ1bmN0aW9uKSB7XG4gICAgXG4gICAgaWYgKHJlcS5ib2R5LkZvcm1UeXBlICA9PSAxMDEzMSkge1xuICAgICAgICBsZXQgc3RwTGluZUl0ZW1zID0gcmVxLmJvZHk7XG4gICAgICAgIGxldCBmb3JtTWV0YURhdGEgPSByZXF1aXJlKFwiLi4vanNyZS9mb3Jtcy9vVEhfUEFZUk9MTF9FVkVOVF9DSElMREZvcm0uanNcIik7XG4gICAgICAgIGxldCBSdWxlc0VuZ2luZSA9IHJlcXVpcmUoXCIuLi9qc3JlL3J1bGVzRW5naW5lXCIpO1xuICAgICAgICBsZXQgTGluZUl0ZW0gPSByZXF1aXJlKFwiLi4vanNyZS9saW5lSXRlbVwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vc3RwTGluZUl0ZW1zWzEwOTMzXVsxNjU4NV0gPSBuZXcgTGluZUl0ZW0oZm9ybU1ldGFEYXRhWzEwOTMzXVsxNjU4NV0sIHN0cExpbmVJdGVtc1sxMDkzM11bMTY1ODVdLl92YWx1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyB0aGlzIGlzIHN0dXBpZCwgaXNuJ3QuICBGb3Igc29tZSByZWFzb24gbXkgbGluZSBpdGVtcyBsb3N0IHRoZWlyIHByb3RvdHlwZSBtZXRob2RzLiAgSWYgeW91IGtub3cgd2h5LCBwbGVhc2UgZ2l2ZSBtZSBhIGNhbGwgYW5kIHRlbGwgbWUuIHg2MzgyMS5cbiAgICAgICAgLy8gSSdtIGd1ZXNzaW5nIGl0IGlzIGJlY2FzdWUgaXQgd2FzIHNlcmlhbGlzZWQgYW5kIGRlc2VhcmFsaXNlZCAod2l0aG91dCBtZXRob2RzKVxuICAgICAgICBPYmplY3Qua2V5cyhzdHBMaW5lSXRlbXMpLmZvckVhY2goZnVuY3Rpb24gKHNJZCkge1xuICAgICAgICAgICAgaWYgKCB0eXBlb2Yoc3RwTGluZUl0ZW1zW3NJZF0pID09IFwib2JqZWN0XCIpIHsgLy8gbm90ICh0eXBlb2Ygc3RwTGluZUl0ZW1zW3NJZF0gPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHN0cExpbmVJdGVtc1tzSWRdID09PSBcIm51bWJlclwiIHx8IHN0cExpbmVJdGVtc1tzSWRdID09PSBudWxsKSBcbiAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhzdHBMaW5lSXRlbXNbc0lkXSkuZm9yRWFjaCggZnVuY3Rpb24gKGZJZCl7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBsZXQgdiA9IChzdHBMaW5lSXRlbXNbc0lkXVtmSWRdLmZpZWxkLnJlcGVhdGluZykgPyBzdHBMaW5lSXRlbXNbc0lkXVtmSWRdLl92YWx1ZXMgOiBzdHBMaW5lSXRlbXNbc0lkXVtmSWRdLl92YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgc3RwTGluZUl0ZW1zW3NJZF1bZklkXSA9IG5ldyBMaW5lSXRlbShmb3JtTWV0YURhdGFbc0lkXVtmSWRdLCB2KSAgOyAgXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHJlID0gbmV3IFJ1bGVzRW5naW5lKGZvcm1NZXRhRGF0YSwgc3RwTGluZUl0ZW1zLCBcInZhbGlkYXRlXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIisrKysrKysrKysrIGFib3V0IHRvIGNhbGwgSlNSRSArKysrKysrKysrKysrKysrXCIpO1xuICAgICAgICByZS5ydW4oKTtcbiAgICAgICAgaWYgKHJlLmVycm9ycy5sZW5ndGggIT09IDApIFxuICAgICAgICAgICAgcmVzLnN0YXR1cyg1MDApLnNlbmQoe0ZhaWx1cmVNZXNzYWdlOiBcIkZhaWxlZCB2YWxpZGF0aW9uIHJ1bGVzIHdpdGggXCIgKyByZS5lcnJvcnMubGVuZ3RoICsgIFwiZm91bmRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogcmUuZXJyb3JzfSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCIrKysrKysrKysrKyBwYXNzZWQgdmFsaWRhdGlvbiBieSAgSlNSRSArKysrKysrKysrKysrKysrXCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gcHV0IGtub3duIHNlY2lvbnMvZmllbGRzIGludG8gc2VjdGlvbnMgJiBMaW5lSXRlbSBhcnJheXMgc28gY2FuIHVzZSBkZWZpbmVkIHNjaGVtYSBpbiBtb25nb29zZS5cbiAgICAgICAgc3RwTGluZUl0ZW1zLlNlY3Rpb25zID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZm9ybU1ldGFEYXRhLnNlY3Rpb25zLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgIGxldCB0aGlzU2VjSWQgPSBmb3JtTWV0YURhdGEuc2VjdGlvbnNbaV0uaWQ7XG4gICAgICAgICAgICBpZiAoc3RwTGluZUl0ZW1zW3RoaXNTZWNJZF0pIHtcbiAgICAgICAgICAgICAgICBsZXQgbmV3TGluZUl0ZW1zID1bXTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IChmb3JtTWV0YURhdGEuc2VjdGlvbnNbaV0uZmllbGRzIHx8IFtdKS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdGhpc0ZpZWxkSWQgPSBmb3JtTWV0YURhdGEuc2VjdGlvbnNbaV0uZmllbGRzW2pdLmlkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RwTGluZUl0ZW1zW3RoaXNTZWNJZF1bdGhpc0ZpZWxkSWRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdMSSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGaWVsZElkOiB0aGlzRmllbGRJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGaWVsZEluZGV4OiAgc3RwTGluZUl0ZW1zW3RoaXNTZWNJZF1bdGhpc0ZpZWxkSWRdLmluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZhbHVlOiAgc3RwTGluZUl0ZW1zW3RoaXNTZWNJZF1bdGhpc0ZpZWxkSWRdLl92YWx1ZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdMaW5lSXRlbXMucHVzaChuZXdMSSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbGV0IG5ld1NlY3Rpb24gPXtTZWN0aW9uSWQ6IGZvcm1NZXRhRGF0YS5zZWN0aW9uc1tpXS5pZCwgTGluZUl0ZW1zOiBuZXdMaW5lSXRlbXN9O1xuICAgICAgICAgICAgICAgIHN0cExpbmVJdGVtcy5TZWN0aW9ucy5wdXNoKG5ld1NlY3Rpb24pO1xuICAgICAgICAgICAgICAgIHN0cExpbmVJdGVtc1t0aGlzU2VjSWRdPW51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vdG9kbzogd29yayBvdXQgaWYgdGhpcyBmb3JtIHdpbGwgcmVxdWlyZSB1cGRhdGUgcnVsZXMuICBJZiBpdCBkb2Vzbid0LCBzZXQgdGhlIHByb2Nlc3Npbmcgc3RhdHVzIHRvIFwiRG9uZVwiLCBvdGhlcndpc2Ugc2V0IHRoZSBwcm9jZXNzaW5nIHN0YXR1cyB0byBcIlBlbmRpbmcgVXBkYXRlIFJ1bGVzXCIuXG4gICAgICAgIHN0cExpbmVJdGVtcy5Qcm9jZXNzaW5nU3RhdHVzQ2QgPSAxO1xuICAgICAgICBcbiAgICAgICAgcmVzLmxvY2Fscy5zdHBGb3JtID0gc3RwTGluZUl0ZW1zO1xuICAgIH07XG4gICAgICAgIFxuICAgIG5leHQoKTtcbn1cblxuZnVuY3Rpb24gcHV0X0VuY3J5cHRTZW5zaXRpdmVEYXRhKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6ZXhwcmVzcy5OZXh0RnVuY3Rpb24pIHtcbiAgICAvL3RvZG86IHNlbGVjdGl2ZWx5IGVuY3J5cHQgbGluZSBpdGVtc1xuICAgIG5leHQoKVxufVxuXG4vLyBVcHNlcnRzIHRoZSBmb3JtIHNwZWNpZmllZCBpbiB0aGUgdXJsIGludG8gdGhlIGRhdGFiYXNlXG5leHBvcnQgZnVuY3Rpb24gcHV0Rm9ybShyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlLCBuZXh0OmV4cHJlc3MuTmV4dEZ1bmN0aW9uKSB7XG4gICAgY29uc29sZS5sb2coXCIrKysrKysrKysrKyBhYm91dCB0byB0YWxrIHRvIE1vbmdvICsrKysrKysrKysrKysrKytcIik7XG4gICAgRm9ybS5maW5kT25lQW5kVXBkYXRlKHJlcS5wYXJhbXMubG9va3VwLCByZXEuYm9keSwgeyB1cHNlcnQ6dHJ1ZSwgbmV3OiB0cnVlfSwgZnVuY3Rpb24gKGVycjogYW55LCBmb3JtOiBhbnkpIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIHJlcy5zdGF0dXMoNTAwKS5zZW5kKFwiVGhlcmUgd2FzIGEgcHJvYmxlbSBmaW5kaW5nIHRoZSBmb3JtLlwiICsgZXJyKTtcbiAgICAgICAgY29uc29sZS5sb2coXCIrKysrKysrKysrKyBubyBlcnJvcnMgZnJvbSBNb25nbyArKysrKysrKysrKysrKysrXCIpO1xuICAgICAgICByZXMubG9jYWxzLnN0YXR1cyA9ICAoZm9ybSAmJiBmb3JtLl9kb2MuY3JlYXRlZEF0LmdldFRpbWUoKSA9PSBmb3JtLl9kb2MudXBkYXRlZEF0LmdldFRpbWUoKSkgPyAgMjAxOiAyMDA7XG4gICAgICAgIHJlcy5sb2NhbHMuZGF0YSA9IChmb3JtKSA/IGZvcm0gOiBcIk5vIGZvcm0gZm91bmQsIHdpbGwgdHJ5IHRvIGFkZCBpdC5cIjtcbiAgICAgICAgICAgIFxuICAgICAgICBuZXh0KCk7XG4gICAgfSk7XG59O1xuXG4vLyBVcHNlcnRzIHRoZSBmb3JtIHNwZWNpZmllZCBpbiB0aGUgdXJsIGludG8gdGhlIGRhdGFiYXNlXG5leHBvcnQgZnVuY3Rpb24gcHV0QXBwbHlVcGRhdGVSdWxlcyhyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlLCBuZXh0OmV4cHJlc3MuTmV4dEZ1bmN0aW9uKSB7XG5cbiAgICBjb25zb2xlLmxvZyhcIisrKysrKysrKysrIGFib3V0IHRvIGRvIHVwZGF0ZSBydWxlcyArKysrKysrKysrKysrKysrXCIpO1xuICAgIC8vdG9kbzogYXBwbHkgZm9ybSB1cGRhdGUgcnVsZXNcbiAgICBcbiAgICBpZiAocmVxLmJvZHkuRm9ybVR5cGUgID09IDEwMTMxKSB7XG4gICAgICAgIC8vdG9kbzogdXBkYXRlIG1vbmdvIHRvIHJlY29yZCBpbiBzdGF0dXMgZmllbGQgdGhhdCB1cGRhdGUgcnVsZXMgbm93IGFwcGxpZWRcbiAgICAgICAgcmVzLmxvY2Fscy5zdHBGb3JtLlByb2Nlc3NpbmdTdGF0dXNDZCA9IDI7XG4gICAgfVxuICAgIFxuICAgIC8vdG9kbzogcmVzdGlmeSB0aGUgcmVzcG9uc2VcbiAgICAvL3RvZG86IGRlY3J5cHQgbGluZSBpdGVtcyBcblxuICAgIGxldCBmb3JtID0gcmVzLmxvY2Fscy5kYXRhLl9kb2M7XG4gICAgaWYgKHJlcS5ib2R5LkZvcm1UeXBlICA9PSAxMDEzMSkge1xuICAgICAgICBmb3JtID0gdHJhbnNmb3JtU3RvcmFnZUZvcm1hdFRvUHVibGljRm9ybWF0KGZvcm0pO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIisrKysrKysrKysrIGFsbCBkb25lIGhlcmUgKysrKysrKysrKysrKysrK1wiKTtcbiAgICByZXMuc3RhdHVzKHJlcy5sb2NhbHMuc3RhdHVzKS5zZW5kKGZvcm0pO1xufTtcblxuLy8gRGVsZXRlcyB0aGUgZm9ybSBzcGVjaWZpZWQgaW4gdGhlIHVybCBmcm9tIHRoZSBkYXRhYmFzZVxuZXhwb3J0IGZ1bmN0aW9uIGRlbGV0ZUZvcm0ocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSwgbmV4dDpleHByZXNzLk5leHRGdW5jdGlvbikge1xuICAgIGNvbnN0IGxvb2t1cDogZm9ybVF1ZXJ5VHlwZSA9IHR1cm5VUkxTdGVtc0ludG9Mb29rdXBPYmplY3QocmVxLCBuZXh0KTtcblxuICAgIEZvcm0uZmluZE9uZUFuZFJlbW92ZShsb29rdXAsZnVuY3Rpb24oZXJyOmFueSwgZm9ybTphbnkpIHtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIHJlcy5zdGF0dXMoNTAwKS5zZW5kKFwiVGhlcmUgd2FzIGEgcHJvYmxlbSBmaW5kaW5nIHRoZSBmb3JtLlwiICsgZXJyKTtcbiAgICAgICAgaWYgKCFmb3JtKSByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLnNlbmQoYEZvcm0gbm90IGZvdW5kIC0gZm9yIGRlbGV0ZSBvcGVyYXRpb24gd2l0aCBrZXlzOiAke0pTT04uc3RyaW5naWZ5KGxvb2t1cCl9YCk7XG4gICAgICAgIGVsc2UgcmVzLnN0YXR1cygyMDApLnNlbmQoYEZvcm0gZGVsZXRlZCAtIHdpdGgga2V5cyAke0pTT04uc3RyaW5naWZ5KGxvb2t1cCl9YCk7XG4gICAgfSk7XG59O1xuXG4vLyAvLyBVUERBVEVTIEEgU0lOR0xFIEZPUk0gLSBUSElTIFNIT1VMRCBORVZFUiBCRSBVU0VEIChPVVRTSURFIE9GIFRFU1RJTkcpIEJFQ0FVU0UgTk9PTkUgV0lMTCBLTk9XIFRIRSBfSURcbi8vIHJvdXRlci5wdXQoJy9Gb3Jtcy86aWQnLCBwdXRGb3JtV2l0aElkKTtcblxuLy8gZnVuY3Rpb24gcHV0Rm9ybVdpdGhJZCAocmVxOmV4cHJlc3MuUmVxdWVzdCwgcmVzOmV4cHJlc3MuUmVzcG9uc2UpIHtcbi8vICAgICBjb25zb2xlLmxvZyhyZXEuYm9keSk7XG4vLyAgICAgY29uc3QgbmV4dHggPSAoKSA9PiB7fTtcbi8vICAgICBjb25zdCBsb29rdXA6IGZvcm1RdWVyeVR5cGUgPSB0dXJuVVJMU3RlbXNJbnRvTG9va3VwT2JqZWN0KHJlcSwgbmV4dHgpO1xuLy8gICAgIGNvbnNvbGUubG9nKGBQb3N0ZWQgYm9keSBmb3IgdXBkYXRlICR7SlNPTi5zdHJpbmdpZnkocmVxLmJvZHkpfWApO1xuICAgIFxuLy8gICAgIGxldCBuZXdCb2R5ID0gc2V0Rm9vdHByaW50UHJvcGVydGllcyhyZXEuYm9keSx0cnVlKTtcbi8vICAgICBjb25zb2xlLmxvZyhcIkFib3V0IHRvIGFwcGx5IHVwZGF0ZSB0bzogXCIgKyByZXEucGFyYW1zLl9pZCArIFwiIHdpdGggYm9keSBcIiArIEpTT04uc3RyaW5naWZ5KG5ld0JvZHkpKTtcbiAgICBcbi8vICAgICBGb3JtLmZpbmRCeUlkQW5kVXBkYXRlKHJlcS5wYXJhbXMuX2lkLCBuZXdCb2R5LCB7dXBzZXJ0OmZhbHNlLCBuZXc6IHRydWV9LCBmdW5jdGlvbiAoZXJyOiBhbnksIGZvcm06IGFueSkge1xuLy8gICAgIGlmIChlcnIpIHJldHVybiByZXMuc3RhdHVzKDUwMCkuc2VuZChcIlRoZXJlIHdhcyBhIHByb2JsZW0gdXBkYXRpbmcgdGhlIGZvcm0uXCIpO1xuLy8gICAgICAgICByZXMuc3RhdHVzKDIwMCkuc2VuZChmb3JtKTtcbi8vICAgICB9KTsgIFxuLy8gfTsgXG5cbi8vIENSRUFURVMgQSBORVcgRk9STSAtIGRvbid0IHRoaW5rIHdlIG5lZWQgdGhpcyEhICBKdXN0IG1lYW5zIHRoZSBjb25zdW1lciBtdXN0IHN1cHBseSBhIHZhbGlkIGJldCMgYW5kIGNhbGwgcHV0XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRm9ybShyZXE6IGFueSwgcmVzOiBhbnkpIHtcbiAgICBjb25zb2xlLmxvZygnSW5zaWRlIHBvc3QnKTtcbiAgICBjb25zb2xlLmxvZygncmVxLmJvZHk6ICcgKyByZXEuYm9keSk7XG5cbiAgICAvL3RvZG86IGlmIHRoaXMgaXMgbm90IHRocm93biBhd2F5OlxuICAgIC8vdG9kbzogLSBlbnN1cmUgdXJpIGluZm8gbWF0Y2hlZCBhZ2FpbnN0IGhlYWRlciwgXG4gICAgLy90b2RvOiAtIHNldHVwIGZvb3RwcmludCBpbmZvXG4gICAgLy90b2RvOiAtIHNlbGVjdGl2ZWx5IGVuY3J5cHQgbGluZSBpdGVtc1xuICAgIC8vdG9kbzogLSBjYWxsIGpzcmUgdmFsaWRhdGlvbiBydWxlc1xuXG5cbiAgICBGb3JtLmNyZWF0ZShyZXEuYm9keSxcbiAgICAgICAgZnVuY3Rpb24gKGVycjogbW9uZ29vc2UuRXJyb3IsIGZvcm06IG1vbmdvb3NlLk1vZGVsPG1vbmdvb3NlLkRvY3VtZW50PiApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwb3N0IGNhbGwgYmFjayByZWNlaXZlZCcpO1xuICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIHJlcy5zdGF0dXMoNTAwKS5zZW5kKFwiVGhlcmUgd2FzIGEgcHJvYmxlbSBhZGRpbmcgdGhlIGluZm9ybWF0aW9uIHRvIHRoZSBkYXRhYmFzZS5cXG5cIiArIGVyci5tZXNzYWdlICk7XG5cbiAgICAgICAgICAgIC8vdG9kbzogYXBwbHkgZm9ybSB1cGRhdGUgcnVsZXNcbiAgICAgICAgICAgIC8vdG9kbzogcmVzdGlmeSB0aGUgcmVzcG9uc2VcbiAgICAgICAgICAgIC8vdG9kbzogZGVjcnlwdCBsaW5lIGl0ZW1zIFxuXG4gICAgICAgICAgICByZXMuc3RhdHVzKDIwMCkuc2VuZChmb3JtKTtcbiAgICAgICAgfSk7XG59O1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNvZGVMb29rdXAoZGVjb2RlOlN0cmluZyk6IG51bWJlcntcbiAgICAvL3RvZG86IGR1bW15XG4gICAgaWYoZGVjb2RlID09IFwiSVRcIikgcmV0dXJuIDU7XG4gICAgaWYoZGVjb2RlID09IFwiR1NUXCIpIHJldHVybiAxMDtcbiAgICBpZihkZWNvZGUgPT0gXCJTVFBcIikgcmV0dXJuIDY2O1xuICAgIHJldHVybiAtMTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dGVybmFsSWRMb29rdXAoQ2xpZW50SWRlbnRpZmllclR5cGU6XCJBQk5cIiB8IFwiVEZOXCIgfCBcIldQTlwiLCBDbGllbnRJZGVudGlmaWVyVmFsdWU6IHN0cmluZyk6IGZvcm1RdWVyeVR5cGUge1xuICAgIC8vdG9kbzogd3JpdGUgZnVuY3Rpb25cbiAgICByZXR1cm4ge0NsaWVudEludGVybmFsSWQ6MTIzNDV9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJvdXRlcjsiXX0=