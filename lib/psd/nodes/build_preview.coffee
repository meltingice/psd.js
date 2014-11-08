module.exports =
  toPng: -> @layer.image.toPng()
  saveAsPng: (output) -> @layer.image.saveAsPng(output)
