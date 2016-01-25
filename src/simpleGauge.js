/*!
 * simpleGauge.js
 * Version: 0.9.0
 *
 * Copyright 2014 Rajorshi Kar
 * Released under the Apache 2 license
 * https://github.com/darwyn00/simplegauge/blob/master/LICENSE
 */
(function(window) {
	'use strict';

	/**
	 * Extend object function
	 * 
	 * This extends an object by passing in additional variables and overwriting
	 * the defaults.
	 */
	function extend(a, b) {
		for ( var key in b) {
			if (b.hasOwnProperty(key)) {
				a[key] = b[key];
			}
		}
		return a;
	}

	/**
	 * SimpleGauge
	 * 
	 * @param {object}
	 *            options - The options object
	 */
	function SimpleGauge(options) {
		this.opts = extend({}, this.options);
		extend(this.opts, options);
		this._init();
	}

	/**
	 * SimpleGauge options Object
	 * 
	 * @param {HTMLElement}
	 *            container - The wrapper to append a canvas/gauge rendering to.
	 * 
	 */
	SimpleGauge.prototype.options = {
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
	}

	/**
	 * SimpleAlert _init
	 * 
	 * This is the initializer function. It builds the HTML and gets the alert
	 * ready for showing.
	 * 
	 * @type {HTMLElement} this.sa - The Simple Alert div
	 * @param {string}
	 *            strinner - The inner HTML for our alert
	 */
	SimpleGauge.prototype._init = function() {
		this.container = document.getElementById(this.opts.containerId);
		this.canvas = document.createElement('canvas');
		this.canvas.width = this.container.offsetWidth;
		this.canvas.height = this.container.offsetHeight;
		this.container.appendChild(this.canvas);
		this.ctx = this.canvas.getContext('2d');
		this.min = this.opts.min;
		this.max = this.opts.max;
		this.targetVal = this.opts.val;
		this.val = this.opts.val;
		this.currentAnimStartTime = null;

		// order the gauge foreground colors by their upper thresholds
		this.colorMap = this.opts.gaugeFgColors.sort(function(a, b) {
			return a.hi - b.hi;
		});
		this.render();
		
		// register to browser draw events
		requestAnimationFrame(animatedRenderHandler.bind(this));
		
		// register to window resize events
		window.addEventListener('resize', resizeHandler.bind(this), false);
	};
	
	var resizeHandler = function(){
		this.canvas.width = this.container.offsetWidth;
		this.canvas.height = this.container.offsetHeight;
		this.render();
	}

	// Public Method - Animates/draws/updates the gauge with a new value
	var animatedRenderHandler = function(time) {
		if (this.opts.animate) {
			if (!this.currentAnimStartTime)
				this.currentAnimStartTime = performance.now();

			// time difference since start of animation
			let
			newValue, elapsedTime = performance.now()
					- this.currentAnimStartTime;

			if (this.val < this.targetVal) {
				// we're increasing our value
				newValue = this.val
						+ ((this.targetVal - this.val) * elapsedTime / this.opts.animDuration);

				if (newValue > this.targetVal)
					newValue = this.targetVal;

				this.render(Math.floor(newValue));
			} else if (this.val > this.targetVal) {
				// we're decreasing our value
				newValue = this.val
						- ((this.val - this.targetVal) * elapsedTime / this.opts.animDuration);

				if (newValue < this.targetVal)
					newValue = this.targetVal;

				this.render(Math.floor(newValue));
			} else {
				// we're at the target value; so don't need to draw anything
			}
			requestAnimationFrame(animatedRenderHandler.bind(this));
		} else {
			this.render();
		}
	}
	
	/**
	 * SimpleGauge update
	 * 
	 * This sets the value of the gauge. If animation is disable then it renders
	 * immediately otherwise it will be render by the browser on its next
	 * rendering cycle (ideally once every 16.6ms).
	 */
	SimpleGauge.prototype.update = function(newVal) {
		 if (this.opts.animate) {
			// requestAnimationFrame will be called by the browser every
			// time the browser needs to repaint which can be up to 60 times
			// per second
			this.currentAnimStartTime = undefined;
			this.targetVal = Math.max(Math.min(newVal, this.max), this.min);
			// requestAnimationFrame call will do the rendering 
		 } else {
			this.targetVal = Math.max(Math.min(newVal, this.max), this.min);
			this.render(this.targetVal);
		 }
	}
	
	// Public Method - draws/updates the gauge with a new value
	SimpleGauge.prototype.render = function(value) {
		const val = this.val = (value !== undefined ? value : this.val);
		const canvas = this.canvas;
		const colorMap = this.colorMap;
		const opts = this.opts;
		const x = canvas.width / 2;
		const y = canvas.height * .65;
		const radius = canvas.width < canvas.height ? canvas.width * .35 : canvas.height * .4;
		const valuePct = (val - this.min) / (this.max - this.min);
		const ctx = this.ctx;
//		this.canvas.textContent = this.val;
		
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
		if (opts.continuousColor && val != this.min) {
			// primer layer (gray background color)
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
		ctx.fillText(this.min, x - radius, canvas.height * .75);
		ctx.fillText(this.max, x + radius, canvas.height * .75);
		ctx.fillText(opts.desc, x, canvas.height * .75);
	};

	
	// Add to global/window namespace
	window.SimpleGauge = SimpleGauge;

})(window);