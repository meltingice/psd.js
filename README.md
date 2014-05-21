# PSD.js

[![Build Status](https://travis-ci.org/meltingice/psd.js.svg?branch=master)](https://travis-ci.org/meltingice/psd.js)

A general purpose PSD parser written in Coffeescript. Based off of [PSD.rb](https://github.com/layervault/psd.rb).

Runs in both NodeJS and the browser (using browserify).

## Basic Usage

PSD.js works almost exactly the same in the browser and NodeJS.

### NodeJS

``` js
var PSD = require('psd');
var psd = PSD.fromFile("path/to/file.psd");
psd.parse();

console.log(psd.header.export());
```

### Browser

``` js
var PSD = require('psd');

// Load from URL
PSD.fromURL("/path/to/file.psd").then(function(psd) {
  document.getElementById('ImageContainer').appendChild(psd.image.toPng());
});

// Load from event, e.g. drag & drop
function onDrop(evt) {
  PSD.fromEvent(evt).then(function (psd) {
    console.log(psd.tree().export());
  }); 
}
```
