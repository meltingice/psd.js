fs = require 'fs'
browserify = require 'browserify'

task 'compile', 'Compile with browserify for the web', ->
  browserify
    noParse: [
      'fs'
    ]
  .transform('coffeeify')
  .require('./shims/png.coffee', expose: './image_exports/png.coffee')
  .add('./lib/psd.coffee')
  .bundle (err, src) ->
    throw err if err?
    fs.writeFile './dist/psd.js', src, ->
      console.log "Compiled to ./dist/psd.js"