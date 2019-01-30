// all this does is export an array of available get/put routes (URI permutations)
// ./FormController uses this info to register routes; it also registers a few other routes

import * as express from 'express';

const clientLevel = '/:ClientIdentifierType/:ClientIdentifierValue';
const accountLevel = '/:ClientIdentifierType/:ClientIdentifierValue/Accounts/:AccountSequenceNumber';
const roleLevel = '/:ClientIdentifierType/:ClientIdentifierValue/Accounts/:AccountSequenceNumber/Roles/:RoleTypeShortDecode';
const roleOnlyLevel = '/:ClientIdentifierType/:ClientIdentifierValue/Roles/:RoleTypeShortDecode';
const carpatlevel = [clientLevel, accountLevel, roleLevel, roleOnlyLevel];

const period = ['/PeriodStartDt/:PeriodStartDt', ''];

const draftForm = '/DraftForms';
const processedForm = '/ProcessedForms';
const undecidedForm = '/Forms';
const formFlavours = [draftForm, processedForm, undecidedForm];

const formTypenoId = '/:FormTypeMung';
const formTypeWithId = '/:FormTypeMung/:TransactionId';
const formSuffix = [formTypenoId, formTypeWithId];

export let formRoutes:string[] = [];

export function setUpGetRoutes(router: express.Router, getForms: any, putForm: any) {
    console.log(`Adding route to routers....`);
    carpatlevel.forEach((a) => period.forEach((b) => formFlavours.forEach((c) => formSuffix.forEach((d) => {
        let r = a + b + c + d;
        formRoutes.push(r);
    }))));
}