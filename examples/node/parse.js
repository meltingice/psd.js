var fs = require('fs');
var PSD = require('../../dist/psd.js').default;

var file = process.argv[2] || './examples/images/example.psd';
var psd = new PSD(fs.readFileSync(file));
psd.parse();

console.log(psd.header.export());
console.log(psd.resources.resource('layerComps').export());
console.log(psd.layerMask.layers.length, 'Layers');

psd.layerMask.layers.forEach(function (layer) {
  console.log(layer.name);
})

console.log(psd.image.pixelData.length);
