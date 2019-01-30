To run this soluiton:

clone repository
    add oTH_PAYROLL_EVENT_CHILDForm.js & 
    add .env files (have a squiz at .env-sample 
        this points to mongo, so either install Mongo (see below) or point to a MongoLab installation

npm install
npm run built-ts
npm run test






Installing mongo in cloud 9
* these instructions worked for me: https://github.com/nax3t/aws-cloud9-instructions

    touch mongodb-org-3.6.repo
    
    Pu t this in the file:
    [mongodb-org-3.6]
    name=MongoDB Repository
    baseurl=https://repo.mongodb.org/yum/amazon/2013.03/mongodb-org/3.6/x86_64/
    gpgcheck=1
    enabled=1
    gpgkey=https://www.mongodb.org/static/pgp/server-3.6.asc
    
    
    sudo mv mongodb-org-3.6.repo /etc/yum.repos.d
    sudo yum install -y mongodb-org
    mkdir data
    echo 'mongod --dbpath=data --nojournal' > mongod
    chmod a+x mongod
    
    ./mongod
