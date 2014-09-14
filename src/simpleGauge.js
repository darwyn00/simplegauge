/*!
 * simpleGauge.js
 * Version: 0.8.0
 *
 * Copyright 2014 Rajorshi Kar
 * Released under the Apache 2 license
 * https://github.com/darwyn00/simplegauge/blob/master/LICENSE
 */
(function($) {

	var SimpleGauge = function(options, elms) {
		// Member Variables
		var opts, colorMap, container, canvas, ctx, x, y, radius, desc, val, valuePct, targetValue, min, max, currentAnimStartTime, me = this

		// Constructor

		// Extend our default options with those provided.
		// Note that the first argument to extend is an empty
		// object – this is to keep from overriding our "defaults" object.
		opts = $.extend({}, $.fn.simpleGauge.defaults, options);

		// Create a canvas element inside the container
		container = elms[0];
		canvas = document.createElement('canvas');
		canvas.width = container.offsetWidth;
		canvas.height = container.offsetHeight;
		container.appendChild(canvas);
		ctx = canvas.getContext('2d');
		min = opts.min;
		max = opts.max;
		// sort the gauge colors by their upper thresholds
		colorMap = opts.gaugeFgColors.sort(function(a, b) {
			return a.hi - b.hi;
		});

		// on layout changes, make sure to scale and redraw the gauge
		$(window).resize(function() {
			canvas.width = container.offsetWidth;
			canvas.height = container.offsetHeight;
			me.draw();
		});

		// hookup the requestAnimationFrame for smooth animation with fallbacks
		if (!('requestAnimFrame' in window)) {
			window.requestAnimFrame = (function(callback) {
				return window.requestAnimationFrame
						|| window.webkitRequestAnimationFrame
						|| window.mozRequestAnimationFrame
						|| window.oRequestAnimationFrame
						|| window.msRequestAnimationFrame
						|| function(callback) {
							window.setTimeout(callback, 1000 / 60);
						};
			})();
		}
		
		
		// Public Method - Updates the Gauge to the passed in value
		this.update = function(value) {
			if (opts.animate) {
				// requestAnimationFrame will be called by the browser every
				// time the browser needs to repaint which can be up to 60 times
				// per second
				currentAnimStartTime = undefined;
				targetValue = Math.max(Math.min(value, max), min);
			} else {
				me.draw(Math.max(Math.min(value, max), min));
			}
		}

		// Public Method - Animates a draws/updates the gauge with a new value
		this.animationLoop = function(time) {
			if (!currentAnimStartTime)
				currentAnimStartTime = (window.performance && performance.now() || Date.now());

			if (val == undefined)
				val = min;

			// time difference since start of animation (if the browser doesn't
			// support high res timers use Date.now() as the fallback)
			var newValue, elapsedTime = (window.performance && performance.now() || Date.now()) - currentAnimStartTime;

			if (val < targetValue) {
				// we're increasing our value
				newValue = val + ((targetValue - val) * elapsedTime/opts.animDuration);

				if (newValue > targetValue)
					newValue = targetValue;

				me.draw(Math.floor(newValue));
			} else if (val > targetValue) {

				// we're decreasing our value
				newValue = val - ((val - targetValue) * elapsedTime/opts.animDuration);

				if (newValue < targetValue)
					newValue = targetValue;

				me.draw(Math.floor(newValue));
			} else {
				// we're at the target value; so don't need to draw anything
			}

			window.requestAnimFrame(me.animationLoop);
		}

		// Public Method - draws/updates the gauge with a new value
		this.draw = function(value) {
			// compute new drawing dimensions
			if (value !== undefined && value != null) {
				val = value;
			}
			x = canvas.width / 2;
			y = canvas.height * .65;
			radius = canvas.width < canvas.height ? canvas.width * .35
					: canvas.height * .4;
			valuePct = (val - min) / (max - min);
			canvas.textContent = val;
			desc = opts.desc;

			// clear stale canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// gauge background
			ctx.beginPath();
			ctx.arc(x, y, radius, Math.PI, 2 * Math.PI, false);
			ctx.lineWidth = radius * 0.45;
			ctx.strokeStyle = opts.gaugeBkColor;
			ctx.stroke();

			// gauge foreground
			ctx.beginPath();
			if (opts.continuousColor && val != min) {
				// primer layer (white background color)
				ctx.arc(x, y, radius, Math.PI, (1 + valuePct) * Math.PI, false);
				ctx.strokeStyle = '#FFF';
				ctx.stroke();
				ctx.closePath();

				// find two sector colors (one contains it, the other is the
				// next nearest)
				var color2Idx, color1Idx, color1Alpha, color2Alpha, lastColorIdx = colorMap.length - 1;

				if (colorMap[0].lo <= val && colorMap[0].hi >= val) {
					// 1st and 2nd elements will be mixed
					color1Idx = 0;
					color2Idx = 1;
				} else {
					if (colorMap[lastColorIdx].lo <= val
							&& colorMap[lastColorIdx].hi >= val) {
						// last and 2nd to last elements will be mixed
						color1Idx = lastColorIdx - 1;
						color2Idx = lastColorIdx;
					} else {
						for (var i = 1; i < colorMap.length - 1; i++) {
							if (colorMap[i].lo <= val && colorMap[i].hi >= val) {
								// Determine which side of the midpt
								if ((colorMap[i].lo + colorMap[i].hi) / 2 < val) {
									color1Idx = i;
									color2Idx = i + 1;
								} else {
									color1Idx = i - 1;
									color2Idx = i;
								}
								break;
							}
						}
					}
				}

				if (color2Idx == lastColorIdx) {

					if (color1Idx == 0)
						// Color 1 is the first sector and Color 2 is the last
						// sector
						color1Alpha = (colorMap[color2Idx].hi - val)
								/ (colorMap[color2Idx].hi - colorMap[color1Idx].lo);
					else
						// Color 1 is a mid sector and Color 2 is the last
						// sector
						color1Alpha = (colorMap[color2Idx].hi - val)
								/ (colorMap[color2Idx].hi - (colorMap[color1Idx].hi + colorMap[color1Idx].lo) / 2);
				} else {
					// Color 1 is the first sector and color 2 is a mid sector
					if (color1Idx == 0 && color2Idx != lastColorIdx)
						color1Alpha = ((colorMap[color2Idx].hi + colorMap[color2Idx].lo) / 2 - val)
								/ ((colorMap[color2Idx].hi + colorMap[color2Idx].lo) / 2 - colorMap[color1Idx].lo);
					else
						// Color 1 and Color 2 are mid sectors
						color1Alpha = ((colorMap[color2Idx].hi + colorMap[color2Idx].lo) / 2 - val)
								/ ((colorMap[color2Idx].hi + colorMap[color2Idx].lo) / 2 - (colorMap[color1Idx].hi + colorMap[color1Idx].lo) / 2);
				}
				color2Alpha = 1 - Math.abs(color1Alpha);

				// Apply first layer using Color1
				ctx.beginPath();
				ctx.globalAlpha = color1Alpha;
				ctx.arc(x, y, radius, Math.PI, (1 + valuePct) * Math.PI, false);
				ctx.strokeStyle = colorMap[color1Idx].color;
				ctx.stroke();

				// Apply second layer using Color2
				ctx.beginPath();
				ctx.globalAlpha = color2Alpha;
				ctx.arc(x, y, radius, Math.PI, (1 + valuePct) * Math.PI, false);
				ctx.strokeStyle = colorMap[color2Idx].color;
				ctx.stroke();
				ctx.globalAlpha = 1;

			} else {
				ctx.arc(x, y, radius, Math.PI, (1 + valuePct) * Math.PI, false);
				ctx.strokeStyle = '#FF0000';
				ctx.stroke();
			}
			ctx.closePath();

			// value text
			ctx.font = 'bold ' + radius * .3 + 'pt Arial'; // scale font by
			// radius
			ctx.textAlign = 'center';
			ctx.fillStyle = opts.valFontColor;
			ctx.fillText(val, x, y);

			// min and max text
			ctx.font = radius * .1 + 'pt Arial'; // scale font by radius
			ctx.fillStyle = opts.descFontColor;
			ctx.fillText(min, x - radius, canvas.height * .75);
			ctx.fillText(max, x + radius, canvas.height * .75);
			ctx.fillText(desc, x, canvas.height * .75);

			return this;
		}; // end of update method

		me.update(max);
		requestAnimFrame(me.animationLoop);
	}; // end closure for the class

	// Extend the jQuery object to allow users to call simpleGauge on a div
	$.fn.simpleGauge = function(options) {
		// Merge Given Options W/ Defaults, But Don't Alter Either
		var opts = $.extend({}, $.fn.simpleGauge.defaults, options);

		// Iterate over the current set of matched elements
		return this.each(function() {
			var gauge = $(this); // Get JQuery Version Of Element

			// creating a new SimpleGauge object and attach to the element's
			// data, if not already attached
			if (!gauge.data('simpleGauge')) {
				gauge.data('simpleGauge', new SimpleGauge(options, gauge));
			}

		}); // End Each JQ Element

	}; // End simpleGauge()

	// Global plugin defaults
	$.fn.simpleGauge.defaults = {
		min : 0,
		max : 100,
		val : 0,
		desc : "",
		gaugeBkColor : '#EDEBEB',
		valFontColor : '#000000',
		descFontColor : '#D9D9D9',
		continuousColor : true,
		gaugeFgColors : [ {
			color : "#ff0000",
			lo : 0,
			hi : 33
		}, {
			color : "#ffff00",
			lo : 34,
			hi : 66
		}, {
			color : "#00ff00",
			lo : 67,
			hi : 100
		} ],
		animate : true,
		animDuration : 1000
	};

})(jQuery);