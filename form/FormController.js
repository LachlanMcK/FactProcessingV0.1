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
    Form_1.Form.find(lookup, function (err, form) {
        if (err)
            return res.status(500).send("There was a problem finding the form." + err);
        if (!form)
            return res.status(404).send("No form found.!!");
        //todo: restify the response
        //todo: decrypt line items
        if ((form || []).length == 0)
            return res.status(404).send("No form found.");
        else
            res.status(200).send(form);
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
        res.locals.data._do.ProcessingStatusCd = 2;
    }
    //todo: restify the response
    //todo: decrypt line items 
    let form = res.locals.data._doc;
    if (req.body.FormType == 10131) {
        // put known secions/fields into sections & LineItem arrays so can use defined schema in mongoose.
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
        //delete stpForm.Sections;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9ybUNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGb3JtQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQzFCLFFBQUEsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNyQyx3REFBMEM7QUFHMUMsbURBQThFO0FBRTlFLGlDQUFvRDtBQUVwRCxnRkFBZ0Y7QUFDaEYsaURBQWlEO0FBQ2pELGdGQUFnRjtBQUNoRixjQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzlCLGNBQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFdEQsY0FBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQVEsRUFBRSxHQUFRLEVBQUUsSUFBUztJQUM5QyxHQUFHLENBQUMsTUFBTSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQy9DLEdBQUcsQ0FBQyxNQUFNLENBQUMsOEJBQThCLEVBQUUsZ0RBQWdELENBQUMsQ0FBQztJQUM3RixJQUFJLEVBQUUsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDO0FBRUgsY0FBTSxDQUFDLEdBQUcsQ0FBQyxVQUFTLEdBQU8sRUFBRSxHQUFRLEVBQUUsSUFBUztJQUM1QyxJQUFJLEVBQUUsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFBO0FBRUYsZ0ZBQWdGO0FBQ2hGLGlEQUFpRDtBQUNqRCxnRkFBZ0Y7QUFDaEYsaUZBQWlGO0FBQ2pGLHlFQUF5RTtBQUN6RSwwRkFBMEY7QUFDMUYsOERBQWdEO0FBRWhELFVBQVUsQ0FBQyxjQUFjLENBQUMsY0FBTSxFQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUdwRCxJ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QUFJLENBQUMsK0RBQStELEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBRSxDQUFDO1FBRXJILCtCQUErQjtRQUMvQiw0QkFBNEI7UUFDNUIsMkJBQTJCO1FBRTNCLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0FBQ1gsQ0FBQztBQXRCRCxnQ0FzQkM7QUFBQSxDQUFDO0FBSUYsU0FBZ0IsVUFBVSxDQUFDLE1BQWE7SUFDcEMsYUFBYTtJQUNiLElBQUcsTUFBTSxJQUFJLElBQUk7UUFBRSxPQUFPLENBQUMsQ0FBQztJQUM1QixJQUFHLE1BQU0sSUFBSSxLQUFLO1FBQUUsT0FBTyxFQUFFLENBQUM7SUFDOUIsSUFBRyxNQUFNLElBQUksS0FBSztRQUFFLE9BQU8sRUFBRSxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDO0FBTkQsZ0NBTUM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxvQkFBMEMsRUFBRSxxQkFBNkI7SUFDdEcsc0JBQXNCO0lBQ3RCLE9BQU8sRUFBQyxnQkFBZ0IsRUFBQyxLQUFLLEVBQUMsQ0FBQztBQUNwQyxDQUFDO0FBSEQsNENBR0M7QUFFRCxNQUFNLENBQUMsT0FBTyxHQUFHLGNBQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5jb25zb2xlLmxvZygnSW5zaWRlIEZvcm1Db250cm9sbGVyJyk7XG5leHBvcnQgdmFyIHJvdXRlciA9IGV4cHJlc3MuUm91dGVyKCk7XG5pbXBvcnQgKiBhcyBib2R5UGFyc2VyIGZyb20gJ2JvZHktcGFyc2VyJztcbmltcG9ydCAqIGFzIG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcblxuaW1wb3J0IHsgZm9ybVF1ZXJ5VHlwZSwgdHVyblVSTFN0ZW1zSW50b0xvb2t1cE9iamVjdCB9IGZyb20gJy4vRm9ybVVSTDJRdWVyeSc7XG5cbmltcG9ydCB7Rm9ybSwgc2V0Rm9vdHByaW50UHJvcGVydGllc30gZnJvbSAnLi9Gb3JtJztcblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vIGludm9rZSBtaWRkbGV3YXJlIGZ1bmN0aW9ucyAtIGV4cHJlc3MgY2VyZW1vbnlcbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5yb3V0ZXIudXNlKGJvZHlQYXJzZXIuanNvbigpKTtcbnJvdXRlci51c2UoYm9keVBhcnNlci51cmxlbmNvZGVkKHsgZXh0ZW5kZWQ6IHRydWUgfSkpO1xuXG5yb3V0ZXIudXNlKGZ1bmN0aW9uIChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkge1xuICAgIHJlcy5oZWFkZXIoXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIiwgXCIqXCIpO1xuICAgIHJlcy5oZWFkZXIoXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCIsIFwiT3JpZ2luLCBYLVJlcXVlc3RlZC1XaXRoLCBDb250ZW50LVR5cGUsIEFjY2VwdFwiKTtcbiAgICBuZXh0KCk7XG59KTtcblxucm91dGVyLnVzZShmdW5jdGlvbihyZXE6YW55LCByZXM6IGFueSwgbmV4dDogYW55KSB7XG4gICAgbmV4dCgpO1xufSlcblxuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vIHJlZ2lzdGVyIHRoZSByb3V0ZXMgb2ZmZXJlZCBpbiB0aGlzIGNvbnRyb2xsZXJcbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyBJIHRyaWVkIHRvIGhpZGUgIHRoZSBtZXNzc2luZXNzIG9mIHNldHRpbmcgdXAgRm9ybSBSb3V0ZXMgaW4gLi9zZXR1cGZvcm1yb3V0ZXNcbi8vIGdldEZvcm1zICYgcHV0Rm9ybXMgYXJlIHRoZSBmdW5jdGlvbnMgdGhhdCB3aWxsIGJlIGNhbGxlZCByZXNwZWN0aXZlbHlcbi8vIGJ1dCBJIGZvdW5kIGRpZmZlcmVudCBiZWhhdmlvdXIgYmV0d2VlbiByZWdpc3RlcmluZyB0aGUgcm91dGUgaGVyZSBvbiBpbiB0aGUgc3VibW9kdWxlLlxuaW1wb3J0ICogYXMgRm9ybVJvdXRlcyBmcm9tICcuL1NldFVwRm9ybVJvdXRlcyc7XG5pbXBvcnQgeyBuZXR3b3JrSW50ZXJmYWNlcyB9IGZyb20gJ29zJztcbkZvcm1Sb3V0ZXMuc2V0VXBHZXRSb3V0ZXMocm91dGVyLGdldEZvcm1zLCBwdXRGb3JtKTtcblxuXG52YXIgcHV0TWlkZGxld2FyZSA9IFtwdXRfRXh0cmFjdFVSTFN0ZW1JbmZvLCBwdXRfU2V0Rm9vdHByaW50UHJvcHMsIHB1dF9KU1JFVmFsaWRhdGlvblJ1bGVzLCBwdXRfRW5jcnlwdFNlbnNpdGl2ZURhdGFdXG5cbkZvcm1Sb3V0ZXMuZm9ybVJvdXRlcy5mb3JFYWNoKChyKSA9PiB7XG4gICAgIHJvdXRlci5nZXQociwgZ2V0Rm9ybXMpO1xuICAgICAvL3JvdXRlci5wdXQociwgcHV0Rm9ybSk7XG4gICAgIHJvdXRlci5wdXQociwgcHV0TWlkZGxld2FyZSwgcHV0Rm9ybSk7XG4gICAgIHJvdXRlci5wdXQociwgLyogcHV0TW9yZU1pZGRsZXdhcmUsICovIHB1dEFwcGx5VXBkYXRlUnVsZXMpOyBcbiB9KTtcblxuLy8gYSBjb3VwbGUgZXh0cmFzXG4gcm91dGVyLmdldCgnL0FsbC9Gb3JtcycsIGdldEFsbEZvcm1zVGVzdGluZ1VzZU9ubHkpO1xuIHJvdXRlci5wdXQoJy86Q2xpZW50SWRlbnRpZmllclR5cGUvOkNsaWVudElkZW50aWZpZXJWYWx1ZS9Gb3Jtcy86Rm9ybVR5cGVNdW5nL19pZC86X2lkJywgcHV0TWlkZGxld2FyZSwgcHV0Rm9ybSk7XG4gcm91dGVyLnB1dCgnLzpDbGllbnRJZGVudGlmaWVyVHlwZS86Q2xpZW50SWRlbnRpZmllclZhbHVlL0Zvcm1zLzpGb3JtVHlwZU11bmcvX2lkLzpfaWQnLCBwdXRBcHBseVVwZGF0ZVJ1bGVzKTtcbiByb3V0ZXIuZGVsZXRlKCcvOkNsaWVudElkZW50aWZpZXJUeXBlLzpDbGllbnRJZGVudGlmaWVyVmFsdWUvRm9ybXMvOkZvcm1UeXBlTXVuZy9faWQvOl9pZCcsIGRlbGV0ZUZvcm0pO1xuIHJvdXRlci5kZWxldGUoJy86Q2xpZW50SWRlbnRpZmllclR5cGUvOkNsaWVudElkZW50aWZpZXJWYWx1ZS9Gb3Jtcy86Rm9ybVR5cGVNdW5nLzpUcmFuc2FjdGlvbklkJywgZGVsZXRlRm9ybSk7XG4gLy8gbm90ZSBjYXJlZnVsbHkgdGhlIGFic2VuY2Ugb2YgUG9zdC4gIEkgY2FuJ3Qgc2VlIHRoZSB1c2UgY2FzZSBmb3IgaXQ7IFxuIC8vIGJ1dCB0aGlzIGltcGxpZXMgY29uc3VtZXJzIG11c3QgYWxsb2NhdGUgQkVUIG51bWJlcnMgZm9yIG5ldyBmb3JtcyBcbiAvLyAobm90aGluZyB3cm9uZyB3aXRoIHRoYXQgLSBhcyBsb25nIGFzIHRoZXkgZm9sbG93IG91ciBydWxlcyk7XG4gLy8gYnV0IHBlcmhhcHMgSSBkb24ndCB1bmRlcnN0YW5kIHNvbWUgb2YgdGhlIERyYWZ0Rm9ybSB1c2VjYXNlcy5cbiAvLyBhbnl3YXksIG5vdCBhdmFpbGFibGUgeWV0IC0gY29kZSBiZWxvdyBub3QgdGVzdGVkXG4gLy8gcm91dGVyLnBvc3QoJy86Q2xpZW50SWRlbnRpZmllclR5cGUvOkNsaWVudElkZW50aWZpZXJWYWx1ZS9Gb3Jtcy86Rm9ybVR5cGVNdW5nJywgY3JlYXRlRm9ybSk7XG5cbi8vICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyBHZXQgTWV0aG9kc1xuLy8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vIFJFVFVSTlMgQUxMIFRIRSBGT1JNUyBJTiBUSEUgREFUQUJBU0VcbmZ1bmN0aW9uIGdldEFsbEZvcm1zVGVzdGluZ1VzZU9ubHkgKHJlcTogYW55LCByZXM6IGFueSkge1xuICAgIGNvbnNvbGUubG9nKCdJbnNpZGUgRm9ybUNvbnRyb2xsZXIuanMnKTtcbiAgICBGb3JtLmZpbmQoe30sIGZ1bmN0aW9uIChlcnI6IG1vbmdvb3NlLkVycm9yLCBmb3JtczogbW9uZ29vc2UuRG9jdW1lbnRbXSkge1xuICAgICAgICBjb25zb2xlLmxvZygnRmluZCBjYWxsIGJhY2sgcmVjZWl2ZWQgd2l0aDogJyArIGZvcm1zLmxlbmd0aCArICcgZm9ybXMnKTtcbiAgICAgICAgaWYgKGVycikgcmV0dXJuIHJlcy5zdGF0dXMoNTAwKS5zZW5kKFwiVGhlcmUgd2FzIGEgcHJvYmxlbSBmaW5kaW5nIHRoZSBmb3Jtcy5cIik7XG4gICAgICAgIGNvbnNvbGUubG9nKGZvcm1zKTtcbiAgICAgICAgcmVzLnN0YXR1cygyMDApLnNlbmQoZm9ybXMpO1xuICAgIH0pO1xufTtcblxuLy8gUkVUVVJOUyBBTEwgVEhFIEZPUk1TIElOIFRIRSBEQVRBQkFTRSBUSEFUIE1BVENIIFRIRSBVUkxcbmV4cG9ydCBmdW5jdGlvbiBnZXRGb3JtcyhyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlLCBuZXh0OiBleHByZXNzLk5leHRGdW5jdGlvbikge1xuICAgIGNvbnN0IGxvb2t1cDogZm9ybVF1ZXJ5VHlwZSA9IHR1cm5VUkxTdGVtc0ludG9Mb29rdXBPYmplY3QocmVxLCBuZXh0KTtcblxuICAgIEZvcm0uZmluZChsb29rdXAsIGZ1bmN0aW9uIChlcnI6IGFueSwgZm9ybTogYW55KSB7XG4gICAgICAgIGlmIChlcnIpIHJldHVybiByZXMuc3RhdHVzKDUwMCkuc2VuZChcIlRoZXJlIHdhcyBhIHByb2JsZW0gZmluZGluZyB0aGUgZm9ybS5cIiArIGVycik7XG4gICAgICAgIGlmICghZm9ybSkgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5zZW5kKFwiTm8gZm9ybSBmb3VuZC4hIVwiKTtcblxuICAgICAgICAgICAgLy90b2RvOiByZXN0aWZ5IHRoZSByZXNwb25zZVxuICAgICAgICAgICAgLy90b2RvOiBkZWNyeXB0IGxpbmUgaXRlbXNcblxuICAgICAgICBpZiAoKGZvcm18fCBbXSkubGVuZ3RoID09IDAgKSByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLnNlbmQoXCJObyBmb3JtIGZvdW5kLlwiKTtcbiAgICAgICAgZWxzZSByZXMuc3RhdHVzKDIwMCkuc2VuZChmb3JtKTsgIFxuICAgIH0pOyBcbn07XG5cbmZ1bmN0aW9uIHB1dF9FeHRyYWN0VVJMU3RlbUluZm8ocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSwgbmV4dDpleHByZXNzLk5leHRGdW5jdGlvbikge1xuICAgIGNvbnNvbGUubG9nKCdQdXQgb3JpZ2luYWxVcmwgOicsIHJlcS5vcmlnaW5hbFVybClcbiAgICByZXEucGFyYW1zLmxvb2t1cCA9IDxmb3JtUXVlcnlUeXBlPiB0dXJuVVJMU3RlbXNJbnRvTG9va3VwT2JqZWN0KHJlcSwgbmV4dCk7XG4gICAgbmV4dCgpXG59IFxuXG5mdW5jdGlvbiBwdXRfU2V0Rm9vdHByaW50UHJvcHMocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSwgbmV4dDpleHByZXNzLk5leHRGdW5jdGlvbikge1xuICAgIC8vdGhpcyB3aWxsIGJsb3Qgb3V0IGFueSBpbmNvbnNpdGVudCBwcm9wZXJ0aWVzIGluIHRoZSBwYXlsb2FkIChleHRyYSBmaWVsZHMgd2lsbCBiZSByZW1vdmVkIGJ5IG1vbmdvb3NlIHNjaGVtYSBjaGVjaylcbiAgICBsZXQgbmV3Qm9keSA9IHsuLi5yZXEuYm9keSwgLi4ucmVxLnBhcmFtcy5sb29rdXB9O1xuICAgIHJlcS5ib2R5ID0gc2V0Rm9vdHByaW50UHJvcGVydGllcyhuZXdCb2R5KTtcblxuICAgIGlmICghcmVxLmJvZHkuRFRfVXBkYXRlKSB0aHJvdyBuZXcgRXJyb3IoXCJtaXNzaW5nIGZvb3RwcmludCBwcm9wZXJ0eS5cIik7XG4gICAgY29uc29sZS5sb2coYFVwZGF0ZWQgYm9keSBmb3IgdXBkYXRlICR7SlNPTi5zdHJpbmdpZnkocmVxLmJvZHkpfWApO1xuXG4gICAgbmV4dCgpXG59XG5cbmZ1bmN0aW9uIHB1dF9KU1JFVmFsaWRhdGlvblJ1bGVzKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6ZXhwcmVzcy5OZXh0RnVuY3Rpb24pIHtcbiAgICBcbiAgICBpZiAocmVxLmJvZHkuRm9ybVR5cGUgID09IDEwMTMxKSB7XG4gICAgICAgIGxldCBzdHBMaW5lSXRlbXMgPSByZXEuYm9keTtcbiAgICAgICAgbGV0IGZvcm1NZXRhRGF0YSA9IHJlcXVpcmUoXCIuLi9qc3JlL2Zvcm1zL29USF9QQVlST0xMX0VWRU5UX0NISUxERm9ybS5qc1wiKTtcbiAgICAgICAgbGV0IFJ1bGVzRW5naW5lID0gcmVxdWlyZShcIi4uL2pzcmUvcnVsZXNFbmdpbmVcIik7XG4gICAgICAgIGxldCBMaW5lSXRlbSA9IHJlcXVpcmUoXCIuLi9qc3JlL2xpbmVJdGVtXCIpO1xuICAgICAgICBcbiAgICAgICAgLy9zdHBMaW5lSXRlbXNbMTA5MzNdWzE2NTg1XSA9IG5ldyBMaW5lSXRlbShmb3JtTWV0YURhdGFbMTA5MzNdWzE2NTg1XSwgc3RwTGluZUl0ZW1zWzEwOTMzXVsxNjU4NV0uX3ZhbHVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRoaXMgaXMgc3R1cGlkLCBpc24ndC4gIEZvciBzb21lIHJlYXNvbiBteSBsaW5lIGl0ZW1zIGxvc3QgdGhlaXIgcHJvdG90eXBlIG1ldGhvZHMuICBJZiB5b3Uga25vdyB3aHksIHBsZWFzZSBnaXZlIG1lIGEgY2FsbCBhbmQgdGVsbCBtZS4geDYzODIxLlxuICAgICAgICAvLyBJJ20gZ3Vlc3NpbmcgaXQgaXMgYmVjYXN1ZSBpdCB3YXMgc2VyaWFsaXNlZCBhbmQgZGVzZWFyYWxpc2VkICh3aXRob3V0IG1ldGhvZHMpXG4gICAgICAgIE9iamVjdC5rZXlzKHN0cExpbmVJdGVtcykuZm9yRWFjaChmdW5jdGlvbiAoc0lkKSB7XG4gICAgICAgICAgICBpZiAoIHR5cGVvZihzdHBMaW5lSXRlbXNbc0lkXSkgPT0gXCJvYmplY3RcIikgeyAvLyBub3QgKHR5cGVvZiBzdHBMaW5lSXRlbXNbc0lkXSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2Ygc3RwTGluZUl0ZW1zW3NJZF0gPT09IFwibnVtYmVyXCIgfHwgc3RwTGluZUl0ZW1zW3NJZF0gPT09IG51bGwpIFxuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHN0cExpbmVJdGVtc1tzSWRdKS5mb3JFYWNoKCBmdW5jdGlvbiAoZklkKXtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGxldCB2ID0gKHN0cExpbmVJdGVtc1tzSWRdW2ZJZF0uZmllbGQucmVwZWF0aW5nKSA/IHN0cExpbmVJdGVtc1tzSWRdW2ZJZF0uX3ZhbHVlcyA6IHN0cExpbmVJdGVtc1tzSWRdW2ZJZF0uX3ZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBzdHBMaW5lSXRlbXNbc0lkXVtmSWRdID0gbmV3IExpbmVJdGVtKGZvcm1NZXRhRGF0YVtzSWRdW2ZJZF0sIHYpICA7ICBcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgcmUgPSBuZXcgUnVsZXNFbmdpbmUoZm9ybU1ldGFEYXRhLCBzdHBMaW5lSXRlbXMsIFwidmFsaWRhdGVcIik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiKysrKysrKysrKysgYWJvdXQgdG8gY2FsbCBKU1JFICsrKysrKysrKysrKysrKytcIik7XG4gICAgICAgIHJlLnJ1bigpO1xuICAgICAgICBpZiAocmUuZXJyb3JzLmxlbmd0aCAhPT0gMCkgXG4gICAgICAgICAgICByZXMuc3RhdHVzKDUwMCkuc2VuZCh7RmFpbHVyZU1lc3NhZ2U6IFwiRmFpbGVkIHZhbGlkYXRpb24gcnVsZXMgd2l0aCBcIiArIHJlLmVycm9ycy5sZW5ndGggKyAgXCJmb3VuZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiByZS5lcnJvcnN9KTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIisrKysrKysrKysrIHBhc3NlZCB2YWxpZGF0aW9uIGJ5ICBKU1JFICsrKysrKysrKysrKysrKytcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBwdXQga25vd24gc2VjaW9ucy9maWVsZHMgaW50byBzZWN0aW9ucyAmIExpbmVJdGVtIGFycmF5cyBzbyBjYW4gdXNlIGRlZmluZWQgc2NoZW1hIGluIG1vbmdvb3NlLlxuICAgICAgICBzdHBMaW5lSXRlbXMuU2VjdGlvbnMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmb3JtTWV0YURhdGEuc2VjdGlvbnMubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgbGV0IHRoaXNTZWNJZCA9IGZvcm1NZXRhRGF0YS5zZWN0aW9uc1tpXS5pZDtcbiAgICAgICAgICAgIGlmIChzdHBMaW5lSXRlbXNbdGhpc1NlY0lkXSkge1xuICAgICAgICAgICAgICAgIGxldCBuZXdMaW5lSXRlbXMgPVtdO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgKGZvcm1NZXRhRGF0YS5zZWN0aW9uc1tpXS5maWVsZHMgfHwgW10pLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0aGlzRmllbGRJZCA9IGZvcm1NZXRhRGF0YS5zZWN0aW9uc1tpXS5maWVsZHNbal0uaWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdHBMaW5lSXRlbXNbdGhpc1NlY0lkXVt0aGlzRmllbGRJZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0xJID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZpZWxkSWQ6IHRoaXNGaWVsZElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZpZWxkSW5kZXg6ICBzdHBMaW5lSXRlbXNbdGhpc1NlY0lkXVt0aGlzRmllbGRJZF0uaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVmFsdWU6ICBzdHBMaW5lSXRlbXNbdGhpc1NlY0lkXVt0aGlzRmllbGRJZF0uX3ZhbHVlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0xpbmVJdGVtcy5wdXNoKG5ld0xJKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsZXQgbmV3U2VjdGlvbiA9e1NlY3Rpb25JZDogZm9ybU1ldGFEYXRhLnNlY3Rpb25zW2ldLmlkLCBMaW5lSXRlbXM6IG5ld0xpbmVJdGVtc307XG4gICAgICAgICAgICAgICAgc3RwTGluZUl0ZW1zLlNlY3Rpb25zLnB1c2gobmV3U2VjdGlvbik7XG4gICAgICAgICAgICAgICAgc3RwTGluZUl0ZW1zW3RoaXNTZWNJZF09bnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy90b2RvOiB3b3JrIG91dCBpZiB0aGlzIGZvcm0gd2lsbCByZXF1aXJlIHVwZGF0ZSBydWxlcy4gIElmIGl0IGRvZXNuJ3QsIHNldCB0aGUgcHJvY2Vzc2luZyBzdGF0dXMgdG8gXCJEb25lXCIsIG90aGVyd2lzZSBzZXQgdGhlIHByb2Nlc3Npbmcgc3RhdHVzIHRvIFwiUGVuZGluZyBVcGRhdGUgUnVsZXNcIi5cbiAgICAgICAgc3RwTGluZUl0ZW1zLlByb2Nlc3NpbmdTdGF0dXNDZCA9IDE7XG4gICAgICAgIFxuICAgICAgICByZXMubG9jYWxzLnN0cEZvcm0gPSBzdHBMaW5lSXRlbXM7XG4gICAgfTtcbiAgICAgICAgXG4gICAgbmV4dCgpO1xufVxuXG5mdW5jdGlvbiBwdXRfRW5jcnlwdFNlbnNpdGl2ZURhdGEocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSwgbmV4dDpleHByZXNzLk5leHRGdW5jdGlvbikge1xuICAgIC8vdG9kbzogc2VsZWN0aXZlbHkgZW5jcnlwdCBsaW5lIGl0ZW1zXG4gICAgbmV4dCgpXG59XG5cbi8vIFVwc2VydHMgdGhlIGZvcm0gc3BlY2lmaWVkIGluIHRoZSB1cmwgaW50byB0aGUgZGF0YWJhc2VcbmV4cG9ydCBmdW5jdGlvbiBwdXRGb3JtKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6ZXhwcmVzcy5OZXh0RnVuY3Rpb24pIHtcbiAgICBjb25zb2xlLmxvZyhcIisrKysrKysrKysrIGFib3V0IHRvIHRhbGsgdG8gTW9uZ28gKysrKysrKysrKysrKysrK1wiKTtcbiAgICBGb3JtLmZpbmRPbmVBbmRVcGRhdGUocmVxLnBhcmFtcy5sb29rdXAsIHJlcS5ib2R5LCB7IHVwc2VydDp0cnVlLCBuZXc6IHRydWV9LCBmdW5jdGlvbiAoZXJyOiBhbnksIGZvcm06IGFueSkge1xuICAgICAgICBpZiAoZXJyKSByZXR1cm4gcmVzLnN0YXR1cyg1MDApLnNlbmQoXCJUaGVyZSB3YXMgYSBwcm9ibGVtIGZpbmRpbmcgdGhlIGZvcm0uXCIgKyBlcnIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIisrKysrKysrKysrIG5vIGVycm9ycyBmcm9tIE1vbmdvICsrKysrKysrKysrKysrKytcIik7XG4gICAgICAgIHJlcy5sb2NhbHMuc3RhdHVzID0gIChmb3JtICYmIGZvcm0uX2RvYy5jcmVhdGVkQXQuZ2V0VGltZSgpID09IGZvcm0uX2RvYy51cGRhdGVkQXQuZ2V0VGltZSgpKSA/ICAyMDE6IDIwMDtcbiAgICAgICAgcmVzLmxvY2Fscy5kYXRhID0gKGZvcm0pID8gZm9ybSA6IFwiTm8gZm9ybSBmb3VuZCwgd2lsbCB0cnkgdG8gYWRkIGl0LlwiO1xuICAgICAgICAgICAgXG4gICAgICAgIG5leHQoKTtcbiAgICB9KTtcbn07XG5cbi8vIFVwc2VydHMgdGhlIGZvcm0gc3BlY2lmaWVkIGluIHRoZSB1cmwgaW50byB0aGUgZGF0YWJhc2VcbmV4cG9ydCBmdW5jdGlvbiBwdXRBcHBseVVwZGF0ZVJ1bGVzKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6ZXhwcmVzcy5OZXh0RnVuY3Rpb24pIHtcblxuICAgIGNvbnNvbGUubG9nKFwiKysrKysrKysrKysgYWJvdXQgdG8gZG8gdXBkYXRlIHJ1bGVzICsrKysrKysrKysrKysrKytcIik7XG4gICAgLy90b2RvOiBhcHBseSBmb3JtIHVwZGF0ZSBydWxlc1xuICAgIFxuICAgIGlmIChyZXEuYm9keS5Gb3JtVHlwZSAgPT0gMTAxMzEpIHtcbiAgICAgICAgLy90b2RvOiB1cGRhdGUgbW9uZ28gdG8gcmVjb3JkIGluIHN0YXR1cyBmaWVsZCB0aGF0IHVwZGF0ZSBydWxlcyBub3cgYXBwbGllZFxuICAgICAgICByZXMubG9jYWxzLmRhdGEuX2RvLlByb2Nlc3NpbmdTdGF0dXNDZCA9IDI7XG4gICAgfVxuICAgIFxuICAgIC8vdG9kbzogcmVzdGlmeSB0aGUgcmVzcG9uc2VcbiAgICAvL3RvZG86IGRlY3J5cHQgbGluZSBpdGVtcyBcblxuICAgIGxldCBmb3JtID0gcmVzLmxvY2Fscy5kYXRhLl9kb2M7XG4gICAgaWYgKHJlcS5ib2R5LkZvcm1UeXBlICA9PSAxMDEzMSkge1xuICAgICAgICBcbiAgICAgICAgLy8gcHV0IGtub3duIHNlY2lvbnMvZmllbGRzIGludG8gc2VjdGlvbnMgJiBMaW5lSXRlbSBhcnJheXMgc28gY2FuIHVzZSBkZWZpbmVkIHNjaGVtYSBpbiBtb25nb29zZS5cbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZm9ybS5TZWN0aW9ucy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICBsZXQgdGhpc1NlY0lkID0gZm9ybS5TZWN0aW9uc1tpXS5TZWN0aW9uSWQ7XG4gICAgICAgICAgICBmb3JtW3RoaXNTZWNJZF0gPSB7fTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBmb3JtLlNlY3Rpb25zW2ldLkxpbmVJdGVtcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGxldCB0aGlzRmllbGRJZCA9IGZvcm0uU2VjdGlvbnNbaV0uTGluZUl0ZW1zW2pdLkZpZWxkSWQ7XG4gICAgICAgICAgICAgICAgZm9ybVt0aGlzU2VjSWRdW3RoaXNGaWVsZElkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggOiBmb3JtLlNlY3Rpb25zW2ldLkxpbmVJdGVtc1tqXS5GaWVsZEluZGV4LFxuICAgICAgICAgICAgICAgICAgICBfdmFsdWUgOiBmb3JtLlNlY3Rpb25zW2ldLkxpbmVJdGVtc1tqXS5WYWx1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvL2RlbGV0ZSBzdHBGb3JtLlNlY3Rpb25zO1xuICAgICAgICBcbiAgICB9XG4gICAgY29uc29sZS5sb2coXCIrKysrKysrKysrKyBhbGwgZG9uZSBoZXJlICsrKysrKysrKysrKysrKytcIik7XG4gICAgcmVzLnN0YXR1cyhyZXMubG9jYWxzLnN0YXR1cykuc2VuZChmb3JtKTtcbn07XG5cbi8vIERlbGV0ZXMgdGhlIGZvcm0gc3BlY2lmaWVkIGluIHRoZSB1cmwgZnJvbSB0aGUgZGF0YWJhc2VcbmV4cG9ydCBmdW5jdGlvbiBkZWxldGVGb3JtKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6ZXhwcmVzcy5OZXh0RnVuY3Rpb24pIHtcbiAgICBjb25zdCBsb29rdXA6IGZvcm1RdWVyeVR5cGUgPSB0dXJuVVJMU3RlbXNJbnRvTG9va3VwT2JqZWN0KHJlcSwgbmV4dCk7XG5cbiAgICBGb3JtLmZpbmRPbmVBbmRSZW1vdmUobG9va3VwLGZ1bmN0aW9uKGVycjphbnksIGZvcm06YW55KSB7XG4gICAgICAgIGlmIChlcnIpIHJldHVybiByZXMuc3RhdHVzKDUwMCkuc2VuZChcIlRoZXJlIHdhcyBhIHByb2JsZW0gZmluZGluZyB0aGUgZm9ybS5cIiArIGVycik7XG4gICAgICAgIGlmICghZm9ybSkgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5zZW5kKGBGb3JtIG5vdCBmb3VuZCAtIGZvciBkZWxldGUgb3BlcmF0aW9uIHdpdGgga2V5czogJHtKU09OLnN0cmluZ2lmeShsb29rdXApfWApO1xuICAgICAgICBlbHNlIHJlcy5zdGF0dXMoMjAwKS5zZW5kKGBGb3JtIGRlbGV0ZWQgLSB3aXRoIGtleXMgJHtKU09OLnN0cmluZ2lmeShsb29rdXApfWApO1xuICAgIH0pO1xufTtcblxuLy8gLy8gVVBEQVRFUyBBIFNJTkdMRSBGT1JNIC0gVEhJUyBTSE9VTEQgTkVWRVIgQkUgVVNFRCAoT1VUU0lERSBPRiBURVNUSU5HKSBCRUNBVVNFIE5PT05FIFdJTEwgS05PVyBUSEUgX0lEXG4vLyByb3V0ZXIucHV0KCcvRm9ybXMvOmlkJywgcHV0Rm9ybVdpdGhJZCk7XG5cbi8vIGZ1bmN0aW9uIHB1dEZvcm1XaXRoSWQgKHJlcTpleHByZXNzLlJlcXVlc3QsIHJlczpleHByZXNzLlJlc3BvbnNlKSB7XG4vLyAgICAgY29uc29sZS5sb2cocmVxLmJvZHkpO1xuLy8gICAgIGNvbnN0IG5leHR4ID0gKCkgPT4ge307XG4vLyAgICAgY29uc3QgbG9va3VwOiBmb3JtUXVlcnlUeXBlID0gdHVyblVSTFN0ZW1zSW50b0xvb2t1cE9iamVjdChyZXEsIG5leHR4KTtcbi8vICAgICBjb25zb2xlLmxvZyhgUG9zdGVkIGJvZHkgZm9yIHVwZGF0ZSAke0pTT04uc3RyaW5naWZ5KHJlcS5ib2R5KX1gKTtcbiAgICBcbi8vICAgICBsZXQgbmV3Qm9keSA9IHNldEZvb3RwcmludFByb3BlcnRpZXMocmVxLmJvZHksdHJ1ZSk7XG4vLyAgICAgY29uc29sZS5sb2coXCJBYm91dCB0byBhcHBseSB1cGRhdGUgdG86IFwiICsgcmVxLnBhcmFtcy5faWQgKyBcIiB3aXRoIGJvZHkgXCIgKyBKU09OLnN0cmluZ2lmeShuZXdCb2R5KSk7XG4gICAgXG4vLyAgICAgRm9ybS5maW5kQnlJZEFuZFVwZGF0ZShyZXEucGFyYW1zLl9pZCwgbmV3Qm9keSwge3Vwc2VydDpmYWxzZSwgbmV3OiB0cnVlfSwgZnVuY3Rpb24gKGVycjogYW55LCBmb3JtOiBhbnkpIHtcbi8vICAgICBpZiAoZXJyKSByZXR1cm4gcmVzLnN0YXR1cyg1MDApLnNlbmQoXCJUaGVyZSB3YXMgYSBwcm9ibGVtIHVwZGF0aW5nIHRoZSBmb3JtLlwiKTtcbi8vICAgICAgICAgcmVzLnN0YXR1cygyMDApLnNlbmQoZm9ybSk7XG4vLyAgICAgfSk7ICBcbi8vIH07IFxuXG4vLyBDUkVBVEVTIEEgTkVXIEZPUk0gLSBkb24ndCB0aGluayB3ZSBuZWVkIHRoaXMhISAgSnVzdCBtZWFucyB0aGUgY29uc3VtZXIgbXVzdCBzdXBwbHkgYSB2YWxpZCBiZXQjIGFuZCBjYWxsIHB1dFxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUZvcm0ocmVxOiBhbnksIHJlczogYW55KSB7XG4gICAgY29uc29sZS5sb2coJ0luc2lkZSBwb3N0Jyk7XG4gICAgY29uc29sZS5sb2coJ3JlcS5ib2R5OiAnICsgcmVxLmJvZHkpO1xuXG4gICAgLy90b2RvOiBpZiB0aGlzIGlzIG5vdCB0aHJvd24gYXdheTpcbiAgICAvL3RvZG86IC0gZW5zdXJlIHVyaSBpbmZvIG1hdGNoZWQgYWdhaW5zdCBoZWFkZXIsIFxuICAgIC8vdG9kbzogLSBzZXR1cCBmb290cHJpbnQgaW5mb1xuICAgIC8vdG9kbzogLSBzZWxlY3RpdmVseSBlbmNyeXB0IGxpbmUgaXRlbXNcbiAgICAvL3RvZG86IC0gY2FsbCBqc3JlIHZhbGlkYXRpb24gcnVsZXNcblxuXG4gICAgRm9ybS5jcmVhdGUocmVxLmJvZHksXG4gICAgICAgIGZ1bmN0aW9uIChlcnI6IG1vbmdvb3NlLkVycm9yLCBmb3JtOiBtb25nb29zZS5Nb2RlbDxtb25nb29zZS5Eb2N1bWVudD4gKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncG9zdCBjYWxsIGJhY2sgcmVjZWl2ZWQnKTtcbiAgICAgICAgICAgIGlmIChlcnIpIHJldHVybiByZXMuc3RhdHVzKDUwMCkuc2VuZChcIlRoZXJlIHdhcyBhIHByb2JsZW0gYWRkaW5nIHRoZSBpbmZvcm1hdGlvbiB0byB0aGUgZGF0YWJhc2UuXFxuXCIgKyBlcnIubWVzc2FnZSApO1xuXG4gICAgICAgICAgICAvL3RvZG86IGFwcGx5IGZvcm0gdXBkYXRlIHJ1bGVzXG4gICAgICAgICAgICAvL3RvZG86IHJlc3RpZnkgdGhlIHJlc3BvbnNlXG4gICAgICAgICAgICAvL3RvZG86IGRlY3J5cHQgbGluZSBpdGVtcyBcblxuICAgICAgICAgICAgcmVzLnN0YXR1cygyMDApLnNlbmQoZm9ybSk7XG4gICAgICAgIH0pO1xufTtcblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjb2RlTG9va3VwKGRlY29kZTpTdHJpbmcpOiBudW1iZXJ7XG4gICAgLy90b2RvOiBkdW1teVxuICAgIGlmKGRlY29kZSA9PSBcIklUXCIpIHJldHVybiA1O1xuICAgIGlmKGRlY29kZSA9PSBcIkdTVFwiKSByZXR1cm4gMTA7XG4gICAgaWYoZGVjb2RlID09IFwiU1RQXCIpIHJldHVybiA2NjtcbiAgICByZXR1cm4gLTE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRlcm5hbElkTG9va3VwKENsaWVudElkZW50aWZpZXJUeXBlOlwiQUJOXCIgfCBcIlRGTlwiIHwgXCJXUE5cIiwgQ2xpZW50SWRlbnRpZmllclZhbHVlOiBzdHJpbmcpOiBmb3JtUXVlcnlUeXBlIHtcbiAgICAvL3RvZG86IHdyaXRlIGZ1bmN0aW9uXG4gICAgcmV0dXJuIHtDbGllbnRJbnRlcm5hbElkOjEyMzQ1fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSByb3V0ZXI7Il19