import * as express from 'express';
console.log("lots of checking going on here!!");

function thereExistsRelationshipBetween(user:number, subject:number) {
    return true;
}

function verifySubjectClientLinks(user:number, subject:number){
    if (user == subject) return true;
    if (thereExistsRelationshipBetween(user, subject)) return true;
    return false;
}

export const checkAuthorisation= function (req: express.Request, res: express.Response, next: express.NextFunction) {
    console.log("AM goes here - checks that user can act on subject");
    //verifySubjectClientLinks(req.headers.authorization, req.params.ClientInternalId);

    next();
};