_ = require 'lodash'

module.exports = class ResourceSection
  RESOURCES = [
    require('./resources/layer_comps.coffee')
  ]

  @factory: (resource) ->
    for Section in RESOURCES
      continue unless Section::id is resource.id
      return _.tap new Section(resource), (s) -> s.parse()

    null