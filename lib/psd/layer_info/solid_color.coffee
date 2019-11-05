LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'
Color = require '../color.coffee'

module.exports = class SolidColor extends LayerInfo
  @shouldParse: (key) -> key is 'SoCo'

  constructor: (layer, length) ->
    super(layer, length)

    @clr = [0, 0, 0]

  parse: ->
    @file.seek 4, true
    @data = new Descriptor(@file).parse()

    c = @colorData()
    if @data['Clr '].class.id == 'RGBC'
      @clr = [Math.round(c['Rd  ']), Math.round(c['Grn ']), Math.round(c['Bl  '])]
    else
      @clr = Color.cmykToRgb(2.55 * c['Cyn '], 2.55 * c['Mgnt'], 2.55 * c['Ylw '], 2.55 * c['Blck'])
           
  colorData: -> @data['Clr ']
  color: -> @clr
