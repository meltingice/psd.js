{Module} = require 'coffeescript-module'

# The blend mode describes important data regarding a layer, such as
# the blending mode, the opacity, and whether it's a part of a clipping mask.
module.exports = class BlendMode extends Module
  @aliasProperty 'blendingMode', 'mode'

  # All of the blend modes are stored in the PSD file with a specific key.
  # This is the mapping of that key to its readable name.
  BLEND_MODES = {
    norm: 'normal',
    dark: 'darken',
    lite: 'lighten',
    hue:  'hue',
    sat:  'saturation',
    colr: 'color',
    lum:  'luminosity',
    mul:  'multiply',
    scrn: 'screen',
    diss: 'dissolve',
    over: 'overlay',
    hLit: 'hard_light',
    sLit: 'soft_light',
    diff: 'difference',
    smud: 'exclusion',
    div:  'color_dodge',
    idiv: 'color_burn',
    lbrn: 'linear_burn',
    lddg: 'linear_dodge',
    vLit: 'vivid_light',
    lLit: 'linear_light',
    pLit: 'pin_light',
    hMix: 'hard_mix',
    pass: 'passthru',
    dkCl: 'darker_color',
    lgCl: 'lighter_color',
    fsub: 'subtract',
    fdiv: 'divide'
  }

  constructor: (@file) ->
    # The 4 character key for the blending mode.
    @blendKey = null

    # The opacity of the layer, from [0, 255].
    @opacity = null

    # Raw value for the clipping state of this layer.
    @clipping = null

    # Is this layer a clipping mask?
    @clipped = null
    @flags = null

    # The readable representation of the blend mode.
    @mode = null

    # Is this layer visible?
    @visible = null

  # Parses the blend mode data.
  parse: ->
    @file.seek 4, true

    @blendKey = @file.readString(4).trim()
    @opacity = @file.readByte()
    @clipping = @file.readByte()
    @flags = @file.readByte()

    @mode = BLEND_MODES[@blendKey]
    @clipped = @clipping is 1

    @visible = !((@flags & (0x01 << 1)) > 0)

    @file.seek 1, true

  # Returns the layer opacity as a percentage.
  opacityPercentage: -> @opacity * 100 / 255
