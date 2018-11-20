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
 * @name setApiPrivateKey
 * @description Set private api key to uvipay client
 * @param {String} key Private api key
 */
u.setApiPrivateKey = u.setApiKey = function(key) {
    u.sk = key.trim();
    u.live = key.indexOf('sk_live_') == 0;
};

/**
 * @name checkErrors
 * @description Checks code error
 */
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
 * @name refund
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
 * @name charge
 * @description Charge the user
 * @param {String} token Payment token returned by frontend
 * @param {Number} amount Amount in cents (for charging 1$, amount must be 100)
 * @param {Object} params Additional parameters
 * @returns {Promise}
 */
u.charge = function(token, amount, params) {
    if (typeof token == "object") {
        amount = token.amount || amount || 0;
        params = token.params || {};
        token = token.token;
    }
    if (typeof amount == "object") {
        params = amount.params || {};
        amount = amount.amount;
    }

    return new Promise(function(resolve, reject) {
        if (!u.checkErrors(reject)) return;

        if ((token || '').length > 3 && amount > 1) {
            axios.post('https://api.uviba.com/pay/charge', Object.assign(params, {
                sign           : sha256(token + '::' + u.sk),
                amount         : amount,
                UvibaToken     : token,
                isLive         : u.live,
                uviba_params   : '',
                api_version    : u.ver,
                api_subversion : u.subver
            })).then(function(response) {
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
 * @name create_paylink
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
                    response.data.success_data.link = response.data.success_data.paylink;
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
 * @name send_payment
 * @description Send payment to the user
 * @param {Number} amount Amount in cents (for charging 1$, amount must be 100)
 * @param {Object} params Parameters
 * @returns {Promise}
 */
u.send_payment = u.send_payments = function(amount, params) {
    return new Promise(function(resolve, reject) {
        params.destination = params.destination || 'email';
        params.takeback = params.takeback || params.take_back || 0;
        if (params.destination == 'email' && !params.email) {
            reject('Please define recipient\'s email address.');
        } else {
            u.create_paylink(amount).then(function(result) {
                axios.post('https://api.uviba.com/pay/send_payments', Object.assign(params, {
                    private_key         : u.sk,
                    isLive              : u.live,
                    paylink_code        : result.link_code,
                    link_methods        : true,
                    destination         : params.destination,
                    destination_address : params.email || '',
                    message_to_receiver : params.message || '',
                    api_version         : u.ver,
                    api_subversion      : u.subver,
                    takeback            : params.takeback,
                })).then(function(response) {
                    if (response.data.error && response.data.error_data) {
                        reject(response.data.error_data.message || 'Sorry some errors happened.');
                    } else {
                        if (response.data.send_id) {
                            resolve({
                                id: response.data.send_id,
                                amount: amount
                            });                            
                        } else reject('Sorry some errors happened.');
                    }
                }).catch(function() {
                    reject('Sorry some errors happened.');
                });
            }).catch(reject);
        }
    });
};

/**
 * @name take_payment_back
 * @description Take payment back
 * @param {Object} params Parameters
 * @returns {Promise}
 */
u.take_payment_back = function(params) {
    return new Promise(function(resolve, reject) {
        if (!u.checkErrors(reject)) return;

        axios.post('https://api.uviba.com/pay/takeback', Object.assign(params, {
            private_key    : u.sk,
            isLive         : u.live,
            api_version    : u.ver,
            api_subversion : u.subver,
            uviba_params   : ''
        })).then(function(response) {
            if (response.data.error) {
                reject((response.data.error_data || []).message || 'Sorry some errors happened.');
            } else {
                response.data.success_data.link = response.data.success_data.paylink;
                resolve(response.data.success_data);
            }
        }).catch(function() {
            reject('Sorry some errors happened.');
        });
    });
};

/**
 * @name api_request
 * @description Send api request to uviba servers
 * @param {String} url Desination
 * @param {Object} params Parameters
 * @returns {Promise}
 */
u.api_request = function(url, params) {
    return new Promise(function(resolve, reject) {
        if (!u.checkErrors(reject)) return;

        axios.post((url.indexOf('http') == 0 ? url : 'https://api.uviba.com/pay/' + url), Object.assign(params, {
            private_key    : u.sk,
            isLive         : u.live,
            api_version    : u.ver,
            api_subversion : u.subver,
            uviba_params   : ''
        })).then(function(response) {
            resolve(response.data);
        }).catch(function() {
            reject('Sorry some errors happened.');
        });

    });
};

module.exports = u;
