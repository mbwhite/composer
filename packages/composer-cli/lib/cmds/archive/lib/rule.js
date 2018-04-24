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
// Event has this definition
// event {
//     result: "success","fail","warn"
//     data: { JSON output }

// }



const _ = require('lodash');

module.exports.perClassRules = {

    class_not_made_abstract : async (from, to) => {
        // are all in from in t
        let event = {};
        event.result = (!from.isAbstract() && to.isAbstract()) ? 'failure':'success';
        event.data = from.getFullyQualifiedName();
        return [event];
    },


    must_not_change_cardinality_property : async (from, to) => {
        // are all in from in t
        let events = [];
        let fromProps = from.getProperties();
        let toProps = to.getProperties();

        let fromPropsNames = fromProps.map((e)=>{return e.getName();});
        let toPropsNames = toProps.map((e)=>{return e.getName();});
        let additionalProps = _.intersection(toPropsNames,fromPropsNames);

        // find difference for those propeties that where added
        for (const propName of additionalProps) {
            // get the prop itself...
            let toProp = to.getProperty(propName);
            let fromProp = from.getProperty(propName);


            events.push( { data: { fqn:toProp.getFullyQualifiedName() },
                result : (toProp.isArray() !== fromProp.isArray()) ? 'failure':'success'
            } ) ;

        }

        return events;
    },

    new_not_default_optional_property : async (from, to) => {
        // are all in from in t
        let events = [];
        let fromProps = from.getProperties();
        let toProps = to.getProperties();

        let fromPropsNames = fromProps.map((e)=>{return e.getName();});
        let toPropsNames = toProps.map((e)=>{return e.getName();});
        let additionalProps = _.difference(toPropsNames,fromPropsNames);

        // find difference for those propeties that where added
        for (const propName of additionalProps) {
            // get the prop itself...
            let prop = to.getProperty(propName);
            let optional = prop.isOptional();
            let defValue = prop.getDefaultValue()===null ? false:true;

            events.push( { data: { fqn:prop.getFullyQualifiedName(),optional,defValue },
                result : (!optional && !defValue) ? 'failure':'success'
            } ) ;

        }


        return events;
    },

    deleting_property_instability_risk : async (from, to) => {
        // are all in from in t
        let events = [];
        let fromProps = from.getProperties();
        let toProps = to.getProperties();

        let fromPropsNames = fromProps.map((e)=>{return e.getName();});
        let toPropsNames = toProps.map((e)=>{return e.getName();});
        let additionalProps = _.difference(fromPropsNames,toPropsNames);

        // find difference for those propeties that where added
        for (const propName of additionalProps) {
            // get the prop itself...
            let prop = from.getProperty(propName);
            events.push( { data: { fqn:prop.getFullyQualifiedName() },
                result : 'warning'
            } ) ;

        }


        return events;
    }
};

module.exports.globalClassRules = {

    // returns result
    fqn_in_both_lists : async (from, to) => {
        let event = {};
        let diff = _.difference(from,to);
        event.result = (diff.length===0) ? 'success':'failure';
        event.data = _.clone(diff);

        return [event];
    }

};

