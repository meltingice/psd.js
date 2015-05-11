RSVP = require 'rsvp'
{Module} = require 'coffeescript-module'

File      = require './psd/file.coffee'
LazyExecute = require './psd/lazy_execute.coffee'

Header    = require './psd/header.coffee'
Resources = require './psd/resources.coffee'
LayerMask = require './psd/layer_mask.coffee'
Image     = require './psd/image.coffee'

# A general purpose parser for Photoshop files. PSDs are broken up in to 4 logical sections:
# the header, resources, the layer mask (including layers), and the preview image. We parse
# each of these sections in order.
# 
# @example How to read and parse a PSD asynchronously
#   PSD.open('path/to/file.psd').then (psd) ->
#     console.log psd.tree().export()
#     
# @example How to read and parse a PSD synchronously
#   psd = PSD.fromFile('path/to/file.psd')
#   psd.parse()
#   console.log psd.tree().export()
module.exports = class PSD extends Module
  # @nodoc
  @Node:
    Root: require('./psd/nodes/root.coffee')

  @extends require('./psd/init.coffee')

  # Creates a new PSD object.
  # 
  # @param [Uint8Array] The PSD file data.
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

  # @private
  parseHeader: ->
    @header = new Header(@file)
    @header.parse()

  # @private
  parseResources: ->
    resources = new Resources(@file)
    @resources = new LazyExecute(resources, @file)
      .now('skip')
      .later('parse')
      .get()

  # @private
  parseLayerMask: ->
    layerMask = new LayerMask(@file, @header)
    @layerMask = new LazyExecute(layerMask, @file)
      .now('skip')
      .later('parse')
      .get()

  # @private
  parseImage: ->
    image = new Image(@file, @header)
    @image = new LazyExecute(image, @file)
      .later('parse')
      .ignore('width', 'height')
      .get()

  # Returns a tree representation of the PSD document, which is the
  # preferred way of accessing most PSD data.
  # 
  # @return [Node.Root] The root node of the PSD.
  tree: -> new PSD.Node.Root(@)
