(function (window, document) {
  "use strict";

  var requestAnimFrame = (function () {
    return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    window.oRequestAnimationFrame;
  })();

  // UI variables
  var canvas, ctx, button, input;

  // drawing variables
  var img_data, markov, pixel_list,
      is_busy, now, then;

  const neighbour = [
    {dx: -1, dy: 0},
    {dx: 0, dy: -1},
    {dx: 1, dy: 0},
    {dx: 0, dy: 1}
  ];

  var config = {
    width: 800,
    height: 600,
    points: 1,
    speed: 0.06
  };

  const SAMPLE_SRC = "assets/placeholder.jpg";

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

    markov = null;
    img_data = null;
    pixel_list = null;

    initListener();
    setBusy(false);
    extractDataFromSrc(SAMPLE_SRC);
  }

  function initListener() {
    document.addEventListener('drop', function (e) {
      e.preventDefault();
      readFile(e.dataTransfer.files[0]);
    }, false);
    input.addEventListener('change', function () {
      readFile(input.files[0]);
    }, false);

		let prevDefault = function (e) { e.preventDefault() }
		document.addEventListener('dragenter', prevDefault, false);
		document.addEventListener('dragover', prevDefault, false);
		document.addEventListener('dragleave', prevDefault, false);

    button.addEventListener("click", function() {
      animateMarkov();
    }, false);
  }

  function readFile(file) {
    if (!is_busy && file && file.type.includes('image')) {
      setBusy(true);

      let reader = new FileReader();
  		reader.addEventListener('load', function () {
        extractDataFromSrc(reader.result);
      }, false);
      reader.readAsDataURL(file);
    }
  }

  /*
  * Drawing methods
  */

  function extractDataFromSrc(src) {
    let img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = src;

    img.onload = function () {
      document.getElementById("preview").src = img.src;
      createMarkovModel(img);
    }
  }

  function createMarkovModel(img) {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    markov = new MarkovChainImage();
    markov.feed_async(ctx.getImageData(0,0,canvas.width,canvas.height))
    .then(function () {
      setBusy(false);
      animateMarkov();
    });
  }

  function animateMarkov() {
    pixel_list = new RandomQueue(canvas.width * canvas.height * 0.005);
    img_data = ctx.createImageData(canvas.width, canvas.height);

    let x, y, color;
    for (var i = 0; i < config.points; i++) {
      x = Math.floor(Math.random() * canvas.width);
      y = Math.floor(Math.random() * canvas.height);
      color = markov.getRandomColor();

      setPixel({x: x, y: y}, color);
      pixel_list.enqueue({x: x, y: y});
    }

    then = Date.now();
    loop();
  }

  function loop() {
    now = Date.now();
    if( iterate(now-then) ) {
      ctx.putImageData(img_data, 0, 0);
      then = now;
      requestAnimFrame(loop);
    }
  }

  function iterate(dt) {
    if(pixel_list.isEmpty()) {
      return false;
    }

    // adapt to draw at constant speed
    let speed = config.speed * dt * pixel_list.length();
    let px, color, n_px, n_color;

    for (let i = 0; i < speed; i++) {
      if(pixel_list.isEmpty()) {
        return false;
      }

      px = pixel_list.dequeue();
      color = getPixel(px);
      if(!color) {
        continue;
      }

      for (var n of neighbour) {
        n_px = {x: px.x + n.dx, y: px.y + n.dy};
        if(n_px.x >= 0 && n_px.y >= 0 && n_px.x < canvas.width && n_px.y < canvas.height) {
          n_color = getPixel(n_px);

          if(!n_color) {
            n_color = markov.getNeighbourColor(color);
            setPixel(n_px, n_color);
            pixel_list.enqueue(n_px);
          }
        }
      }
    }
    return true;
  }

  function setPixel(pixel, color) {
    let idx = (pixel.x + pixel.y * img_data.width) << 2;
    img_data.data[idx] = color.r;
    img_data.data[idx+1] = color.g;
    img_data.data[idx+2] = color.b;
    img_data.data[idx+3] = 255;
  }

  function getPixel(pixel) {
    if(pixel.x >= 0 && pixel.x < img_data.width && pixel.y >= 0 && pixel.y < img_data.height) {
      let idx = (pixel.x + pixel.y * img_data.width) << 2;
      if(img_data.data[idx+3] != 0) {
        return {
          r: img_data.data[idx],
          g: img_data.data[idx+1],
          b: img_data.data[idx+2]
        }
      }
      return false;
    }
    return false;
  }

  function setBusy(b) {
    if (b) {
      is_busy = true;
      button.textContent = "Computing..."
    }
    else {
      is_busy = false;
      button.textContent = "New Image";
    }
  }

})(window, window.document);
