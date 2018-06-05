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

const Admin = require('composer-admin');
const BusinessNetworkDefinition = Admin.BusinessNetworkDefinition;
const EventEmitter = require('events');
const fs = require('fs');
const List = require('../../lib/cmds/archive/validateCommand.js');
const CmdUtil = require('../../lib/cmds/utils/cmdutils.js');
const MigrationChecker = require('../../lib/cmds/archive/lib/migrationchecker.js');

require('chai').should();

const chai = require('chai');
const should = chai.should();
const sinon = require('sinon');
chai.should();
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));

let testBusinessNetworkId = 'net.biz.TestNetwork-0.0.1';
let testBusinessNetworkDescription = 'Test network description';

let mockBusinessNetworkDefinition;
let businessNetworkDefinition;
let migrationChecker;
let mockAdminConnection;

describe('composer archive validate unit tests', function () {

    let sandbox;
    let argv;
    // let testSuccessEvent = { data: 'success data', result: 'success' };
    // let testWarningEvent = { data: 'warning data', result: 'warning' };
    // let testFailureEvent = { data: 'failure data', result: 'failure' };

    beforeEach(() => {
        sandbox = sinon.sandbox.create();   

        // Stub out all of constructor items that are used in the methods

        // migrationChecker.getFailureEvents.returns([testFailureEvent]);
        // migrationChecker.getWarningEvents.returns([testWarningEvent]);
        // migrationChecker.getSuccessEvents.returns([testSuccessEvent]);
        // businessNetworkDefinition = new BusinessNetworkDefinition('id@1.0.0', 'description');
        // sandbox.stub(BusinessNetworkDefinition, 'fromArchive').resolves(businessNetworkDefinition);
        
        
        // sandbox.stub(fs,'readFileSync');
        // sandbox.spy(CmdUtil, 'log');

    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('MigrationChecker handler() method tests', function () {

        it ('should be an event emitter', async () => {
            //migrationChecker.should.be.an.instanceOf(EventEmitter);
        });

        it('MigrationChecker handler() method test with failure event', function () {

        });

        it ('check the loadNetwork method', function () {

        });

        it ('check the runRules method', function () {

        })
    });

});
