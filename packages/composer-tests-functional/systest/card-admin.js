/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const  BusinessNetworkDefinition = require('composer-admin').BusinessNetworkDefinition;
const IdCard = require('composer-common').IdCard;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const AdminConnection = require('composer-admin').AdminConnection;
const os = require('os');
const fs = require('fs');
const path = require('path');

const TestUtil = require('./testutil');
const nodeUtil = require('util');
const rimraf = nodeUtil.promisify(require('rimraf'));
const rimrafOptions = { disableGlob: true };

const winston = require('winston');

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('chai-subset'));
chai.should();

winston.loggers.add('app', {
    console: {
        level: 'silly',
        colorize: true,
        label: 'card-admin.js'
    }
});
const LOG = winston.loggers.get('app');

describe.only('Admin fv tests', function() {



    let redisclean = async ()=>{
        const redis = require('redis');
        const {promisify} = require('util');
        let options={};
        let client = redis.createClient(options);
        let flushall = promisify(client.flushall).bind(client);
        await flushall();
    };

    // this.retries(TestUtil.retries());
    /**
     * @param {String} dir - the dir to walk
     * @param {Object[]} filelist - input files
     * @return {Object[]} filelist - output files
     * @private
     */
    let walkSync = function (dir, filelist) {
        let files = fs.readdirSync(dir);
        files.forEach(function (file) {
            let nestedPath = path.join(dir, file);
            if (fs.lstatSync(nestedPath).isDirectory()) {
                walkSync(nestedPath,filelist);
            } else {
                filelist.push(nestedPath);
            }
        });
        return filelist;
    };
    let cardStore;
    let bnID;
    let businessNetworkDefinition;
    let client;
    let tmpDir;
    let dirToClean;

    before(async () => {
        await TestUtil.setUp();

        const modelFiles = [
            { fileName: null, contents: fs.readFileSync(path.resolve(__dirname, 'data/cardadmin.cto'), 'utf8') }
        ];
        const scriptFiles =  [
            { identifier: 'cardadmin.js', contents: fs.readFileSync(path.resolve(__dirname, 'data/cardadmin.js'), 'utf8') }
        ];
        businessNetworkDefinition = new BusinessNetworkDefinition('systest-cardadmin@0.0.1', 'The network for the cardadmin system tests');
        modelFiles.forEach((modelFile) => {
            businessNetworkDefinition.getModelManager().addModelFile(modelFile.contents, modelFile.fileName);
        });
        scriptFiles.forEach((scriptFile) => {
            let scriptManager = businessNetworkDefinition.getScriptManager();
            scriptManager.addScript(scriptManager.createScript(scriptFile.identifier, 'JS', scriptFile.contents));
        });
        bnID = businessNetworkDefinition.getName();
        cardStore = await TestUtil.deploy(businessNetworkDefinition);
        client = await TestUtil.getClient(cardStore,'systest-cardadmin');

        // The parent directory for the new temporary directory
        tmpDir = os.tmpdir();
    });

    after(async () => {
        await TestUtil.undeploy(businessNetworkDefinition);
        await TestUtil.tearDown();
       // await redisclean();
        if (dirToClean) {
            await rimraf(dirToClean, rimrafOptions);
        }
    });

    beforeEach(async () => {
        await TestUtil.resetBusinessNetwork(cardStore,bnID, 0);
        await redisclean();
        if (dirToClean) {
            await rimraf(dirToClean, rimrafOptions);
        }
    });

    it('should be able to create an id card and import to different card store and use' , async ()=>{

        const factory = client.getBusinessNetwork().getFactory();
        let participant = factory.newResource('systest.cardadmin', 'SampleParticipant', 'bob@uk.ibm.com');
        participant.firstName = 'Bob';
        participant.lastName = 'Bobbington';
        const participantRegistry = await client.getParticipantRegistry('systest.cardadmin.SampleParticipant');
        await participantRegistry.add(participant);

        // issue an identity for this person
        let result = await client.issueIdentity('systest.cardadmin.SampleParticipant#bob@uk.ibm.com', 'bob-id-1', {});

        let metadata =  {
            userName : result.userID,
            version : 1,
            enrollmentSecret: result.userSecret,
            businessNetwork : bnID
        };

        let adminCard = await cardStore.get('admincard');

        let idCard = new IdCard(metadata, adminCard.getConnectionProfile());

        // this card may be used to connect to the network.
        //
        let options = {
            wallet:{
                type: 'composer-wallet-filesystem',
                options: {
                    storePath: fs.mkdtempSync(`${tmpDir}${path.sep}`)
                }
            }
        };
        dirToClean = options.wallet.options.storePath;
        // creating new connections with different card store
        let bnc = new BusinessNetworkConnection(options);
        let ac = new AdminConnection(options);


        // let's import the card via the Admin Connection
        await ac.importCard('bobscard',idCard);
        await bnc.connect('bobscard');

        // as well as importing the admin card here as well
        await ac.importCard('admin',adminCard);

        // for test let's get bob to update his own record
        // we don't want to make bob mess around with the registries so he can all a transaction to update
        // his own profile

        let updatetx = factory.newTransaction('systest.cardadmin','UpdateProfile');
        updatetx.update = 'Never know what to say here';

        await bnc.submitTransaction(updatetx);

        // let's use the admin card to get back bob's details and validate the transaction has woked

        let admin_nc = new BusinessNetworkConnection(options);
        await admin_nc.connect('admin');
        let pr = await admin_nc.getParticipantRegistry('systest.cardadmin.SampleParticipant');
        let bobsDetails = await pr.get('bob@uk.ibm.com');

        bobsDetails.userProfile.should.equal('Never know what to say here');
        bnc.disconnect();

        await ac.deleteCard('bobscard');
        await ac.deleteCard('admin');
        ac.disconnect();

        let files = walkSync(options.wallet.options.storePath,[]);
        files.length.should.equal(0);

    });

    it('should be able to use multiple card stores' , async ()=>{

        const factory = client.getBusinessNetwork().getFactory();
        let participant = factory.newResource('systest.cardadmin', 'SampleParticipant', 'bob@uk.ibm.com');
        participant.firstName = 'Bob';
        participant.lastName = 'Bobbington';
        const participantRegistry = await client.getParticipantRegistry('systest.cardadmin.SampleParticipant');
        await participantRegistry.add(participant);

        // issue an identity for this person
        let result = await client.issueIdentity('systest.cardadmin.SampleParticipant#bob@uk.ibm.com', 'bob-id-2', {});
        LOG.info('Issued identity',result);

        let metadata =  {
            userName : result.userID,
            version : 1,
            enrollmentSecret: result.userSecret,
            businessNetwork : bnID
        };

        let adminCard = await cardStore.get('admincard');

        let idCard = new IdCard(metadata, adminCard.getConnectionProfile());

        // this card may be used to connect to the network.
        //
        let options = {
            wallet:{
                type: 'composer-wallet-filesystem',
                options: {
                    storePath: fs.mkdtempSync(`${tmpDir}${path.sep}`)
                }
            }
        };
        dirToClean = options.wallet.options.storePath;
        let redis = {
            wallet:{
                type: 'composer-wallet-redis',
                options: {

                }
            }
        };
        // creating new connections with different card store

        let ac = new AdminConnection(options);

        LOG.info('Importing card to the filesystem store');
        // let's import the card via the Admin Connection
        await ac.importCard('bobscard',idCard);

        let bnc = new BusinessNetworkConnection(options);
        await bnc.connect('bobscard');
        // validate it's connected
        await bnc.ping();
        await bnc.disconnect();
        await ac.disconnect();

        // export the card and then import into the redis server
        LOG.info('Exporting bobs card');
        let bobsUpdatedCard = await ac.exportCard('bobscard');

        let acRedis = new AdminConnection(redis);
        // as well as importing the admin card here as well
        LOG.info('Importing bobscard to redis');
        await acRedis.importCard('bobscard',bobsUpdatedCard);

        // for test let's get bob to update his own record
        // we don't want to make bob mess around with the registries so he can all a transaction to update
        // his own profile

        LOG.info('Using bobs card from redis');
        bnc = new BusinessNetworkConnection(redis);
        await bnc.connect('bobscard');

        LOG.info('Issuing tx to update bob\'s profile');
        let updatetx = factory.newTransaction('systest.cardadmin','UpdateProfile');
        updatetx.update = 'Never know what to say here';

        await bnc.submitTransaction(updatetx);

        // let's use the admin card to get back bob's details and validate the transaction has woked

        LOG.info('connecting as admin to see if bob did the udpate');
        await ac.connect('admin');
        let pr = await ac.getParticipantRegistry('systest.cardadmin.SampleParticipant');
        let bobsDetails = await pr.get('bob@uk.ibm.com');

        bobsDetails.userProfile.should.equal('Never know what to say here');
        bnc.disconnect();

        await ac.deleteCard('bobscard');
        await ac.deleteCard('admin');
        ac.disconnect();

    });

    it('should return sensible errors if trying to enroll twice' , async ()=>{

        const factory = client.getBusinessNetwork().getFactory();
        let participant = factory.newResource('systest.cardadmin', 'SampleParticipant', 'bob@uk.ibm.com');
        participant.firstName = 'Bob';
        participant.lastName = 'Bobbington';
        const participantRegistry = await client.getParticipantRegistry('systest.cardadmin.SampleParticipant');
        await participantRegistry.add(participant);

        // issue an identity for this person
        let result = await client.issueIdentity('systest.cardadmin.SampleParticipant#bob@uk.ibm.com', 'bob-id-3', {});

        let metadata =  {
            userName : result.userID,
            version : 1,
            enrollmentSecret: result.userSecret,
            businessNetwork : bnID
        };

        let adminCard = await cardStore.get('admincard');

        let idCard = new IdCard(metadata, adminCard.getConnectionProfile());

        // this card may be used to connect to the network.
        //
        let options = {
            wallet:{
                type: 'composer-wallet-filesystem',
                options: {
                    storePath: fs.mkdtempSync(`${tmpDir}${path.sep}`)
                }
            }
        };
        dirToClean = options.wallet.options.storePath;
        let redis = {
            wallet:{
                type: 'composer-wallet-redis',
                options: {

                }
            }
        };
        // creating new connections with different card store

        let acfs = new AdminConnection(options);
        let acredis = new AdminConnection(redis);


        // let's import the card via the Admin Connection
        await acfs.importCard('bobscard',idCard);
        // let's import the card via the Admin Connection
        await acredis.importCard('bobscard',idCard);

        let bncfs = new BusinessNetworkConnection(options);
        let bncredis = new BusinessNetworkConnection(redis);
        await bncfs.connect('bobscard');
        // validate it's connected
        await bncfs.ping();
        await bncfs.disconnect();

        await bncredis.connect('bobscard');
        // validate it's connected
        await bncredis.ping();  // <--error
        await bncredis.disconnect();


    });
});
