fs = require 'fs'
browserify = require 'browserify'
UglifyJS = require 'uglify-js'
Promise = require 'bluebird'
{spawn} = require 'child_process'
util = require 'util'

writeFile = (dest, src) ->
  new Promise (resolve, reject) ->
    fs.writeFile dest, src, ->
      fs.stat dest, (err, stats) ->
        return reject(err) if err?
        console.log "Wrote #{dest} - #{Math.round(stats.size / 1024)}KB"
        resolve()

task 'compile', 'Compile with browserify for the web', ->
  browserify
    noParse: [
      'fs'
    ]
  .transform('coffeeify')
  .require('./shims/png.coffee', expose: './image_exports/png.coffee')
  .require('./shims/init.coffee', expose: './psd/init.coffee')
  .require('./lib/psd.coffee', expose: 'psd')
  .bundle (err, src, map) ->
    return console.log(err) if err?
    writeFile('./dist/psd.js', src)
      .then ->
        minSrc = UglifyJS.minify './dist/psd.js',
          outSourceMap: 'psd.js.map'
          sourceRoot: '/'

        writeFile './dist/psd.min.js', minSrc.code
        minSrc
      .then (minSrc) ->
        writeFile './dist/psd.js.map', minSrc.map
      .then ->
        console.log 'Finished!'

task 'docs', 'Generate documentation', ->
  npm = spawn 'npm', ['run-script', 'docs']
  npm.stdout.pipe(process.stdout)
  npm.stderr.pipe(process.stderr)
