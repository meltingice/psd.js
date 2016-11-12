Util = require '../util.coffee'

module.exports =
  # Every Photoshop document has what we can consider to be the "legacy" name.
  # This used to be the sole place that Photoshop stored the layer name, but once
  # people started using fancy UTF-8 characters, they moved the layer name out into
  # a layer info block. This stayed behind for compatibility reasons. The newer layer
  # name is always preferred since it covers all possible characters (even emojis),
  # while this has a much more limited character set.
  parseLegacyLayerName: ->
    len = Util.pad4 @file.readByte()
    @legacyName = @file.readString(len)
