var PSD = require('../../');

var file = process.argv[2] || './examples/images/example.psd';
var start = new Date();

PSD.open(file).then(function (psd) {
  return psd.image.saveAsPng('./output.png');
}).then(function () {
  console.log("Finished in " + ((new Date()) - start) + "ms");
});;