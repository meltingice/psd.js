Mask = require '../mask.coffee'

module.exports =
  # Every layer has a mask section, whether or not the layer actually
  # has a mask defined. If there is no mask, then the mask size will be
  # 0 and we'll move on to the next thing.
  parseMaskData: ->
    @mask = new Mask(@file).parse()
