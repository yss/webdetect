#!/usr/bin node

var http = require('http'),
    util = require('util'),
    events = require('events');

var CODE = {
    STATUS_CODE_ERROR: 1,
    REQUEST_ERROR: 2,
    REQUEST_TIMEOUT: 3,
    PAGE_ERROR: 4
};
var urls = [
    'http://m.maoyan.com'
];

function cover(o, s) {
    if ('object' === typeof o && 'object' === typeof s) {
        for (var key in s) {
            o[key] = s[key];
        }
    }
    return o;
}

function WebDetect(config) {
    if (!(this instanceof  WebDetect)) {
        return new WebDetect(config);
    }
    // inherits
    events.EventEmitter.call(this);

    this.config = cover({
        timeout: 4000
    }, config);

    this.init();
    return this;
}

util.inherits(WebDetect, events.EventEmitter);

WebDetect.CODE = CODE;

cover(WebDetect.prototype, {
    error: function(code, url, msg) {
        console.error(util.format("[ERROR]:[%j] URL is: %s . Error message is: %s", new Date().toJSON(), url, msg));
        this.emit('error', url, code);
    },

    log: function(msg) {
        console.info(util.format('[INFO]:[%j] %s.', new Date().toJSON(), msg));
    },

    // 是否考虑直接使用request库呢？
    request: function(url) {
        var _this = this;
        if (url) {
            _this.emit('request', url);
            _this.log('Detecting URL: ' + url);
            var req = http.get(url, function(res) {
                console.log(res.statusCode)
                if (res.statusCode != 200) {
                    _this.error(CODE.STATUS_CODE_ERROR, url, 'StatusCode is: ' + res.statusCode);
                }
                var buffer = [];
                res.on('data', function(chunk) {
                    buffer.push(chunk);
                });
                res.on('end', function() {
                    if(!/\<\/html\>/.test(buffer.slice(-3).join(''))) {
                        return _this.error(CODE.PAGE_ERROR, url, 'Not end with </html>');
                    }
                    _this.log('Detected URL: ' + url + ' is ok.');
                    _this.emit('end', url);
                });
            }).on('error', function(e) {
                _this.error(CODE.REQUEST_ERROR, url, e.message);
            }).setTimeout(_this.config.timeout, function() {
                req.abort();
                _this.error(CODE.REQUEST_TIMEOUT, url, 'Time out.');
            });
        }
    },

    detect: function() {
        var _this = this,
            i = 0,
            config = _this.config,
            url;
        while(i < 10 && (url = config.urls.shift())) {
            _this.request(url);
            i++;
        }
        _this.on('end', function() {
            if (config.urls.length) {
                _this.request(config.urls.shift());
            }
        });
    },

    init: function() {
        // default error
        this.on('error', function(){});
        this.detect();
    }
});


module.exports = WebDetect;
