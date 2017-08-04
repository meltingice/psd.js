function setGreyscaleChannels(image) {
  image.channelsInfo = [{ id: 0 }];
  if (image.channels === 2) {
    image.channelsInfo.push({ id: -1 });
  }
}

function combineGreyscaleChannel(image) {
  let grey, alpha;
  for (var i = 0; i < image.numPixels; i++) {
    grey = image.channelData[i];

    if (image.channels === 2) {
      alpha = image.channelData[image.channelLength + i];
    } else {
      alpha = 255;
    }

    image.pixelData.push(grey, grey, grey, alpha);
  }
}

export {
  setGreyscaleChannels,
  combineGreyscaleChannel
}
