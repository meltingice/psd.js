PSD           = require '../'
path          = require 'path'
should        = require 'should'

describe "extracting info from a text layer", ->

  it "should extract leading value", (done) ->
    psdPath   = path.resolve(__dirname, "../", "examples/images/example-leading.psd")
    expected  = [ 24 ]

    PSD.open(psdPath)
    .then (psd) ->
      actual = psd.tree().descendants()[0].get('typeTool').leadings()
      should(actual).eql(expected)
      done()
    .catch done

  it "should generate line-height when .toCSS() is called", (done)->
    psdPath   = path.resolve(__dirname, "../", "examples/images/example-leading.psd")
    expected  = '''font-family: Helvetica, AdobeInvisFont, KozGoPr6N-Regular;
line-height: 24px;
color: rgba(0, 0, 0, 255);
text-align: left;'''

    PSD.open(psdPath)
    .then (psd) ->
      actual = psd.tree().descendants()[0].get('typeTool').toCSS()
      should(actual).eql(expected)
      done()
    .catch done
