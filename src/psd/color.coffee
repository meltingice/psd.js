Util = require './util.coffee'

module.exports =
  # Converts from the CMYK color space to the RGB color space using
  # a preset color profile.
  cmykToRgb: (c, m, y, k) ->
    r = Util.clamp (65535 - (c * (255 - k) + (k << 8))) >> 8, 0, 255
    g = Util.clamp (65535 - (m * (255 - k) + (k << 8))) >> 8, 0, 255
    b = Util.clamp (65535 - (y * (255 - k) + (k << 8))) >> 8, 0, 255
    [r, g, b]
