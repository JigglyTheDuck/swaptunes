const img = new Image();
img.src =
  "data:image/png;base64,R0lGODlhJAAkAOMAAAAAAB1Oi0WAymOk9fmVQPvVcfvqgv/83////wAAAAAAAAAAAAAAAAAAAAAAAAAAACH+EUNyZWF0ZWQgd2l0aCBHSU1QACH5BAEZAA8ALAAAAAAkACQAAAT+8MlJ6wM42805GGCIWRnQbV+oDuaFiWeVrqAgvOIYS4BA1zgWJtDa9XwrWxAQaBaNNpVyWTAQd5RjbaoCVA2GJ9Q2nbG+4DCWR74FBzc0WBw7ZqTetL5kvOPRAAhpBIR0JFpbeWkYg4VjbXF6kgaOdWUZcpOUTzpZZEwFoZmalV4FYnZNoZqTfBernJejrSSrYUUaPLOLtZmdMqxzvZolJcHCMrbHy2mnyYDF0YzBzhOmi4Rg2ZQE2tOT1bqA2+Td3ADUuMroBgcHYO7w7+3s4Jzr7fPx+fD1kuGvxmkzVy4MK4DXFg1ceC7dsz36Is45CDCgHEb74vn7V9GiJGkdG/WEMuSRmSZRJF2I2nUSZZ+VMGOu/FUHpE2SEQAAOw==";

export default function SlimChart(config) {
  var self = this;

  //
  // Override these default configuration parameters yourself
  //
  self.initialize = function (config) {
    const textColor = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--color-text-primary");
    const datasetColor = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--color-primary");
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue(
      "--color-background-secondary"
    );
    self.config = {
      canvas: config.canvas, // required - a canvas element
      axisLineWidth: config.axisLineWidth || 1,
      axisLineColor: config.axisLineColor || textColor,
      axisTextColor: config.axisTextColor || textColor,
      xAxisFormatter: config.xAxisFormatter || self.defaultXAxisFormatter,
      yAxisFormatter: config.yAxisFormatter || self.defaultYAxisFormatter,
      yAxisMin: config.yAxisMin,
      yAxisMax: config.yAxisMax,
      yAxisSteps: config.yAxisSteps || 5,
      yAxisStepLineColor: config.yAxisStepLineColor || bgColor,
      datasetLineWidth: config.datasetLineWidth || 2,
      datasetColor,
      datasetPointSizePicker:
        config.datasetPointSizePicker || self.defaultPointSizePicker,
      smooth: config.smooth || false,
      tension: config.tension || 4,
    };

    self.calculations = {};

    if (self.config.canvas instanceof HTMLCanvasElement) {
      self.config.context = self.config.canvas.getContext("2d");
    } else {
      throw new Error("canvas is not an element");
    }
  };

  //
  // Draws (or redraws) the chart; this can safely be called again with new data
  //
  self.draw = function (data, highlightedPoint) {
    self.clear();

    self.scaleForRetina();
    self.analyzeData(data);
    self.drawAxes(data);
    self.drawData(data, highlightedPoint);
  };

  //
  // Analyzes chart data to compute maximum and minimum
  //
  self.analyzeData = function (data) {
    var config = self.config;
    var calculations = self.calculations;
    var ctx = config.context;
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;

    if (window.devicePixelRatio) {
      w = w / window.devicePixelRatio;
      h = h / window.devicePixelRatio;
    }

    calculations.graphArea = {
      left: 100,
      top: 10,
      bottom: h - 50,
      right: w - 20,
    };

    var yAxisMax = Number.MIN_VALUE;
    var yAxisMin = Number.MAX_VALUE;

    data.forEach(function (value) {
      yAxisMax = Math.max(yAxisMax, value);
      yAxisMin = Math.min(yAxisMin, value);
    });

    if (typeof config.yAxisMax !== "undefined") {
      calculations.yAxisMax = config.yAxisMax;
    } else if (yAxisMax == Number.MIN_VALUE) {
      calculations.yAxisMax = 100;
    } else {
      //calculations.yAxisMax = self.calculateYAxisCeiling(yAxisMax);
      calculations.yAxisMax = yAxisMax * 1.01;
    }

    if (typeof config.yAxisMin !== "undefined") {
      calculations.yAxisMin = config.yAxisMin;
    } else if (yAxisMin == Number.MAX_VALUE) {
      calculations.yAxisMin = 0;
    } else {
      calculations.yAxisMin = yAxisMin * 0.99;
    }

    calculations.xStep =
      (calculations.graphArea.right - calculations.graphArea.left) /
      data.length;
  };

  //
  // Draws the x-axis, y-axis, and labels
  //
  self.drawAxes = function (data) {
    var config = self.config;
    var calculations = self.calculations;
    var ctx = config.context;
    ctx.font = "14px 'Press Start 2P'";
    var g = calculations.graphArea;

    ctx.translate(0.5, 0.5);
    //ctx.lineWidth = config.axisLineWidth;
    ctx.lineWidth = 2;
    ctx.strokeStyle = config.axisLineColor;
    ctx.fillStyle = config.axisTextColor;

    ctx.textBaseline = "middle";
    ctx.textAlign = "end";

    var yStep = (g.bottom - g.top) / config.yAxisSteps;

    for (var i = 0; i <= config.yAxisSteps; i++) {
      var x = g.left;
      var y = g.top + i * yStep;
      var range = calculations.yAxisMax - calculations.yAxisMin;
      var v = calculations.yAxisMax - (i / config.yAxisSteps) * range;
      var t = config.yAxisFormatter(v, calculations.yAxisMax);

      if (config.yAxisStepLineColor) {
        ctx.strokeStyle = config.yAxisStepLineColor;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(g.right, y);
        ctx.stroke();
      }

      ctx.strokeStyle = config.axisLineColor;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y);
      ctx.stroke();

      ctx.fillText(t, x - 30, y);
    }

    ctx.textBaseline = "top";
    ctx.textAlign = "right";

    for (var i = 0; i < data.length; i++) {
      if (i !== 1 && i !== data.length - 1) continue;
      var x = Math.round(g.left + calculations.xStep * i);
      var y = g.bottom;
      var t = i;

      if (t) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 5);
        ctx.stroke();

        ctx.textAlign = i === 0 ? "left" : "right";
        ctx.fillText(t, x + 5, y + 15);
      }
    }

    ctx.beginPath();
    ctx.moveTo(g.left, g.top);
    ctx.lineTo(g.left, g.bottom);
    ctx.lineTo(g.right, g.bottom);
    ctx.stroke();

    ctx.translate(-0.5, -0.5);
  };

  //
  // Draws a line showing values for each dataset
  //
  self.drawData = function (data, highlightedPoint) {
    var config = self.config;
    var calculations = self.calculations;
    var ctx = config.context;
    var g = calculations.graphArea;
    var height = g.bottom - g.top;

    var pointSize = 0;
    var lastX;
    var lastY;

    ctx.lineWidth = config.datasetLineWidth;
    ctx.strokeStyle = config.datasetColor;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();

    let highlightedXY = [];
    let prehighlightedXY = [];

    data.forEach(function (val, i) {
      var ratio =
        (val - calculations.yAxisMin) /
        (calculations.yAxisMax - calculations.yAxisMin);
      var x = Math.round(g.left + i * calculations.xStep);
      var y = Math.round(g.bottom - height * ratio);

      if (i == 0) {
        ctx.moveTo(x, y);
      } else {
        if (self.config.smooth) {
          var deltaX = x - lastX;
          var deltaY = y - lastY;
          var midpointX = Math.round(lastX + deltaX / 2);
          var midpointY = Math.round(lastY + deltaY / 2);

          ctx.quadraticCurveTo(
            lastX + Math.round(deltaX / self.config.tension),
            lastY,
            midpointX,
            midpointY
          );
          ctx.quadraticCurveTo(
            x - Math.round(deltaX / self.config.tension),
            y,
            x,
            y
          );
        } else {
          ctx.lineTo(x, y);
        }

        if (i === highlightedPoint - 1) {
          prehighlightedXY = [x, y];
        } else if (i === highlightedPoint) {
          highlightedXY = [x, y];
        }
      }

      if (pointSize) {
        ctx.fillRect(
          x - pointSize / 2,
          y - pointSize / 2,
          pointSize,
          pointSize
        );
      }

      lastX = x;
      lastY = y;
    });

    ctx.stroke();
    ctx.beginPath();
    if (highlightedXY[0] !== undefined) {
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.translate(highlightedXY[0], highlightedXY[1]);
      ctx.rotate(
        Math.atan2(
          highlightedXY[1] - prehighlightedXY[1],
          highlightedXY[0] - prehighlightedXY[0]
        )
      );

      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
      //ctx.arc(highlightedX, highlightedY, 5, 0, 2 * Math.PI);
      //ctx.fillStyle = "red";
      //ctx.fill();
    }
  };

  //
  // Scales the canvas for retina devices
  //
  self.scaleForRetina = function () {
    var ctx = self.config.context;

    if (window.devicePixelRatio && self.config.resizedAt !== ctx.canvas.width) {
      var width = ctx.canvas.width;
      var height = ctx.canvas.height;

      ctx.canvas.height = height * window.devicePixelRatio;
      ctx.canvas.width = width * window.devicePixelRatio;
      ctx.canvas.style.width = width + "px";
      ctx.canvas.style.height = height + "px";
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      self.config.resizedAt = ctx.canvas.width;
    }
  };

  //
  // Clears the canvas
  //
  self.clear = function () {
    self.config.context.clearRect(
      0,
      0,
      self.config.canvas.width,
      self.config.canvas.height
    );
  };

  //
  // Calculates the graph ceiling for the y-axis (allowing for a nice round
  // number as the maximum)
  //
  self.calculateYAxisCeiling = function (value) {
    var steps = self.config.yAxisSteps;
    var magnitude = Math.floor(Math.log(value) / Math.LN10);
    var multiplier = Math.pow(10, magnitude);
    var relative = value / multiplier;

    if (relative < 2) {
      return 2 * multiplier;
    } else if (relative < 3) {
      return 3 * multiplier;
    } else if (relative < 5) {
      return 5 * multiplier;
    } else {
      return 10 * multiplier;
    }
  };

  //
  // Default x-axis formatter that returns the literal value
  //
  self.defaultXAxisFormatter = function (val) {
    return val;
  };

  //
  // Default y-axis formatter that shows a reasonable amount of precision
  //
  self.defaultYAxisFormatter = function (value, max) {
    if (value == 0) {
      return "";
    } else if (max <= 0.1) {
      return value.toFixed(3);
    } else if (max <= 1) {
      return value.toFixed(2);
    } else if (max <= 10) {
      return value.toFixed(2);
    } else {
      return value.toFixed(0);
    }
  };

  //
  // Default dataset color picker that picks a random color per dataset
  //
  self.defaultColorPicker = function () {
    return "#" + Math.floor(/*Math.random()*/ 1 * 16777215).toString(16);
  };

  //
  // Default dataset point size picker that returns 0 (no points shown)
  //
  self.defaultPointSizePicker = function () {
    return 0;
  };

  self.initialize(config);
}
