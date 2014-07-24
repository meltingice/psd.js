# PSD.js

[![Build Status](https://travis-ci.org/meltingice/psd.js.svg?branch=master)](https://travis-ci.org/meltingice/psd.js)

A general purpose PSD parser written in Coffeescript. Based off of [PSD.rb](https://github.com/layervault/psd.rb).

Runs in both NodeJS and the browser (using browserify). There are still some pieces missing that are present in PSD.rb, such as layer comp filtering, layer image exporting, a built-in renderer, and many layer info blocks. The eventual goal is full feature parity with PSD.rb.

## Installation

PSD.js has no native dependencies. Simply add `psd` to your package.json or run `npm install psd`.

## Basic Usage

PSD.js works almost exactly the same in the browser and NodeJS.

### NodeJS

``` js
var PSD = require('psd');
var psd = PSD.fromFile("path/to/file.psd");
psd.parse();

console.log(psd.tree().export());
console.log(psd.tree().childrenAtPath('A/B/C')[0].export());

// You can also use promises syntax for opening and parsing
PSD.open("path/to/file.psd").then(function (psd) {
  return psd.image.saveAsPng('./output.png');
}).then(function () {
  console.log("Finished!");
});

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
