"use strict";
exports.__esModule = true;

const mySimpleyObjectCompare = function ( x, y, ignoreList ) {
    console.log("Comparing " + JSON.stringify(x));
  if ( x === y ) return true;
    // if both x and y are null or undefined and exactly the same

  if ( ! ( x instanceof Object ) || ! ( y instanceof Object ) ) return false;
    // if they are not strictly equal, they both need to be Objects

  for ( var p in x ) {
      
    //if (p == "_id" || p == "__v" || p== "createdAt" || p=="updatedAt" || p=="DT_Update" || p == "TM_Update") continue;
    if (ignoreList.indexOf(p) >= 0) continue;
     
    if ( ! x.hasOwnProperty( p ) ) continue;
      // other properties were tested using x.constructor === y.constructor -- nah i removved tht as I don't have any fancy stuff

    if ( ! y.hasOwnProperty( p ) ) return "received has extra property: " + p;
      // allows to compare x[ p ] and y[ p ] when set to undefined

    if ( x[ p ] === y[ p ] ) continue;
      // if they have the same strict value or identity then they are equal
      

    if ( typeof( x[ p ] ) !== "object" ) return  "Value mismatch on property: " + p + " received property " + x[p] + " expected value " + (y[p] || "");
      // Numbers, Strings, Functions, Booleans must be strictly equal

    let recursiveCheck = mySimpleyObjectCompare( x[ p ],  y[ p ], ignoreList );
    if ( ! recursiveCheck ) return  "Object/Array " + p + " failed in " + recursiveCheck;
      // Objects and Arrays must be tested recursively
  }

  for ( p in y ) {
    if ( y.hasOwnProperty( p ) && ! x.hasOwnProperty( p ) ) return "expected has extra property: " + p;
      // allows x[ p ] to be set to undefined
  }
  return true;
}

const standardForm = function (override) {
        let postData = {};
        postData.TransactionId = override.TransactionId || 1; 
        postData.ClientIdentifierType = override.ClientIdentifierType || "ABN";
        postData.ClientIdentifierValue= override.ClientIdentifierValue || 1234567890;
        postData.AccountSequenceNumber = override.AccountSequenceNumber || 1;

        if (override.DT_Update) postData.DT_Update = override.DT_Update;
        if (override.TM_Update) postData.TM_Update = override.TM_Update;
        postData.Sections= [
          {
              "SectionId": "1",
              "SectionName": "Fred",
              "LineItems": [{
                  "FieldId": "1",
                  "FieldIndex": 0,
                  "Value": "1111's"
                  },{
                  "FieldId": "2",
                  "FieldIndex": 0,
                  "Value": "222's"
                }
              ]       
          },         {
              "SectionId": "2",
              "SectionName": "Mary",
              "LineItems": [{
                  "FieldId": "1",
                  "FieldIndex": 0,
                  "Value": "more 1111's"
                  },{
                  "FieldId": "3",
                  "FieldIndex": 0,
                  "Value": "333's"
                }
              ]       
          }
      ]
     
    return postData;
}

const standardHeader = function (override) {
  let vm ={};
  // vm.clientInternalId = override.clientInternalId || "";  this will be derived, so not set up in test data
  // vm.accountId = override.clientAccountId || "";
  vm.clientAccountSequenceNumber = override.clientAccountSequenceNumber || 1;
  vm.roleType = override.clientRoleTypeCode || 5;
  vm.periodBeginDate = override.formPeriodBeginDate || "2016-07-01";
  vm.periodEndDate = override.formPeriodEndDate || "9999-12-31";

  vm.transactionId = override.coreProcessingTransactionId || 1;
  vm.transactionType = override.coreProcessingTransactionTypeCode || -1
  vm.linkedTransactionId = override.sourceCoreProcessingTransactionId || 1
  //vm.suspendedClientInternalId( || "";

  vm.formYear = override.formYear || "2019";
  vm.formMonth = override.formMonthNumber || -1;

  vm.receivedDate = override.formReceivedDate || "2019-01-23";
  vm.lodgmentCompletedDate = override.formCompletedDate || "2019-01-23";
  vm.batchId = override.formBatchId || -1;
  //vm.externalBatchId( || "";
  //vm.externalAgency( || "";
  vm.channelUsed = override.channelTypeCode || 24;

  vm.updateUserId = override.coreProcessingTransactionLastUpdatedById || "Fred";
  vm.updateSource = override.coreProcessingTransactionLastUpdatedSourceCode || -1;
  vm.updateReason = override.coreProcessingTransactionLastUpdatedReasonCode || -1;  
  return vm;
}

//LM Todo: check this is OK.  I couldn't find the actual Object defintion used by JSRE, so I've fudged this.
function VMValueClosure(v) {
  return function() {
    return v;
  }
}
 
const standardPayrollEventChild= function (vm, override) {    
    
    // OTH-PAYEE_DTLS - 10931
    vm.oTH_PAYER_DTLS_ClientExternalID = override.oTH_PAYER_DTLS_ClientExternalID || new VMValueClosure(1234567890);

    vm.oTH_PAYER_DTLS_ClientExternalIdentifierTypeCode = override.oTH_PAYER_DTLS_ClientExternalIdentifierTypeCode || new VMValueClosure("ABN");
    vm.oTH_PAYER_DTLS_UnstructuredFullName = override.oTH_PAYER_DTLS_UnstructuredFullName || new VMValueClosure("Big Boss Inc");
    vm.oTH_PAYER_DTLS_DerivedClientIdentifierAustralianBusinessNumber = override.oTH_PAYER_DTLS_DerivedClientIdentifierAustralianBusinessNumber || new VMValueClosure("");
    vm.oTH_PAYER_DTLS_DerivedUnstructuredFullName = override.oTH_PAYER_DTLS_DerivedUnstructuredFullName || new VMValueClosure("");
    vm.oTH_PAYER_DTLS_BusinessMangamentSoftwareIdentifier = override.oTH_PAYER_DTLS_BusinessMangamentSoftwareIdentifier || new VMValueClosure("");
    vm.oTH_PAYER_DTLS_EmployerBranchCode = override.oTH_PAYER_DTLS_EmployerBranchCode || new VMValueClosure(1);
    vm.oTH_PAYER_DTLS_DerivedClientBranchNumber = override.oTH_PAYER_DTLS_DerivedClientBranchNumber || new VMValueClosure(1);

    // OTH-PAYEE_DTLS - 10932
    vm.oTH_PAYEE_DTLS_CurrentPayerPayeeRelationshipPayeePayrollIdentifier = override.oTH_PAYEE_DTLS_CurrentPayerPayeeRelationshipPayeePayrollIdentifier || new VMValueClosure("111");
    vm.oTH_PAYEE_DTLS_PayerPayeeRelationshipCommencementDate = override.oTH_PAYEE_DTLS_PayerPayeeRelationshipCommencementDate || new VMValueClosure("1965-04-01");
    vm.oTH_PAYEE_DTLS_PayerPayeeRelationshipCessationDate = override.oTH_PAYEE_DTLS_PayerPayeeRelationshipCessationDate || new VMValueClosure("9999-12-31");
    vm.oTH_PAYEE_DTLS_ClientIdentifierTaxFileNumber = override.oTH_PAYEE_DTLS_ClientIdentifierTaxFileNumber || new VMValueClosure("123456789");
    vm.oTH_PAYEE_DTLS_ContractorClientIdentifierAustralianBusinessNumber = override.oTH_PAYEE_DTLS_ContractorClientIdentifierAustralianBusinessNumber || new VMValueClosure("10987654321");
    vm.oTH_PAYEE_DTLS_StructuredFamilyName = override.oTH_PAYEE_DTLS_StructuredFamilyName || new VMValueClosure("Blogs");
    vm.oTH_PAYEE_DTLS_StructuredGivenName = override.oTH_PAYEE_DTLS_StructuredGivenName || new VMValueClosure("Mary");
    vm.oTH_PAYEE_DTLS_StructuredOtherGivenName = override.oTH_PAYEE_DTLS_StructuredOtherGivenName || new VMValueClosure("");
    vm.oTH_PAYEE_DTLS_IndividualBirthDate = override.oTH_PAYEE_DTLS_IndividualBirthDate || new VMValueClosure("1950-04-01");
    vm.oTH_PAYEE_DTLS_UnstructuredGeographicAddressLine1 = override.oTH_PAYEE_DTLS_UnstructuredGeographicAddressLine1 || new VMValueClosure("3 Somewhere Pl");
    vm.oTH_PAYEE_DTLS_UnstructuredGeographicAddressLine2 = override.oTH_PAYEE_DTLS_UnstructuredGeographicAddressLine2 || new VMValueClosure("");
    vm.oTH_PAYEE_DTLS_StructuredGeographicAddressLocalityName = override.oTH_PAYEE_DTLS_StructuredGeographicAddressLocalityName || new VMValueClosure("NowheresVill");
    vm.oTH_PAYEE_DTLS_StructuredGeographicAddressStateCode = override.oTH_PAYEE_DTLS_StructuredGeographicAddressStateCode || new VMValueClosure("ACT");
    vm.oTH_PAYEE_DTLS_StructuredGeographicAddressPostcode = override.oTH_PAYEE_DTLS_StructuredGeographicAddressPostcode || new VMValueClosure("1234");
    vm.oTH_PAYEE_DTLS_CountryCode = override.oTH_PAYEE_DTLS_CountryCode || new VMValueClosure("");
    vm.oTH_PAYEE_DTLS_PayeeInternetEmailAddress = override.oTH_PAYEE_DTLS_PayeeInternetEmailAddress || new VMValueClosure("Mary@gmail.com");
    vm.oTH_PAYEE_DTLS_PayeeTelephoneNumber = override.oTH_PAYEE_DTLS_PayeeTelephoneNumber || new VMValueClosure("0412345678");

    // OTH-PAYROLL_EVNT - 10933
    vm.oTH_PAYROLL_EVNT_PayrollEventPeriodStartDate = override.oTH_PAYROLL_EVNT_PayrollEventPeriodStartDate || new VMValueClosure("2019-01-15");
    vm.oTH_PAYROLL_EVNT_PayrollEventPeriodEndDate = override.oTH_PAYROLL_EVNT_PayrollEventPeriodEndDate || new VMValueClosure("2019-01-22");
    vm.oTH_PAYROLL_EVNT_FinancialYear = override.oTH_PAYROLL_EVNT_FinancialYear || new VMValueClosure(2019);
    vm.oTH_PAYROLL_EVNT_LodgmentDate = override.oTH_PAYROLL_EVNT_LodgmentDate || new VMValueClosure("2019-01-23");
    vm.oTH_PAYROLL_EVNT_PaymentDate = override.oTH_PAYROLL_EVNT_PaymentDate || new VMValueClosure("2019-01-23");
    vm.oTH_PAYROLL_EVNT_PayrollMessageTimestampSourceDatetime = override.oTH_PAYROLL_EVNT_PayrollMessageTimestampSourceDatetime || new VMValueClosure("");
    vm.oTH_PAYROLL_EVNT_PayrollEventFinalIndicator = override.oTH_PAYROLL_EVNT_PayrollEventFinalIndicator || new VMValueClosure("N");

    // OTH-WAGE_AND_TAX_ITEM - 10936
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeForeignIncomeExemptAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeForeignIncomeExemptAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeIncomeCommunityDevelopmentEmploymentProjectAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeIncomeCommunityDevelopmentEmploymentProjectAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeAnnualLongServiceLeaveUnusedLumpSumACode = override.oTH_WAGE_AND_TAX_ITEM_PayeeAnnualLongServiceLeaveUnusedLumpSumACode || new VMValueClosure("");
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeAnnualLongServiceLeaveUnusedLumpSumAAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeAnnualLongServiceLeaveUnusedLumpSumAAmount || new VMValueClosure(10000.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeAnnualLongServiceLeaveUnusedLumpSumBAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeAnnualLongServiceLeaveUnusedLumpSumBAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeAnnualLongServiceLeaveUnusedLumpSumDAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeAnnualLongServiceLeaveUnusedLumpSumDAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeAnnualLongServiceLeaveUnusedLumpSumEAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeAnnualLongServiceLeaveUnusedLumpSumEAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeYearToDateIncomeGrossAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeYearToDateIncomeGrossAmount || new VMValueClosure(12000.01);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeForeignIncomeEmploymentGrossAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeForeignIncomeEmploymentGrossAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeForeignIncomeEmploymentJointPetroleumDevelopmentAreaGrossAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeForeignIncomeEmploymentJointPetroleumDevelopmentAreaGrossAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeIncomeLabourHireArrangementGrossAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeIncomeLabourHireArrangementGrossAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeIncomeVoluntaryAgreementGrossAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeIncomeVoluntaryAgreementGrossAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeIncomeOtherAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeIncomeOtherAmount || new VMValueClosure(12000.01);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeIncomeWorkingHolidayMakerYearToDateGrossAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeIncomeWorkingHolidayMakerYearToDateGrossAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeFringeBenefitsReportableTaxableAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeFringeBenefitsReportableTaxableAmount || new VMValueClosure(50.50);
    vm.oTH_WAGE_AND_TAX_ITEM_PayeeFringeBenefitsReportableExemptAmount = override.oTH_WAGE_AND_TAX_ITEM_PayeeFringeBenefitsReportableExemptAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingYearToDateWithheldAmount = override.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingYearToDateWithheldAmount || new VMValueClosure(3000.03);
    vm.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingForeignEmploymentIncomeTotalAmount = override.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingForeignEmploymentIncomeTotalAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingForeignEmploymentIncomeJointPetroleumDevelopmentAreaTotalAmount = override.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingForeignEmploymentIncomeJointPetroleumDevelopmentAreaTotalAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingLabourHireTotalAmount = override.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingLabourHireTotalAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingVoluntaryAgreementTotalAmount = override.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingVoluntaryAgreementTotalAmount || new VMValueClosure(50.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingOtherSpecifiedTotalAmount = override.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingOtherSpecifiedTotalAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingWorkingHolidayMakerYearToDateTotalAmount = override.oTH_WAGE_AND_TAX_ITEM_PayAsYouGoWithholdingWorkingHolidayMakerYearToDateTotalAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_YearToDateForeignIncomeEmploymentTaxCreditWithheldAmount = override.oTH_WAGE_AND_TAX_ITEM_YearToDateForeignIncomeEmploymentTaxCreditWithheldAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_JointPetroleumDevelopmentAreaForeignIncomeEmploymentTaxPaidYearToDateAmount = override.oTH_WAGE_AND_TAX_ITEM_JointPetroleumDevelopmentAreaForeignIncomeEmploymentTaxPaidYearToDateAmount || new VMValueClosure(0.00);
    vm.oTH_WAGE_AND_TAX_ITEM_PaymentSummaryTotalGrossPaymentAmount = override.oTH_WAGE_AND_TAX_ITEM_PaymentSummaryTotalGrossPaymentAmount || new VMValueClosure(30000.30);
    vm.oTH_WAGE_AND_TAX_ITEM_TaxWithheldTotalAmount = override.oTH_WAGE_AND_TAX_ITEM_TaxWithheldTotalAmount || new VMValueClosure(3000.03);
    
    if (override.oTH_WAGE_AND_TAX_ITEM_SectionGroup5s) 
      vm.oTH_WAGE_AND_TAX_ITEM_SectionGroup5s = override.oTH_WAGE_AND_TAX_ITEM_SectionGroup5s || function() {let r = [{}]; return r };
    else {
      vm.oTH_WAGE_AND_TAX_ITEM_SectionGroup5s = new VMValueClosure([{}]);
      vm.oTH_WAGE_AND_TAX_ITEM_SectionGroup5s()[0].oTH_WAGE_AND_TAX_ITEM_EmploymentTerminationPaymentTypeCode = new VMValueClosure("A");
      vm.oTH_WAGE_AND_TAX_ITEM_SectionGroup5s()[0].oTH_WAGE_AND_TAX_ITEM_EmploymentTerminationPaymentPaymentDate = new VMValueClosure("2017-04-01");
      vm.oTH_WAGE_AND_TAX_ITEM_SectionGroup5s()[0].oTH_WAGE_AND_TAX_ITEM_EmploymentTerminationPaymentTaxWithheldTotalAmount = new VMValueClosure(200.02);
      vm.oTH_WAGE_AND_TAX_ITEM_SectionGroup5s()[0].oTH_WAGE_AND_TAX_ITEM_EmploymentTerminationPaymentTaxFreeAmount = new VMValueClosure(199.99);
      vm.oTH_WAGE_AND_TAX_ITEM_SectionGroup5s()[0].oTH_WAGE_AND_TAX_ITEM_EmploymentTerminationPaymentTaxableComponentAmount = new VMValueClosure(0.03);
    }

    // OTH-DEDUCTION_ITEM - 10939
      if (override.oTH_DEDUCTION_ITEM_SectionGroup3s)
        vm.oTH_DEDUCTION_ITEM_SectionGroup3s = override.oTH_DEDUCTION_ITEM_SectionGroup3s;
      else {
        vm.oTH_DEDUCTION_ITEM_SectionGroup3s = new VMValueClosure([{}]);
        vm.oTH_DEDUCTION_ITEM_SectionGroup3s()[0].oTH_DEDUCTION_ITEM_IndividualDeductionTypeCode = new VMValueClosure("3");
        vm.oTH_DEDUCTION_ITEM_SectionGroup3s()[0].oTH_DEDUCTION_ITEM_IndividualDeductionYearToDateAmount  = new VMValueClosure(2.23);
      }

    // OTH-ALLOWANCE_ITEM - 10941
    vm.oTH_ALLOWANCE_ITEM_AllowanceIncomeTotalAmount = override.oTH_ALLOWANCE_ITEM_AllowanceIncomeTotalAmount || new VMValueClosure("");
        
    if (override.oTH_ALLOWANCE_ITEM_SectionGroup4s) 
      vm.oTH_ALLOWANCE_ITEM_SectionGroup4s = override.oTH_ALLOWANCE_ITEM_SectionGroup4s;
    else {        
      vm.oTH_ALLOWANCE_ITEM_SectionGroup4s = new VMValueClosure([{}]);
      vm.oTH_ALLOWANCE_ITEM_SectionGroup4s()[0].oTH_ALLOWANCE_ITEM_AllowanceIncomeTypeCode = new VMValueClosure("B");
      vm.oTH_ALLOWANCE_ITEM_SectionGroup4s()[0].oTH_ALLOWANCE_ITEM_AllowanceIncomeTypeOtherDescriptionText = new VMValueClosure("Lunch Money");
      vm.oTH_ALLOWANCE_ITEM_SectionGroup4s()[0].oTH_ALLOWANCE_ITEM_AllowanceIncomeYearToDateAmount = new VMValueClosure("144.12");
    }

    // OTH-SUPER_ENTITLEMENT - 10943
    vm.oTH_SUPER_ENTITLEMENT_YearToDateSuperannuationGuaranteeEmployerContributionAmount = override.oTH_SUPER_ENTITLEMENT_YearToDateSuperannuationGuaranteeEmployerContributionAmount || new VMValueClosure(2222.22);
    vm.oTH_SUPER_ENTITLEMENT_YearToDateSuperannuationGuaranteeOrdinaryTimeEarningsAmount = override.oTH_SUPER_ENTITLEMENT_YearToDateSuperannuationGuaranteeOrdinaryTimeEarningsAmount || new VMValueClosure(1111.11);
    vm.oTH_SUPER_ENTITLEMENT_EmployerSuperannuationContributionReportableAmount = override.oTH_SUPER_ENTITLEMENT_EmployerSuperannuationContributionReportableAmount || new VMValueClosure(1212.12);

    // OTH-TFN_DECLARATION - 11303
    vm.oTH_TFN_DECLARATION_PayerPayeeRelationshipPaymentBasisCode = override.oTH_TFN_DECLARATION_PayerPayeeRelationshipPaymentBasisCode || new VMValueClosure("C");
    vm.oTH_TFN_DECLARATION_PayeeClientResidentStatusCode = override.oTH_TFN_DECLARATION_PayeeClientResidentStatusCode || new VMValueClosure("E");
    vm.oTH_TFN_DECLARATION_PayerPayeeRelationshipTaxFreeThresholdClaimedIndicator = override.oTH_TFN_DECLARATION_PayerPayeeRelationshipTaxFreeThresholdClaimedIndicator || new VMValueClosure("Y");
    vm.oTH_TFN_DECLARATION_PayerPayeeRelationshipStudyandTrainingLoanRepaymentClaimedIndicator = override.oTH_TFN_DECLARATION_PayerPayeeRelationshipStudyandTrainingLoanRepaymentClaimedIndicator || new VMValueClosure("N");
    vm.oTH_TFN_DECLARATION_PayerPayeeRelationshipStudentFinancialSupplementDebtClaimedIndicator = override.oTH_TFN_DECLARATION_PayerPayeeRelationshipStudentFinancialSupplementDebtClaimedIndicator || new VMValueClosure("N");
    vm.oTH_TFN_DECLARATION_PayeeDeclarationIndicator = override.oTH_TFN_DECLARATION_PayeeDeclarationIndicator || new VMValueClosure("Y");
    vm.oTH_TFN_DECLARATION_PayeeDeclarationDate = override.oTH_TFN_DECLARATION_PayeeDeclarationDate || new VMValueClosure("1770-04-29");
    vm.oTH_TFN_DECLARATION_PayerPayeeRelationshipTerminatedIndicator = override.oTH_TFN_DECLARATION_PayerPayeeRelationshipTerminatedIndicator || new VMValueClosure("N");

  return vm;
}

exports.mySimpleyObjectCompare = mySimpleyObjectCompare;
exports.standardForm = standardForm;
exports.standardHeader = standardHeader;
exports.standardPayrollEventChild = standardPayrollEventChild;