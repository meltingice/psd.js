# PSD.js

A general purpose PSD parser written in Coffeescript. Based off of [PSD.rb](https://github.com/layervault/psd.rb).

Runs in both NodeJS and the browser (using browserify).

**Work in Progress**

## Usage

``` js
var PSD = require('psd');
var psd = PSD.fromFile("path/to/file.psd");
psd.parse();

console.log(psd.header.export());
```