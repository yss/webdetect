"use strict";
var http = require('http'),
    util = require('util'),
    events = require('events');

var sendemail = require('sendmail')();

var CODE = {
    STATUS_CODE_ERROR: 1,
    REQUEST_ERROR: 2,
    REQUEST_TIMEOUT: 3,
    PAGE_ERROR: 4,
    CUSTOM_ERROR: 5
};

var isObject = function(o) { return 'object' === Object.prototype.toString.call(o).slice(8, -1).toLowerCase(); }

function cover(o, s) {
    if (isObject(o) && isObject(s)) {
        for (var key in s) {
            if (isObject(s[key]) && isObject(o[key])) {
                cover(o[key], s[key]);
            } else {
                o[key] = s[key];
            }
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
        // 发送邮件配置
        email: {
            from: 'yansong@meituan.com',
            to: 'mobile.fe@meituan.com',
            type: 'text/html'
        },
        // 请求超时时间
        timeout: 4000,
        // 每次http请求最大的条数
        maxRequest: 10,
        // 最大容许出错的次数
        maxErrorCount: 5
    }, config);

    this.attach();
    return this;
}

util.inherits(WebDetect, events.EventEmitter);

WebDetect.CODE = CODE;

cover(WebDetect.prototype, {
    // 是否考虑直接使用request库呢？
    request: function(url) {
        var _this = this;
        if (url) {
            _this.emit('request', url);
            _this.emit('log', 'Detecting URL:', url);
            var req = http.get(url, function(res) {
                if (res.statusCode != 200) {
                    _this.emit('error', CODE.STATUS_CODE_ERROR, url, 'StatusCode is: ' + res.statusCode);
                }
                _this.emit('response', url, res.headers);
                var buffer = [];
                res.on('data', function(chunk) {
                    buffer.push(chunk);
                });
                res.on('end', function() {
                    if(!/\<\/html\>/.test(buffer.slice(-3).join(''))) {
                        return _this.emit('error', CODE.PAGE_ERROR, url, 'Not end with </html>');
                    }
                    _this.emit('log', 'Detected URL:', url, 'is ok.');
                    _this.emit('responseEnd', url, buffer.join(''));
                });
            }).on('error', function(e) {
                _this.emit('error', CODE.REQUEST_ERROR, url, e.message);
            });

            req.setTimeout(_this.config.timeout, function() {
                req.abort();
                _this.emit('error', CODE.REQUEST_TIMEOUT, url, 'Time out.');
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
        _this.on('responseEnd', function() {
            if (config.urls.length) {
                _this.request(config.urls.shift());
            }
        });
    },

    attach: function() {
        var _this = this,
            Error = {};

        // default error
        this.on('error', function(code, url, msg){

            console.error(util.format("[ERROR]:[%s] URL is: %s . Error message is: %s", new Date().toJSON(), url, msg));

            (Error[url] = Error[url] || []).push(util.format('[%j]: Count[%s], Error message: %s', new Date(), Error[url].length, msg));
            // count 5
            if (Error[url] && Error[url].length >= _this.maxErrorCount) {
                _this.sendEmail(url, Error[url].join('\n<br/>'));
            } else {
                _this.config.urls.push(url);
            }
            _this.emit('responseEnd', url);
        }).on('log', function() {
            console.info(util.format('[INFO]:[%s] %s.', new Date().toJSON(), [].slice.call(arguments).join(' ')));
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
    }
});


module.exports = WebDetect;
