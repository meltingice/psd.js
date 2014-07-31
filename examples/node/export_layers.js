var PSD = require('../../');

var file = process.argv[2] || './examples/images/example.psd';
var start = new Date();

PSD.open(file).then(function (psd) {
  return psd.tree().descendants().forEach(function (node) {
    if (node.isGroup()) return true;
    return node.layer.image.saveAsPng("./output/#{node.name}.png");
  });
}).then(function () {
  console.log("Finished in " + ((new Date()) - start) + "ms");
});;
