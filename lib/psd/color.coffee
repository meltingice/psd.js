Util = require './util.coffee'

module.exports =
  cmykToRgb: (c, m, y, k) ->
    r = Util.clamp (65535 - (c * (255 - k) + (k << 8))) >> 8, 0, 255
    g = Util.clamp (65535 - (m * (255 - k) + (k << 8))) >> 8, 0, 255
    b = Util.clamp (65535 - (y * (255 - k) + (k << 8))) >> 8, 0, 255
    [r, g, b]

  # def cmyk_to_rgb(c, m, y, k)
  #   Hash[{
  #     r: (65535 - (c * (255 - k) + (k << 8))) >> 8,
  #     g: (65535 - (m * (255 - k) + (k << 8))) >> 8,
  #     b: (65535 - (y * (255 - k) + (k << 8))) >> 8
  #   }.map { |k, v| [k, Util.clamp(v, 0, 255)] }]
  # end
