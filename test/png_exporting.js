/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const PSD           = require('../');
const fs            = require('fs');
const rimraf        = require('rimraf');
const path          = require('path');
const should        = require('should');
const outputPath    = path.resolve(__dirname, "output");
const fixturesPath  = path.resolve(__dirname, "fixtures");

describe("exporting from a PSD", function() {
  beforeEach(done => fs.mkdir(outputPath, done));

  afterEach(done => rimraf(outputPath, done));

  return it("should export a png", function(done) {
    const psdPath       = path.resolve(__dirname, "../", "examples/images/example.psd");
    const filePath      = path.join(outputPath, "out.png");
    const expectedPath  = path.join(fixturesPath, "out.png");

    return PSD.open(psdPath)
    .then(psd => psd.image.saveAsPng(filePath)).then(() => fs.statSync(filePath).size
    .should
    .eql(fs.statSync(expectedPath).size)).then(() => done)
    .catch(done());
  });
});

