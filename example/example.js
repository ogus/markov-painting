var requestAnimFrame = (function (w) {
  return w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.mozRequestAnimationFrame;
})(window);

var RandomStack = function (length) {
  this._data = new Array(length);
  this.length = 0;

  this.push = function (e) {
    this._data[this.length++] = e;
  };

  this.pop = function () {
    if (this.length == 0) {
      return null;
    }
    var idx = Math.floor(Math.random() * this.length);
    var e = this._data[idx];
    this._data[idx] = this._data[--this.length];
    return e;
  }
};

var Stack = function (length) {
  this._data = new Array(length);
  this.length = 0;

  this.push = function (e) {
    this._data[this.length] = e;
    this.length++;
  };

  this.pop = function () {
    this.length--;
    return this._data[this.length];
  }
};

var ADJACENT = [ {x: -1, y: 0}, {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1} ];

var DOM = {
  canvas: null,
  ctx: null,
  input: null,
  preview: null,
  button: null
};

var ENV = {
  imageData: null,
  markovPainting: null,
  pointStack: null,
  isBusy: null,
  isPainting: null,
  now: null,
  then: null
};

var CONFIG = {
  width: 800,
  height: 600,
  initialPoints: 1,
  drawingSpeed: 0.05
};

window.onload = function () {
  initDOM();
  initEvents();
  initENV();

  loadImage(DOM.preview.src);
}

function initDOM() {
  DOM.canvas = document.getElementById("canvas");
  DOM.canvas.width = CONFIG.width;
  DOM.canvas.height = CONFIG.height;
  DOM.ctx = DOM.canvas.getContext("2d");

  DOM.input = document.getElementById("file_input");
  DOM.preview = document.getElementById("preview");
  DOM.button = document.getElementById("button");
  DOM.button.textContent = "New Image";
}

function initEvents() {
  let prevDefault = function (e) { e.preventDefault() }
  document.addEventListener("dragenter", prevDefault, false);
  document.addEventListener("dragover", prevDefault, false);
  document.addEventListener("dragleave", prevDefault, false);
  document.addEventListener("drop", function (e) {
    e.preventDefault();
    readFile(e.dataTransfer.files[0]);
  });
  DOM.input.addEventListener("change", function () {
    readFile(DOM.input.files[0]);
  });

  DOM.button.addEventListener("click", function() {
    startPainting();
  });
}

function initENV() {
  ENV.markovPainting = new MarkovPainting();
  ENV.isBusy = false;
  ENV.then = 0;
  ENV.now = 0;
}

function readFile(file) {
  if (!ENV.isBusy && !!file && file.type.includes("image")) {
    setBusy(true);
    var reader = new FileReader();
    reader.addEventListener("load", function () {
      loadImage(reader.result);
    }, false);
    reader.readAsDataURL(file);
  }
}

function loadImage(src) {
  var image = new Image();
  image.setAttribute("crossOrigin", "anonymous");
  image.src = src;

  image.onload = function () {
    DOM.preview.src = image.src;
    initMarkovChain(image);
  }
}

function initMarkovChain(image) {
  setBusy(true);
  ENV.markovPainting.reset();
  var canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  var context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  var imageData = context.getImageData(0, 0, image.width, image.height);
  ENV.markovPainting.feedImageData(imageData);

  var newImageData = ENV.markovPainting.createImageData(DOM.canvas.width, DOM.canvas.height);
  ENV.imageData = DOM.ctx.createImageData(DOM.canvas.width, DOM.canvas.height);
  for (var i = 0; i < ENV.imageData.data.length; i++) {
    ENV.imageData.data[i] = newImageData[i];
  }
  DOM.ctx.putImageData(ENV.imageData, 0, 0);
  setBusy(false);
}

function startPainting() {
  ENV.pointStack = new RandomStack();
  ENV.imageData = DOM.ctx.createImageData(DOM.canvas.width, DOM.canvas.height);

  var point = {
    x: Math.floor(Math.random() * DOM.canvas.width),
    y: Math.floor(Math.random() * DOM.canvas.height)
  }
  var color = ENV.markovPainting.getRandomColor();
  setPixelColor(ENV.imageData, point, color);
  ENV.pointStack.push(point);

  ENV.then = Date.now();
  loop();
}

function loop() {
  ENV.now = Date.now();
  var drawing = draw();
  DOM.ctx.putImageData(ENV.imageData, 0, 0);
  if(drawing) {
    ENV.then = ENV.now;
    requestAnimFrame(loop);
  }
}

function draw() {
  var dt = ENV.now - ENV.then;
  var iterations = CONFIG.drawingSpeed * dt * ENV.pointStack.length;
  var point = null, color = null;
  var x = 0, y = 0, nextPoint = null, nextColor = null;
  for (var i = 0; i < iterations; i++) {
    if (ENV.pointStack.length == 0) { return false; }
    point = ENV.pointStack.pop();
    color = getPixelColor(ENV.imageData, point);
    for (var k = 0; k < ADJACENT.length; k++) {
      x = point.x + ADJACENT[k].x,
      y = point.y + ADJACENT[k].y
      if(x >= 0 && y >= 0 && x < ENV.imageData.width && y < ENV.imageData.height) {
        nextPoint = { x: x, y: y };
        nextColor = getPixelColor(ENV.imageData, nextPoint);
        if (nextColor.a == 0) {
          nextColor = ENV.markovPainting.getNextColor(color);
          setPixelColor(ENV.imageData, nextPoint, nextColor);
          ENV.pointStack.push(nextPoint);
        }
      }
    }
  }
  return true;
}

function setPixelColor(imageData, point, color) {
  var idx = (point.x + point.y * imageData.width) << 2;
  imageData.data[idx] = color.r;
  imageData.data[idx+1] = color.g;
  imageData.data[idx+2] = color.b;
  imageData.data[idx+3] = 255;
}

function getPixelColor(imageData, point) {
  var idx = (point.x + point.y * imageData.width) << 2;
  return {
    r: imageData.data[idx],
    g: imageData.data[idx+1],
    b: imageData.data[idx+2],
    a: imageData.data[idx+3]
  }
}

function setBusy(b) {
  ENV.isBusy = b;
  DOM.button.textContent = b ? "Computing..." : "New Image";
}
