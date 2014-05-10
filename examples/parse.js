var PSD = require('../');

psd = PSD.open('./examples/images/example.psd', function (psd) {
  psd.image.saveAsPng('./output.png')
});
// psd.image.saveAsPng('./output.png').then(function () {
//   console.log("Finished!");
// });