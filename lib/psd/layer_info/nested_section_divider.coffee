LayerInfo = require '../layer_info.coffee'

# Not 100% sure what the purpose of this key is, but it seems to exist
# whenever the lsct key doesn't. Parsing this like a layer section
# divider seems to solve a lot of parsing issues with folders.
#
# See https://github.com/layervault/psd.rb/issues/38
module.exports = class NestedSectionDivider extends LayerInfo
  @shouldParse: (key) -> key is 'lsdk'

  constructor: (layer, length) ->
    super(layer, length)

    @isFolder = false
    @isHidden = false

  parse: ->
    code = @file.readInt()

    switch code
      when 1, 2 then @isFolder = true
      when 3 then @isHidden = true
