BlendMode = require '../blend_mode.coffee'

module.exports =
  # Every layer defines how it's blended with the rest of the document.
  # This is represented in the Photoshop UI above the layer list as
  # a drop down. It also defines the layer opacity and whether it's a 
  # part of a clipping mask.
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
