var PSD = require('../');

var file = process.argv[2] || './examples/images/example.psd';
var start = new Date();
psd = PSD.open(file).then(function (psd) {
  psd.image.saveAsPng('./output.png').then(function () {
    console.log("Finished in " + ((new Date()) - start) + "ms");
  });
});