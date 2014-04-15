BlendMode = require '../blend_mode.coffee'

module.exports =
  parseBlendModes: ->
    @blendMode = new BlendMode(@file)
    @blendMode.parse()

    @opacity = @blendMode.opacity
    @visible = @blendMode.visible
    @clipped = @blendMode.clipped

  hidden: -> not @visible

  # TODO: check section divider
  blendingMode: ->
    @blendMode.mode