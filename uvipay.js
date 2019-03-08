const querystring = require('querystring');
const axios = require('axios');

const apiClient = axios.create({
  baseURL: 'https://api.uviba.com/pay/v1/',
  timeout: 120 * 1000
});

const apiDefError = {
  status: false,
  error: {
    message: 'Sorry, some error happend',
    code: 'server_response',
    type: 'request'
  }
};

var UviPay = function (privateKey) {
  this.setPrivateKey(privateKey);
}

/**
* Create uvipay instance
* @param {String} privateKey Get your key from https://pay.uviba.com/dashboard/#/api
* ```javascript
* var uvipay = require('uvipay')('...');
* ...
* uvipay.charge({ ... });
* ```
*/
var __uvipay = function (privateKey) { return new UviPay(privateKey); }

/**
* UviPay class
* ```javascript
* var UviPay = require('uvipay').UviPay;
* ...
* var instance1 = new UviPay('...');
* instance1.charge({ ... });
* ```
*/
__uvipay.UviPay = UviPay;


module.exports = __uvipay;

/**
* Send request to uviba api server
* @param {String} path Url path to send request
* @param {Object} data Request parameters
* @returns {Promise<Object>} Response
*/
UviPay.prototype.request = function (path, data) {
  return new Promise((resolve, reject) => {
    apiClient.post(path, querystring.stringify(data || {}), {
      auth: {
        username: this.privateKey,
        password: ''
      },
      headers: {
        'Content-type': 'application/x-www-form-urlencoded'
      }
    })
      .then((response) => {
        if (typeof response.data == 'string') {
          try {
            var json = JSON.parse(response.data);
            if (typeof json.status != 'undefined') {
              resolve(json);
            } else {
              resolve(apiDefError);
            }
          } catch (e) {
            resolve(apiDefError);
          }
        } else if (typeof response.data == 'object' && typeof response.data.status != 'undefined') {
          resolve(response.data);
        } else {
          resolve(apiDefError);
        }
      })
      .catch((error_response) => {
        //console.log(response);
        response=error_response.response;
      if (typeof response.data == 'string') {
          try {
            var json = JSON.parse(response.data);
            if (typeof json.status != 'undefined') {
              resolve(json);
            } else {
              resolve(apiDefError);
            }
          } catch (e) {
            resolve(apiDefError);
          }
        } else if (typeof response.data == 'object' && typeof response.data.status != 'undefined') {
          resolve(response.data);
        } else {
          resolve(apiDefError);
        }
      });
  });
}

/**
* Charge customer's credit card
* @param {Object} data Request parameters
*/
UviPay.prototype.charge = function (data) {
  return this.request('/charges', data);
}

/**
* Set API Private Key
* @param {String} privateKey parameters
*/
UviPay.prototype.setApiKey = function (privateKey){
   this.setPrivateKey(privateKey);
}

/**
* Set API Private Key
* @param {String} privateKey parameters
*/
UviPay.prototype.setPrivateKey = function (privateKey){
    if (privateKey.length < 20 && privateKey.indexOf('sk_') !== 0) {
      throw new Error('Correct private key is required to initialize UviPay client');
    }
    this.privateKey = privateKey;
}

/**
* Refund pervious charge
* @param {String} charge_id Charge id token
* @param {Object} data Request parameters
*/
UviPay.prototype.refund = function (charge_id, data) {
  data = data || {};
  if (typeof charge_id == 'object') {
    Object.assign(data, charge_id);
  } else {
    data.charge_id = charge_id;
  }
  return this.request('/refunds', data);
}

/**
* Get your current balance
* @param {Object} data Request parameters
*/
UviPay.prototype.get_balance = function (data) {
  return this.request('/balance', data);
}

/**
* Cancel running subscribtion
* @param {String} sub_id Subscription id token
* @param {Object} data Request parameters
*/
UviPay.prototype.cancel_subscription = function (sub_id, data) {
  return this.request(`/subscriptions/${sub_id}?action=delete`, data);
}

/**
* Create link and put money in it
* @param {Number} amount Amount to send
* @param {Object} data Request parameters
*/
UviPay.prototype.create_paylink = function (amount, data) {
  data = data || {};
  if (typeof amount == 'object') {
    Object.assign(data, amount);
  } else {
    data.amount = amount;
  }
  return this.request('/transfers?action=create_paylink', data);
}

/**
* Send payment to specified email & account
* @param {Number} amount Amount to send
* @param {Object} data Request parameters
*/
UviPay.prototype.send_payment = function (amount, data) {
  data = data || {};
  if (typeof amount == 'object') {
    Object.assign(data, amount);
  } else {
    data.amount = amount;
  }
  return this.request('/transfers?action=send_payment', data);
}

/**
* Reverse sent payment
* @param {Object} data Request parameters
*/
UviPay.prototype.reverse_payment = function (data) {
  return this.request('/transfers?action=take_payment_back', data);
}

/**
* Verify sent webhook request
* @param {String} req_id Request id that sent to the webserver on webhook request
* @param {Object} data Request parameters
*/
UviPay.prototype.verify_webhook = function (req_id, data) {
  return this.request(`/webhooks/?action=verify&request_id=${req_id}`,
    typeof data == 'object' ? data : {
      verify_for: data
    });
}
