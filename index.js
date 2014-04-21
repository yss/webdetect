#!/usr/bin node

var fs = require('fs'),
    path = require('path'),
    util = require('util');

var DIRECTORY = './scripts';

var WebDetect = require('./WebDetect.js');

fs.readdir(DIRECTORY, function(err, files) {
    if (err) {
        console.error(util.format('[ERROR]:[%s] Read direction: %s error. Error msg is: %j', new Date().toJSON, DIRECTORY, err));
        process.exit(1);
    } else {
        files.forEach(function(file) {
            // ignore hidden file
            if (file.indexOf('.') !== 0) {
                require(path.resolve(DIRECTORY, file))(WebDetect);
            }
        });
    }
});
