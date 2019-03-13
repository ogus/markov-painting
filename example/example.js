(function (window, document) {
  'use strict';

  var requestAnimFrame = (function (w) {
    return w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.mozRequestAnimationFrame;
  })(window);

  var RandomQueue = function (size) {
    this.container = new Array(size);
    this.lastIdx = 0;

    this.length = function () {
      return this.lastIdx;
    };

    this.enqueue = function (e) {
      this.container[this.lastIdx++] = e;
    };

    this.dequeue = function () {
      if(this.lastIdx == 0) {
        return null;
      }
      let idx = Math.floor(Math.random() * this.lastIdx);
      let t = this.container[idx];
      this.container[idx] = this.container[--this.lastIdx];
      return t;
    }
  };

  var neighbors = [{dx: -1, dy: 0}, {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}];

  // UI variables
  var canvas, ctx, button, input;

  // drawing variables
  var imgData, markovImage, pixelQueue, isBusy, now, then;

  var config = {
    width: 800,
    height: 600,
    initialPoints: 1,
    drawingSpeed: 0.06
  };

  var srcImage = "img/default.jpg";

  /*
  * UI methods
  */

  window.onload = function () {
    canvas = document.getElementById("canvas");
    canvas.width = config.width;
    canvas.height = config.height;
    ctx = canvas.getContext("2d");

    button = document.getElementById("button");
    input = document.getElementById("file_input");

    imgData = null;
    markovImage = new MarkovChainImage();
    pixelQueue = null;
    setBusy(false);
    then = now = 0;

    initListener();
    // getImageFromSrc(srcImage);
    let defaultImg = document.getElementById("default_img");
    document.getElementById("preview").src = defaultImg.src;
    createMarkovModel(defaultImg);
  }

  function initListener() {
    document.addEventListener('drop', function (e) {
      e.preventDefault();
      readFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', function () {
      readFile(input.files[0]);
    });

		let prevDefault = function (e) { e.preventDefault() }
		document.addEventListener('dragenter', prevDefault, false);
		document.addEventListener('dragover', prevDefault, false);
		document.addEventListener('dragleave', prevDefault, false);

    button.addEventListener("click", function() {
      animateMarkov();
    }, false);
  }

  function readFile(file) {
    if (!isBusy && !!file && file.type.includes('image')) {
      setBusy(true);

      let reader = new FileReader();
  		reader.addEventListener('load', function () {
        getImageFromSrc(reader.result);
      }, false);
      reader.readAsDataURL(file);
    }
  }

  /*
  * Drawing methods
  */

  function getImageFromSrc(src) {
    let img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = src;

    img.onload = function () {
      document.getElementById("preview").src = img.src;
      createMarkovModel(img);
    }
  }

  function createMarkovModel(image) {
    let canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    let context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    let currentImgData = context.getImageData(0, 0, image.width, image.height);

    setBusy(true);
    markovImage.resetModel();
    markovImage.feedAsync(currentImgData).then(function () {
      setBusy(false);
      animateMarkov();
    });
  }

  function animateMarkov() {
    pixelQueue = new RandomQueue(canvas.width * canvas.height * 0.005);
    imgData = ctx.createImageData(canvas.width, canvas.height);

    let x, y, color;
    for (var i = 0; i < config.initialPoints; i++) {
      x = Math.floor(Math.random() * canvas.width);
      y = Math.floor(Math.random() * canvas.height);
      color = markovImage.getRandomColor();
      if (color == null) {
        break;
      }

      setPixelColor(x, y, color);
      pixelQueue.enqueue([x, y]);
    }

    then = Date.now();
    loop();
  }

  function loop() {
    now = Date.now();
    if( iterate(now-then) ) {
      ctx.putImageData(imgData, 0, 0);
      then = now;
      requestAnimFrame(loop);
    }
  }

  function iterate(dt) {
    // if(pixelQueue.length() == 0) {
    //   return false;
    // }
    // adapt number of pixels to draw at constant speed
    let iterations = config.drawingSpeed * dt * pixelQueue.length();
    let pixel, color, pixelN, colorN;
    for (let i = 0; i < iterations; i++) {
      if(pixelQueue.length() == 0) {
        return false;
      }

      pixel = pixelQueue.dequeue();
      color = getPixelColor(pixel);
      if(!color) {
        continue;
      }

      for (var n of neighbors) {
        pixelN = [pixel.x + n.x, pixel.y + n.y];
        if(pixelN[0] >= 0 && pixelN[1] >= 0 && pixelN[0] < canvas.width && pixelN[1] < canvas.height) {
          colorN = getPixelColor(pixelN);

          if(!colorN) {
            colorN = markovImage.getColorTransition(color);
            setPixelColor(pixelN[0], pixelN[1], colorN);
            pixelQueue.enqueue(pixelN);
          }
        }
      }
    }
    return true;
  }

  function setPixelColor(x, y, color) {
    let idx = (x + y * imgData.width) << 2;
    imgData.data[idx] = color.r;
    imgData.data[idx+1] = color.g;
    imgData.data[idx+2] = color.b;
    imgData.data[idx+3] = 255;
  }

  function getPixelColor(pixel) {
    let idx = (pixel.x + pixel.y * imgData.width) << 2;
    if(imgData.data[idx+3] != 0) {
      return {
        r: imgData.data[idx],
        g: imgData.data[idx+1],
        b: imgData.data[idx+2]
      }
    }
    return false;
  }

  function setBusy(b) {
    if (b) {
      isBusy = true;
      button.textContent = "Computing..."
    }
    else {
      isBusy = false;
      button.textContent = "New Image";
    }
  }

})(window, window.document);
