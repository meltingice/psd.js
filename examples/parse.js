var PSD = require('../');

psd = PSD.open('./examples/images/example.psd', function (psd) {
  console.log(psd.header.export());
  console.log(psd.tree().export());
});
// psd.image.saveAsPng('./output.png').then(function () {
//   console.log("Finished!");
// });