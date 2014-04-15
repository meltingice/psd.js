Mask = require '../mask.coffee'

module.exports =
  parseMaskData: ->
    @mask = new Mask(@file).parse()