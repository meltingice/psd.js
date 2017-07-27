function parseRaw(image) {
  image.channelData = image.file.read(image.length);
}

export { parseRaw }
