Descriptor = require '../descriptor.coffee'

module.exports = class LayerComps
  id: 1065
  name: 'layerComps'

  @visibilityCaptured: (comp) ->
    comp.capturedInfo & parseInt('001', 2) > 0

  @positionCaptured: (comp) ->
    comp.positionCaptured & parseInt('010', 2) > 0

  @appearanceCaptured: (comp) ->
    comp.appearanceCaptured & parseInt('100', 2) > 0

  constructor: (@resource) ->
    @file = @resource.file

  parse: ->
    @file.seek 4, true
    @data = new Descriptor(@file).parse()

  names: -> @data.list.map (comp) -> comp['Nm  ']
  export: ->
    @data.list.map (comp) ->
      id: comp.compID
      name: comp['Nm  ']
      capturedInfo: comp.capturedInfo