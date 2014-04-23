module.exports = function(WebDetect) {
    var webDetect = WebDetect({
        timeout: 4000,
        urls: [
            "http://m.maoyan.com"
        ],
        email: {
            to: "yansong@meituan.com"
        }
    }).on('request', function(url) {
    console.log('sdfsdfsdf')
        webDetect.emit('log', 'request', url);
    }).on('response', function(url, headers) {
        webDetect.emit('log', JSON.stringify(headers, 0, 4));
    }).on('responseEnd', function(url, html) {
        // custom detect and if error emit it.
        // webDetect.emit('error', webDetect.CUSTOM_ERROR, url, msg);
        // if you want to print logs, you can use :
        // webDetect.emit('log', msg1, msg2, msg3...) like [msg1, ...].join(' ');
    }).on('error', function(code, url, msg) {
    
    });
    
    // run
    webDetect.detect();
};
