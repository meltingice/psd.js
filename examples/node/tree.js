var util = require('util');
var PSD = require('../../');

var file = process.argv[2] || './examples/images/example.psd';

var psd = PSD.fromFile(file);
psd.parse();

console.log(util.inspect(psd.tree().export(), {depth: null}));
