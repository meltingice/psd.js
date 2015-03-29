RSVP = require 'rsvp'
{Module} = require 'coffeescript-module'

File      = require './psd/file.coffee'
LazyExecute = require './psd/lazy_execute.coffee'

Header    = require './psd/header.coffee'
Resources = require './psd/resources.coffee'
LayerMask = require './psd/layer_mask.coffee'
Image     = require './psd/image.coffee'

module.exports = class PSD extends Module
  @Node:
    Root: require('./psd/nodes/root.coffee')

  @extends require('./psd/init.coffee')

  constructor: (data) ->
    @file = new File(data)
    @parsed = false
    @header = null

    Object.defineProperty @, 'layers',
      get: -> @layerMask.layers

    RSVP.on 'error', (reason) -> console.error(reason)

  parse: ->
    return if @parsed

    @parseHeader()
    @parseResources()
    @parseLayerMask()
    @parseImage()

    @parsed = true

  parseHeader: ->
    @header = new Header(@file)
    @header.parse()

  parseResources: ->
    resources = new Resources(@file)
    @resources = new LazyExecute(resources, @file)
      .now('skip')
      .later('parse')
      .get()

  parseLayerMask: ->
    layerMask = new LayerMask(@file, @header)
    @layerMask = new LazyExecute(layerMask, @file)
      .now('skip')
      .later('parse')
      .get()

  parseImage: ->
    image = new Image(@file, @header)
    @image = new LazyExecute(image, @file)
      .later('parse')
      .ignore('width', 'height')
      .get()

  tree: -> new PSD.Node.Root(@)
