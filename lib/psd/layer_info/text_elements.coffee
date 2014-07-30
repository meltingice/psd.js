LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class TextElements extends LayerInfo
  @shouldParse: (key) -> key is 'TySh'

  TRANSFORM_VALUE = ['xx', 'xy', 'yx', 'yy', 'tx', 'ty']
  COORDS_VALUE = ['left', 'top', 'right', 'bottom']

  constructor: (layer, length) ->
    super(layer, length)

    @version = null
    @transform = {}
    @textVersion = null
    @descriptorVersion = null
    @textDate = null
    @warpVersion = null
    @descriptorVersion = null
    @warpDate = null
    @coords = {}

    @parse() #lazy貌似没执行啊，手动执行下.
  parse: ->
    @version = @file.readShort()

    for name, index in TRANSFORM_VALUE
      @transform[name] = @file.readDouble()

    @textVersion = @file.readShort()
    @descriptorVersion = @file.readInt()

    @textDate = new Descriptor(@file).parse()

    @warpVersion = @file.readShort()

    # @warpDate = new Descriptor(@file).parse()

    # for name, value 
    console.log('TextElements loaded')
  skip: ->