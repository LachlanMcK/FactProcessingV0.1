import * as express from 'express';
console.log("lots of checking going on here!!");

export const checkAuthentication = function (req: express.Request, res: express.Response, next: express.NextFunction) {
    console.log("ISF goes here");
    next();
};