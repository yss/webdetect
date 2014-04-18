#!/usr/bin node

var http = require('http');

var urls = [
    'http://m.maoyan.com'
];

// 打印错误日志并输出
function logError(code, url, msg) {
    console.error("GOT ERROR:");
    console.error("URL is: ", url);
    console.error("ERROR Message is: ", msg);
    process.exit(code);
}

function detect(url) {
    if (url) {
        http.get(url, function(res) {
            if (res.statusCode != 200) {
                logError(2, url, 'StatusCode is: ' + res.statusCode);
            }
            var buffer = [];
            res.on('data', function(chunk) {
                buffer.push(chunk);
            });
            res.on('end', function() {
                if(!/\<\/html\>/.test(buffer.slice(-3).join(''))) {
                    logError(3, url, 'Not end with </html>');
                } else {
                    console.info("Detect URL:", url, " is ok.");
                    detect(urls.pop());
                }
            });
        }).on('error', function(e) {
            logError(1, url, e.message);
        });
        console.info("Detecting", url);
    }
}
detect(urls.pop());
