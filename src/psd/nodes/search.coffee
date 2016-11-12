_ = require 'lodash'

module.exports =
  childrenAtPath: (path, opts = {}) ->
    unless Array.isArray(path)
      path = path.split('/').filter((p) -> p.length > 0)

    path = _.clone(path)
    query = path.shift()
    matches = @children().filter (c) ->
      if opts.caseSensitive
        c.name is query
      else
        c.name.toLowerCase() is query.toLowerCase()

    if path.length is 0
      return matches
    else
      return _.flatten matches.map (m) ->
        m.childrenAtPath(_.clone(path), opts)