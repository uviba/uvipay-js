const uvipay = require('./uvipay');

uvipay.setApiPrivateKey('sk_test_f45349e0dc5c6a7927fd75c19c00f448');


//To charge user
//0c66b09933685b7258d5bfa1971b_779 is token came from iframe
uvipay.charge('0c66b09933685b7258d5bfa1971b_779', 1000).then(function (response) {
    console.log('Charge (+)', response);
    //to refund user
    uvipay.refund(response.id, 1000).then(function (response) {
        console.log('Refund (+)',response);
    }).catch(function(msg) {
        console.log('Refund (-)',msg);
    });

}).catch(function(msg) {
    console.log('Charge (-)', msg);
});


