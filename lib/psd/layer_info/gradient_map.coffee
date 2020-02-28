LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class GradientMap extends LayerInfo
  @shouldParse: (key) -> key is 'grdm'

  constructor: (layer, length) ->
    super(layer, length)

    @gradient = {}
    @gradient.inverted = false
    @gradient.dithered = false

  parse: ->
    @file.seek 2, true
    @gradient.inverted = @file.readBoolean()
    @gradient.dithered = @file.readBoolean()
    @gradient.name = @file.readUnicodeString()
    @gradient.stops = []
    c = @file.readUShort()
    while (c > 0)
      grad = {}
      grad.location = @file.readUInt()
      grad.midPoint = @file.readUInt()
      grad.mode = @file.readUShort()
      grad.color = []
      cs = 0
      while (cs < @layer.channels)
        grad.color.push(@file.readUShort() / 256)
        cs++
      @gradient.stops.push(grad)
      c--

    @gradient.transparencies = []
    c = @file.readUShort()
    while (c > 0)
      transp = {}
      transp.location = @file.readUInt()
      transp.midPoint = @file.readUInt()
      transp.opacity = @file.readUShort()
      @gradient.transparencies.push(transp)
      c--
    @gradient.expansionCount = @file.readUShort()
    @gradient.interpolation = @file.readUShort()
    @gradient.length = @file.readUShort()
    @gradient.mode = @file.readUShort()
    @gradient.seed = @file.readInt()
    @gradient.showTransparency = @file.readUShort()
    @gradient.useColor = @file.readUShort()
    @gradient.roughness = @file.readInt()
    @gradient.colorModel = @file.readUShort()
    @gradient.minColor = [@file.readUShort() / 256, @file.readUShort() / 256, @file.readUShort() / 256, @file.readUShort() / 256]
    @gradient.maxColor = [@file.readUShort() / 256, @file.readUShort() / 256, @file.readUShort() / 256, @file.readUShort() / 256]
    @file.readUShort()
    
  gradientMap: -> @gradient

