var fs = require('fs');
var PSD = require('../../dist/psd.js').default;
var PSDTools = require('../../dist/psd-node.js');
var imageToPng = require('../../dist/psd.js').imageToPng;

var file = process.argv[2] || './examples/images/example.psd';
var psd = new PSD(fs.readFileSync(file));
psd.parse();

console.log(psd.header.export());
console.log(psd.resources.resource('layerComps').export());
console.log(psd.layerMask.layers.length, 'Layers');

psd.layerMask.layers.forEach(function (layer) {
  console.log(layer.name);
})

PSDTools.PNG.saveAsPng(psd.image, './output.png').then(function () {
  console.log("Image written to output.png!");
});
