//import  mongoose from "mongoose";
//import * as mongoose  from "mongoose";
import mongoose = require('mongoose');  //https://stackoverflow.com/questions/34482136/mongoose-the-typescript-way

// define the shape of the Line Items part of Forms
const LineItemDef =  {
  FieldId: String,
  FieldIndex: Number,
  Value: Object
}

let LineItemsSchema = new mongoose.Schema(LineItemDef);

// define the shape of the sections part of Forms
// sections are made up of Line Items
const SectionDef = {
  SectionId: String,
  SectionName: String,
  LineItems: [LineItemsSchema]
}

let SectionSchema = new mongoose.Schema(SectionDef);

// define the shape of Forms
// Forms are made up of Sections which are made up of Line Items
const FormDef = {
  ClientInternalId: {
    type: Number,
    required: true},
  AccountSequenceNumber: Number,
  RoleTypeCode: Number,
  PeriodStartDt: Date,
  FormType: {
    type: String,
    required: true},
  TransactionId: {
    type: Number,
    required: true}, 
  workItemId: String,
  Sections: [SectionSchema],
  createdAt: Date,
  updatedAt: Date,
  DT_Update: String,
  TM_Update: String
  };

let FormSchema = new mongoose.Schema(FormDef);

//This is the default
const FormCollectionDetails = {
  collection: 'Forms',
  versionKey: false
}

export function setFootprintProperties(form: any, updateOnlyFlag?:Boolean) {
  const now: Date = new Date();
  if (!form.createdAt && !(updateOnlyFlag)) {
    //todo: investigate getting this from _id  https://docs.mongodb.com/manual/reference/method/ObjectId.getTimestamp/
    form.createdAt = now;
  }
  form.updatedAt = now;
  //todo: investigate making this virtual
  form.DT_Update = now.toLocaleDateString();
  form.TM_Update = now.toLocaleTimeString();
  return form;
}

FormSchema.index({ ClientInternalId: 1, formType: 1 }); 
FormSchema.index({ TransactionId: 1 }, { unique: true }); 
FormSchema.index({ ClientInternalId: 1, AccountSequenceNumber: 1, RoleTypeCode:1 }, { unique: false }); 
FormSchema.index({ workItemId: 1 }, { sparse: true }); 

//todo: this is fine for dev but need to tidy this up
FormSchema.set('autoIndex', true);
//FormSchema.set('autoIndex', false);

export const Form: mongoose.Model<mongoose.Document> = mongoose.model('Form', FormSchema);

//module.exports = Form
