import { cmykToRgb } from '../../color'

function setCmykChannels(image) {
  image.channelsInfo = [
    { id: 0 },
    { id: 1 },
    { id: 2 },
    { id: 3 }
  ];

  if (image.channels === 5) {
    image.channelsInfo.push({ id: -1 });
  }
}

function combineCmykChannel(image) {
  const cmykChannels = image.channelsInfo
    .map(ch => ch.id)
    .filter(ch => ch >= -1);

  let c = 0, m = 0, y = 0, k = 0, a;
  let index, val;
  for (var i = 0; i < image.numPixels; i++) {
    a = 255;

    for (index = 0; index < cmykChannels.length; index++) {
      val = image.channelData[i + (image.channelLength * index)];

      switch (cmykChannels[index]) {
        case -1: a = val; break;
        case 0: c = val; break;
        case 1: m = val; break;
        case 2: y = val; break;
        case 3: k = val; break;
      }
    }

    const [r, g, b] = cmykToRgb(255 - c, 255 - m, 255 - y, 255 - k);
    image.pixelData.push(r, g, b, a);
  }
}

export {
  setCmykChannels,
  combineCmykChannel
}
