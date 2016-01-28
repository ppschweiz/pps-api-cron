// call the packages we need
var assert     = require('assert');
var crypto = require('crypto');
var request = require('request');
var async   = require('async');
var fs      = require('fs');

// CiviCRM
var config = {
  server: process.env.CIVICRM_SERVER,
  path: process.env.CIVICRM_PATH,
  key: process.env.CIVICRM_SITE_KEY,
  api_key: process.env.CIVICRM_API_KEY,
};

var client_api = process.env.PPSAPI_URL;
var paylink_base =  process.env.PPSAPI_PAYLINKURL;
var pay_secret = process.env.PPSAPI_PAYSECRET;

function sha1(value) {
        var shasum = crypto.createHash('sha1');

        shasum.update(value);
        return shasum.digest('hex');
}

function api_with_secret(secret, path1, path2) {
        return path1 + '/' + sha1(secret + ':' + path1+'/'+path2).substring(0,20) + '/' + path2;
}

function contains(list, item) {
	for (var i in list) {
		if (list[i] == item)
			return true;
	}

	return false;
}

var crmAPI = require('./civicrm')(config);

function high_member_id(state, offset, limit, callback) {
	crmAPI.get('Contact', { 'options': { 'offset': offset, 'limit': limit }, 'return': 'external_identifier' },
		function(result) {
			assert.equal(result.is_error, 0, "API call failed: " + JSON.stringify(result));

			for (var i in result.values) {
				var contact = result.values[i];

				if (contact.external_identifier) {
					var member_id = parseInt(contact.external_identifier);;
				
					if (member_id > state.high_id)
						state.high_id = member_id;

					state.has_id.push(contact.id);
				}
			}

			if (callback)
				callback(result.count);
		});
}

function update_member_id(state, offset, limit, callback) {
        crmAPI.get ('Membership',{'options': {'offset': offset, 'limit': limit}, 'status_id': 'Expired', 'membership_type_id': 'PPS', 'return': 'contact_id' },
                function (result) {
                        assert.equal(result.is_error, 0, "API call failed: " + JSON.stringify(result));
                        for (var i in result.values) {
                                var membership = result.values[i];

				if (!contains(state.has_id, membership.contact_id)) {

					crmAPI.get('Contact', { 'id': membership.contact_id },
						function(result) {
							assert.equal(result.is_error, 0, "API call failed: " + JSON.stringify(result));

							if (result.count == 1) {
								member_id = state.high_id + 1;
								state.high_id = member_id;

								console.log("member id assignment required: " + membership.contact_id + " => " + member_id);
					
//					crmAPI.update('Contact', { 'id': membership.contact_id, 'external_identifier': member_id  }, 
//						function(update_result) {
//							if (update_result.is_error != 0) {
//								console.log("update member_id error");
//								console.log(update_result);
//							} else {
//								var update_contact = update_result.values[0];
//								console.log("Assigned ID " + update_contact.external_identifier + " to " + update_contact.sort_name);
//							}
//						});
							}
						});
				}
			}

			if (callback)
				callback(result.count);
		});
}

function update_pay_links(state, offset, limit, callback) {
	crmAPI.get('Contact', { 'options': { 'offset': offset, 'limit': limit }, 'return': 'external_identifier,custom_13,custom_14' },
		function(result) {
			assert.equal(result.is_error, 0, "API call failed: " + JSON.stringify(result));

			for (var i in result.values) {
				var contact = result.values[i];
				var member_id = contact.external_identifier;

				if (member_id) {
					var pdf_url = client_api + "/api/v1/" + api_with_secret(pay_secret, 'invoicepdf', member_id + '/invoice.pdf')
					var pay_url = paylink_base + "/pay#" + sha1(pay_secret + ":paylink/" + member_id).substring(0,20) + "/" + member_id;

					if (pdf_url != contact.custom_13 && pay_url != contact.custom_14) {
						console.log("Pay link update required for " + update_contact.external_identifier + " " + update_contact.sort_name);

						crmAPI.update('Contact', { 'id': contact.id, 'custom_13': pdf_url, 'custom_14': pay_url }, 
							function(update_result) {
								if (update_result.is_error != 0) {
									console.log("update pay link error");
									console.log(update_result);
								} else {
									var update_contact = update_result.values[0];
									console.log("Pay link updated for " + update_contact.external_identifier + " " + update_contact.sort_name);
								}
							});
					}
				}
			}

                        if (callback)
                                callback(result.count);
		});
}

function invoke_recursive_high_member_id(state, offset, limit, final_callback) {
        high_member_id(state, offset, limit, function(count) {
                console.log("result high_member_id: " + count + ", high_id: " + state.high_id);

                if (count == limit) {
                        invoke_recursive_high_member_id(state, offset+limit, limit, final_callback);
		} else {
			final_callback();
		}
        });
};

function invoke_recursive_update_member_id(state, offset, limit, final_callback) {
        update_member_id(state, offset, limit, function(count) {
                console.log("result update_member_id: " + count);

                if (count == limit) {
                        invoke_recursive_update_member_id(state, offset+limit, limit, final_callback);
		} else {
			final_callback();
		}
        });
};

function invoke_recursive_update_pay_links(state, offset, limit, final_callback) {
        update_pay_links(state, offset, limit, function(count) {
                console.log("result update_members: " + count);

                if (count == limit) {
                        invoke_recursive_update_pay_links(state, offset+limit, limit, final_callback);
		} else {
			final_callback();
		}
        });
};

state = { 
	high_id: 0, 
	has_id: []
};

invoke_recursive_high_member_id(state, 0, 1500, function() {
		console.log("highest id is " + state.high_id);
		
		invoke_recursive_update_member_id(state, 0, 500, function() {
			console.log("highest id is " + state.high_id);
		
			invoke_recursive_update_pay_links(state, 0, 500, function() {
				console.log("update completed.");
			});
		});
	});
