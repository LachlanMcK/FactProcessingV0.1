Purpose
=======
A PoC to demonstrate how easy it would be to process informational forms in the cloud and thus save large amounts of mainframe MIPS.  Hopefully will be evolved over time to a real solution.

## To run this soluiton:

1. clone repository
	* rename FactProcessingV0.1 forms (sorry, I reference the name forms - this needs to be fixed up)
    * add oTH_PAYROLL_EVENT_CHILDForm.js & 
    * add .env files (have a squiz at .env-sample 
        this points to mongo, so either install Mongo (see below) or point to a MongoLab installation
    * add addtional files not in github (directories Scripts & services)
        ** these exist outside of the git directory becaues of one of 2 reasons either:
			*** it contains reference data and I'm not sure if this stuff is public, 
			*** I stuffed up - I was following the ATO Online directory structure and it lead me to put stuff outside of what I initially though was my git folder (I nedded to fix this up)
		** when uploading these directories make sure they are both siblings to "forms"

2. npm install (to down load the latest dependencies)
	* make sure you do this from inside the "forms" subdirectory (this is where the package.json file lives)
3. npm run built-ts
4. npm run test

## Structure of solution

./forms/server.js - is the initial entry
./forms/app.js - sets up app level express routes.  There is only one app level route: '/api/v1/Clients' which talks to the FormController
./forms/form/FormController.ts - handles the form specific routes, e.g applevel +  /:ClientIdentifierType/:ClientIdentifierValue/Forms/:FormTypeMung...etc
./forms/form/Form.ts - the mongoose defintion for forms
./forms/form/*.ts - a few other greebly helper stuff
./forms/jsre/* - all the jsre code
./forms/jsre/forms/* - the generated form defintion
./forms/jsre/externalFunctions/* - self explanatory
./forms/(addMissingBrowserStuff.js | dependenciesMap.js | loadRulesEngineWithPatches.js) - mostly point in time work around

./Security/* - not yet implemented but imagined to be express middleware to hook into ISF/AM and other security related things.

*./tests/app.test.js* - rudimentary jest test for automated tests
./tests/ *.sh & *.json - initial test done using curl - probably should be removed.

## Installing mongo in cloud 9
* these instructions worked for me: https://github.com/nax3t/aws-cloud9-instructions

* touch mongodb-org-3.6.repo
    
* Pu t this in the file:
<div>
    [mongodb-org-3.6]
    name=MongoDB Repository
    baseurl=https://repo.mongodb.org/yum/amazon/2013.03/mongodb-org/3.6/x86_64/
    gpgcheck=1
    enabled=1
    gpgkey=https://www.mongodb.org/static/pgp/server-3.6.asc
</div>
    
* sudo mv mongodb-org-3.6.repo /etc/yum.repos.d
* sudo yum install -y mongodb-org
* mkdir data
* echo 'mongod --dbpath=data --nojournal' > mongod
* chmod a+x mongod
* ./mongod