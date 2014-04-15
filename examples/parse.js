var PSD = require('../');

psd = PSD.fromFile('/Users/ryanlefevre/LayerVault/Pillocks/Welcome Email.psd');
psd.parse();

console.log(psd.header.export());
psd.image.saveAsPng('./output.png').then(function () {
  console.log("Finished!");
});