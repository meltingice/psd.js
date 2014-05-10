var PSD = require('../');

psd = PSD.open('./examples/images/example.psd').then(function (psd) {
  psd.image.saveAsPng('./output.png')
});