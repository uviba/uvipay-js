const axios  = require('axios');
const sha256 = require('sha256');
const qs     = require('qs');

axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
axios.interceptors.request.use((request) => {
    if (request.data) request.data = qs.stringify(request.data);
    return request;
});

var u = { sk: '', live: false, ver: 'v2', subver: '1' };

/**
 * @description Set private api key to uvipay client
 * @param {String} key Private api key
 */
u.setApiPrivateKey = function(key) {
    u.sk = key.trim();
    u.live = key.indexOf('sk_live_') == 0;
};
u.setApiKey = u.setApiPrivateKey;
u.checkErrors = function(reject) {
    if ((u.sk || '').trim().length < 3) {
        if (typeof reject == 'function') {
            reject('Please define private key with uvipay.setApiPrivateKey function.');
        } else {
            throw new Error('Please define private key with uvipay.setApiPrivateKey function.');
        }
        return false;
    }
    return true;
};

/**
 * @description Refund paid payment
 * @param {Object} info Payment info that returned in uvipay.charge
 * @returns {Promise}
 */
u.refund = function(charge_id, amount) {
    if (typeof charge_id == "object") {
        amount = charge_id.amount;
        charge_id = charge_id.charge_id;
    }

    return new Promise(function(resolve, reject) {
        if (!u.checkErrors(reject)) return;

        if (charge_id && amount) {
            axios.post('https://api.uviba.com/pay/refund', {
                sign           : sha256(charge_id.trim() + '::' + u.sk),
                isLive         : u.live,
                amount         : amount,
                charge_id      : charge_id,
                api_version    : u.ver,
                api_subversion : u.subver
            }).then(function (response) {
                if (response.data.error) {
                    reject((response.data.error_data || []).message || 'Sorry some errors happened.');
                } else {
                    resolve(response.data.success_data);
                }
            }).catch(function () {
                reject('Sorry some errors happened.');
            });
        } else {
            reject('Payment Info is not defined or incorrect in code. Please define it in uvipay.charge function.');
        }
    });
};

/**
 * @description Charge the user
 * @param {String} token Payment token returned by frontend
 * @param {Number} amount Amount in cents (for charging 1$, amount must be 100)
 * @returns {Promise}
 */
u.charge = function(token, amount, subscription) {
    if (typeof token == "object") {
        amount = token.amount || amount || 0;
        subscription = token.subscription || false;
        token = token.token;
    }
    if (typeof amount == "object") {
        subscription = amount.subscription || false;
        amount = amount.amount;
    }

    return new Promise(function(resolve, reject) {
        if (!u.checkErrors(reject)) return;

        if ((token || '').length > 3 && amount > 1) {
            axios.post('https://api.uviba.com/pay/charge', {
                sign           : sha256(token + '::' + u.sk),
                amount         : amount,
                UvibaToken     : token,
                isLive         : u.live,
                uviba_params   : '',
                subscription   : subscription,
                api_version    : u.ver,
                api_subversion : u.subver
            }).then(function(response) {
                if (response.data.error) {
                    reject((response.data.error_data || []).message || 'Sorry some errors happened.');
                } else {
                    resolve(response.data.success_data);
                }
            }).catch(function() {
                reject('Sorry some errors happened.');
            });
        } else {
            reject('Token and amount is required and must be correct');
        }        
    });
};

/**
 * @description Create link that user withdraw his money using this link
 * @param {Number} amount Amount in cents (for charging 1$, amount must be 100)
 * @returns {Promise}
 */
u.create_paylink = function(amount) {
    return new Promise(function(resolve, reject) {
        if (!u.checkErrors(reject)) return;

        if (amount > 0) {
            axios.post('https://api.uviba.com/pay/create_paylink', {
                private_key    : u.sk,
                isLive         : u.live,
                amount         : amount,
                api_version    : u.ver,
                api_subversion : u.subver
            }).then(function(response) {
                if (response.data.error) {
                    reject((response.data.error_data || []).message || 'Sorry some errors happened.');
                } else {
                    response.data.success_data.link = response.success_data.paylink;
                    resolve(response.data.success_data);
                }
            }).catch(function() {
                reject('Sorry some errors happened.');
            });
        } else {
            reject('Amount to send is not defined in code. Please define it in function.');
        }
    });
};

/**
 * @description Send payment to the user
 * @param {Number} amount Amount in cents (for charging 1$, amount must be 100)
 * @param {Object} params Parameters
 * @returns {Promise}
 */
u.send_payment = function(amount, params) {
    return new Promise(function(resolve, reject) {
        params.destination = params.destination || 'email';
        if (params.destination == 'email' && !params.email) {
            reject('Please define recipient\'s email address.');
        } else {
            u.create_paylink(amount).then(function(result) {
                axios.post('https://api.uviba.com/pay/send_payments', {
                    private_key         : u.sk,
                    isLive              : u.live,
                    paylink_code        : result.link_code,
                    link_methods        : true,
                    destination         : params.destination,
                    destination_address : params.email || '',
                    message_to_receiver : params.message || '',
                    api_version         : u.ver,
                    api_subversion      : u.subver
                }).then(function(response) {
                    if (response.data.error && response.data.error_data) {
                        reject(response.data.error_data.message || 'Sorry some errors happened.');
                    } else {
                        (response.data.success ? resolve : reject)();
                    }
                }).catch(function() {
                    reject('Sorry some errors happened.');
                });
            }).catch(reject);
        }
    });
};
u.send_payments = u.send_payment;

module.exports = u;