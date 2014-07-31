fs = require 'fs'
browserify = require 'browserify'

task 'compile', 'Compile with browserify for the web', ->
  browserify
    noParse: [
      'fs'
    ]
  .transform('coffeeify')
  .require('./shims/png.coffee', expose: './image_exports/png.coffee')
  .require('./shims/init.coffee', expose: './psd/init.coffee')
  .require('./lib/psd.coffee', expose: 'psd')
  .bundle (err, src) ->
    return console.log(err) if err?
    fs.writeFile './dist/psd.js', src, ->
      fs.stat './dist/psd.js', (err, stats) ->
        console.log "Compiled to ./dist/psd.js - #{Math.round(stats.size / 1024)}KB"
