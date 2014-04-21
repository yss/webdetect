#!/usr/bin node

var fs = require('fs'),
    path = require('path');

var DIRECTORY = './scripts';

var WebDetect = require('./WebDetect.js');

fs.readdir(DIRECTORY, function(err, files) {
    if (err) {
        console.log('Read direction: ', DIRECTORY, 'error. Error msg is:', JSON.stringify(err));
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
