var _ = require('lodash');
var PSD = require('../../');
var file = process.argv[2] || './examples/images/example.psd';

PSD.open(file).then(function (psd) {
  var type, fonts = [];
  psd.tree().descendants().forEach(function (node) {
    type = node.get('typeTool');
    if (!type) return;
    fonts = fonts.concat(type.fonts());
  });

  console.log(_.uniq(fonts));
});
