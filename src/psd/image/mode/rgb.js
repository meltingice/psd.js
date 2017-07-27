function setRgbChannels(image) {
  image.channelsInfo = [
    { id: 0 },
    { id: 1 },
    { id: 2 }
  ];

  if (image.header.channels === 4) {
    image.channelsInfo.push({ id: -1 });
  }
}

function combineRgbChannel(image) {
  const rgbChannels = image.channelsInfo
    .map(ch => ch.id)
    .filter(ch => ch >= -1);

  let r = 0, g = 0, b = 0, a;
  let index, val;
  for (var i = 0; i < image.numPixels; i++) {
    a = 255;

    for (index = 0; index < rgbChannels.length; index++) {
      val = image.channelData[i + (image.channelLength * index)];

      switch (rgbChannels[index]) {
        case -1: a = val; break;
        case 0: r = val; break;
        case 1: g = val; break;
        case 2: b = val; break;
      }
    }

    image.pixelData.push(r, g, b, a);
  }
}

export {
  setRgbChannels,
  combineRgbChannel
}
