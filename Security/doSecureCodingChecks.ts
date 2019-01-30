import * as express from 'express';
import {regExs} from './secureCodingRegExes';
console.log("lots of checking going on here. Not!! (yet)");

export const doCleanInputCheck = function (req: express.Request, res: express.Response, next: express.NextFunction) {
    // let result: boolean = false;
    // var frm: string = req.body.FormTypeMung;
    // req.body.Sections.forEach((section:any) => {
    //     section.LineItems.forEach((lineItem:any) => {
    //         const reString: string = regExs[frm][<number>section.SectionId][<number>lineItem.FieldId];
    //         if (reString) {
    //             result = new RegExp(reString).test(<string> lineItem.FieldValue);
    //             if (!result) 
    //                 next(new Error("Invalid input in field" + section.SectionId + " " + lineItem.FieldId));
    //         }
    //     })
    // });
    // next();
};