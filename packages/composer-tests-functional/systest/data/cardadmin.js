'use strict';

/**
 * Handle the sample transaction.
 * @param {systest.cardadmin.UpdateProfile} transaction The transaction
 * @transaction
 */
function updateProfile(transaction) {

    let me = getCurrentParticipant();
    let registry;

    return getParticipantRegistry(me.getFullyQualifiedType())
    .then(function(result) {
        registry = result;
        return registry.get(me.getIdentifier());
    })
    .then(function(result){
        result.userProfile = transaction.update;
        return registry.update(result);
    });

}
