var PSD = require('../../');

PSD.open('./examples/images/example.psd').then(function (psd) {
  console.log(psd.resources.resource('layerComps').export());
});
