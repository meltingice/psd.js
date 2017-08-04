import fs from 'fs'
import { PNG } from 'pngjs'

function imageToPng(image) {
  const png = new PNG({
    filterType: 4,
    width: image.width,
    height: image.height
  });

  png.data = image.pixelData;
  return png;
}

function saveAsPng(image, path) {
  return new Promise((resolve, reject) => {
    imageToPng(image)
      .pack()
      .pipe(fs.createWriteStream(path))
      .on('error', reject)
      .on('finish', resolve);
  })
}

export {
  imageToPng,
  saveAsPng
}
