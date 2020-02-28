LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'
Color = require '../color.coffee'

module.exports = class GradientFill extends LayerInfo
  @shouldParse: (key) -> key is 'GdFl'

  parse: ->
    @file.seek 4, true # Skip sig
    @data = new Descriptor(@file).parse()
  
  colors: ->
    clrs = [];
    i = @data.Grad.Clrs.length
    while (i > 0)
      c = @data.Grad.Clrs[i-1]['Clr ']
      if c.class.id == 'RGBC'
        clrs.unshift([c['Rd  '], c['Grn '], c['Bl  ']])
      else
        clrs.unshift(Color.cmykToRgb(2.55 * c['Cyn '], 2.55 * c['Mgnt'], 2.55 * c['Ylw '], 2.55 * c['Blck']))
      i--
    clrs
