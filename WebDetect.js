var http = require('http'),
    util = require('util'),
    events = require('events');

var sendemail = require('sendmail')();

var CODE = {
    STATUS_CODE_ERROR: 1,
    REQUEST_ERROR: 2,
    REQUEST_TIMEOUT: 3,
    PAGE_ERROR: 4
};

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
        email: {
            from: 'yansong@meituan.com',
            to: 'mobile.fe@meituan.com',
            type: 'text/html'
        },
        // 请求超时时间
        timeout: 4000,
        // 一次性最多请求次数
        maxRequest: 10
    }, config);

    this.init();
    return this;
}

util.inherits(WebDetect, events.EventEmitter);

WebDetect.CODE = CODE;

cover(WebDetect.prototype, {
    error: function(code, url, msg) {
        console.error(util.format("[ERROR]:[%s] URL is: %s . Error message is: %s", new Date().toJSON(), url, msg));
        this.emit('error', url, code, msg);
    },

    log: function(msg) {
        console.info(util.format('[INFO]:[%s] %s.', new Date().toJSON(), msg));
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
            });

            req.setTimeout(_this.config.timeout, function() {
                req.abort();
                _this.error(CODE.REQUEST_TIMEOUT, url, 'Time out.');
            });
        }
    },

    detect: function() {
        var _this = this,
            i = 0,
            config = _this.config,
            maxRequest = config.maxRequest,
            url;
        while(i < maxRequest && (url = config.urls.shift())) {
            _this.request(url);
            i++;
        }
        _this.on('end', function() {
            if (config.urls.length) {
                _this.request(config.urls.shift());
            }
        });
    },

    handler: function() {
        var _this = this,
            Error = {};

        // default error
        this.on('error', function(url, code, msg){
            (Error[url] = Error[url] || []).push(util.format('[%j]: Count[%s], Error message: %s', new Date(), Error[url].length, msg));
            // count 5
            if (Error[url] && Error[url].length > 4) {
                _this.sendEmail(url, Error[url].join('\n<br/>'));
            } else {
                _this.config.urls.push(url);
            }
            _this.emit('end', url);
//            switch (code) {
//                case CODE.STATUS_CODE_ERROR:
//                case CODE.PAGE_ERROR:
//
//                case CODE.REQUEST_ERROR:
//
//                case CODE.REQUEST_TIMEOUT:
//            }
        });
    },

    sendEmail: function(url, msg) {
        sendemail(cover(this.config.email, {
            subject: '[ERROR DETECT] ' + url,
            content: '<p>' + msg + '</p>'
        }), function(err, replay) {
            if (err) {
                console.error(err.stack);
            }
        });
    },

    init: function() {
        this.handler();
        this.detect();
    }
});


module.exports = WebDetect;
