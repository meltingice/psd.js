PSD           = require '../'
fs            = require 'fs'
rimraf        = require 'rimraf'
path          = require 'path'
should        = require 'should'
outputPath    = path.resolve(__dirname, "output")
fixturesPath  = path.resolve(__dirname, "fixtures")

describe "exporting from a PSD", ->
  beforeEach (done) ->
    fs.mkdir outputPath, done

  afterEach (done) ->
    rimraf outputPath, done

  it "should export a png", (done) ->
    psdPath       = path.resolve(__dirname, "../", "examples/images/example.psd")
    filePath      = path.join(outputPath, "out.png")
    expectedPath  = path.join(fixturesPath, "out.png")

    PSD.open(psdPath)
    .then (psd) ->
      psd.image.saveAsPng filePath
    .then ->
      fs.statSync(filePath).size
      .should
      .eql(fs.statSync(expectedPath).size)
    .then -> done
    .catch done()

