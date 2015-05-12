# A general purpose parser for Photoshop files. PSDs are broken up in to 4 logical sections:
# the header, resources, the layer mask (including layers), and the preview image. We parse
# each of these sections in order.
# 
# ## NodeJS Examples
# 
# ** Parsing asynchronously **
# ``` coffeescript
# PSD.open('path/to/file.psd').then (psd) ->
#   console.log psd.tree().export()
# ```
#     
# ** Parsing synchronously **
# ``` coffeescript
# psd = PSD.fromFile('path/to/file.psd')
# psd.parse()
# console.log psd.tree().export()
# ```
# 
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

  # Creates a new PSD object. Typically you will use a helper method to instantiate
  # the PSD object. However, if you already have the PSD data stored as a Uint8Array,
  # you can instantiate the PSD object directly.
  constructor: (data) ->
    @file = new File(data)
    @parsed = false
    @header = null

    Object.defineProperty @, 'layers',
      get: -> @layerMask.layers

    RSVP.on 'error', (reason) -> console.error(reason)

  # Parses the PSD. You must call this method before attempting to
  # access PSD data. It will not re-parse the PSD if it has already
  # been parsed.
  parse: ->
    return if @parsed

    @parseHeader()
    @parseResources()
    @parseLayerMask()
    @parseImage()

    @parsed = true

  # The next 4 methods are responsible for parsing the 4 main sections of the PSD.
  # These are private, and you should never call them from your own code.
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

  # Returns a tree representation of the PSD document, which is the
  # preferred way of accessing most of the PSD's data.
  tree: -> new PSD.Node.Root(@)
