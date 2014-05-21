var PSD = require('../../');

var file = process.argv[2] || './examples/images/example.psd';

PSD.open(file).then(function (psd) {
  console.log(psd.tree().export());
});