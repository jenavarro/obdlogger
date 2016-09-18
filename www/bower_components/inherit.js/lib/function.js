(function() {

	var _isMSIE = (/msie/i).test(navigator.userAgent);

	function include(mixin) {
		var key;

		// include class level methods
		if (mixin.self) {
			for (key in mixin.self) {
				if (mixin.self.hasOwnProperty(key) && !this[key]) {
					this[key] = mixin.self[key];
				}
			}
		}

		// include instance level methods
		if (mixin.prototype) {
			for (key in mixin.prototype) {
				if (mixin.prototype.hasOwnProperty(key) && !this.prototype[key]) {
					this.prototype[key] = mixin.prototype[key];
				}
			}
		}

		// include other mixins
		if (mixin.includes) {
			mixin.includes = (mixin.includes instanceof Array) ? mixin.includes : [mixin.includes];

			for (var i = 0, length = mixin.includes.length; i < length; i++) {
				this.include(mixin.includes[i]);
			}
		}

		if (mixin.included) {
			mixin.included(this);
		}

		mixin = null;
	}

	function extend(descriptor) {
		descriptor = descriptor || {};
		var key, i, length;

		// Constructor function for our new class
		var Klass;

		if (_isMSIE) {
			Klass = function() {
				// MSIE does not set the __proto__ property automatically, so we must do it at runtime
				//if (!this.hasOwnProperty("__proto__")) {
					this.__proto__ = Klass.prototype;
				//}

				if (!Klass.__inheriting) {
					this.initialize.apply(this, arguments);
				}
			};
		}
		else {
			// All other browsers play nice.
			Klass = function() {
				if (!Klass.__inheriting) {
					this.initialize.apply(this, arguments);
				}
			};
		}

		// Flag to prevent calling Klass#initialize when setting up the inheritance chain.
		Klass.__inheriting = false;

		// "inherit" class level methods
		for (key in this) {
			if (this.hasOwnProperty(key)) {
				Klass[key] = this[key];
			}
		}

		// new class level methods
		if (descriptor.self) {
			for (key in descriptor.self) {
				if (descriptor.self.hasOwnProperty(key)) {
					Klass[key] = descriptor.self[key];
				}
			}
		}

		// Set up true prototypal inheritance for ECMAScript compatible browsers
		try {
			this.__inheriting = true;     // Set the flag indicating we are inheriting from the parent class
			Klass.prototype = new this(); // The "new" operator generates a new prototype object, setting the __proto__ property all browsers except MSIE
			this.__inheriting = false;    // Unset the inheriting flag
		}
		catch (error) {
			this.__inheriting = false;    // Oops! Something catestrophic went wrong during inheriting. Unset the inheritance flag
			throw error;                  // Throw the error. Let the developer fix this.
		}

		// new instance level methods
		if (_isMSIE) {
			// MSIE does not set the __proto__ property so we forefully set it here.
			Klass.prototype.__proto__ = this.prototype;
		}

		// new instance level methods
		if (descriptor.prototype) {
			for (key in descriptor.prototype) {
				if (descriptor.prototype.hasOwnProperty(key)) {
					Klass.prototype[key] = descriptor.prototype[key];
				}
			}
		}

		// apply mixins
		if (descriptor.includes) {
			// force includes to be an array
			descriptor.includes = (descriptor.includes instanceof Array) ? descriptor.includes : [descriptor.includes];

			for (i = 0, length = descriptor.includes.length; i < length; i++) {
				Klass.include(descriptor.includes[i]);
			}
		}

		// ensure new prototype has an initialize method
		Klass.prototype.initialize = Klass.prototype.initialize || function() {};

		// set reference to constructor function in new prototype
		Klass.prototype.constructor = Klass;

		descriptor = null;

		return Klass;
	}

	// Make "include" available to the World
	if (!Function.prototype.include) {
		Function.prototype.include = include;
	}

	// Make "extend" available to the World
	if (!Function.prototype.extend) {
		if (Object.extend) {
			// Some JavaScript libraries already have an "extend" function
			Object._extend = extend;
		}

		Function.prototype.extend = extend;
	}

})();

