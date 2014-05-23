LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class Metadata extends LayerInfo
  @shouldParse: (key) -> key is 'shmd'

  parse: ->
    count = @file.readInt()

    for i in [0...count]
      @file.seek 4, true

      key = @file.readString(4)
      
      copyOnSheetDup = @file.readByte()
      @file.seek 3, true #padding

      len = @file.readInt()
      end = @file.tell() + len

      @parseLayerComps() if key is 'cmls'

      @file.seek end

  parseLayerComps: ->
    @file.seek 4, true
    @data.layerComp = new Descriptor(@file).parse()