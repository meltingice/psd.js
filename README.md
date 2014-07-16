# PSD.js

[![Build Status](https://travis-ci.org/meltingice/psd.js.svg?branch=master)](https://travis-ci.org/meltingice/psd.js)

A general purpose PSD parser written in Coffeescript. Based off of [PSD.rb](https://github.com/layervault/psd.rb).

Runs in both NodeJS and the browser (using browserify). There are still some pieces missing that are present in PSD.rb, such as layer comp filtering, a built-in renderer, and many layer info blocks. The eventual goal is full feature parity with PSD.rb.

## Installation

Before installing from npm, you must install libpng, which is available on all popular package management systems. On OSX with homebrew, you can do `brew install libpng`. The install success for node-png is currently hit or miss, so alternate image packages are currently under consideration.

Once your system is ready, simply add to your package.json dependencies or run `npm install psd`.

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
