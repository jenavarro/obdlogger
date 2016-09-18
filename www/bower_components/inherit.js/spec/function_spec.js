describe("Function", function() {
	describe("include", function() {
		it("includes a mixin with instance level methods", function() {
			var Mixin = {
				prototype: {
					foo: function() {
						return "foo";
					}
				}
			};
			var Klass = function() {};
			Klass.include(Mixin);
			var instance = new Klass();

			expect(Klass.prototype.hasOwnProperty("foo")).toBeTrue();
			expect(instance.foo).toBeFunction();
			expect(instance.foo()).toEqual("foo");
		});

		it("includes a mixin with class level methods", function() {
			var Mixin = {
				self: {
					bar: function() {
						return "bar";
					}
				}
			};
			var Klass = function() {};
			Klass.include(Mixin);

			expect(Klass.hasOwnProperty("bar")).toBeTrue();
			expect(Klass.bar()).toEqual("bar");
		});

		it("includes a mixin with both instance and class level methods", function() {
			var Mixin = {
				self: {
					bar: function() {
						return "bar";
					}
				},
				prototype: {
					foo: function() {
						return "foo";
					}
				}
			};
			var Klass = function() {};
			Klass.include(Mixin);
			var instance = new Klass();

			expect(Klass.hasOwnProperty("bar")).toBeTrue();
			expect(Klass.bar()).toEqual("bar");
			expect(Klass.prototype.hasOwnProperty("foo")).toBeTrue();
			expect(instance.foo).toBeFunction();
			expect(instance.foo()).toEqual("foo");
		});

		it("does not override instance level methods", function() {
			var Mixin = {
				prototype: {
					foo: function() {
						return "incorrect";
					}
				}
			};
			var Klass = function() {};
			Klass.prototype.foo = function() {
				return "foo";
			};
			Klass.include(Mixin);
			var instance = new Klass();

			expect(instance.foo).toEqual(Klass.prototype.foo);
			expect(instance.foo()).toEqual("foo");
		});

		it("does not override class level methods", function() {
			var Mixin = {
				self: {
					bar: function() {
						return "incorrect";
					}
				}
			};
			var Klass = function() {};
			Klass.bar = function() {
				return "bar";
			};
			Klass.include(Mixin);

			expect(Klass.bar).toNotEqual(Mixin.self.bar);
			expect(Klass.bar()).toEqual("bar");
		});
	});

	describe("extend", function() {
		it("does not require parameters", function() {
			var Klass = Object.extend();
			var instance = new Klass();
			expect(Klass).toBeFunction();
			expect(instance).toBeInstanceof(Klass);
			expect(instance).toBeInstanceof(Object);
		});

		it("defines initialize() if omitted", function() {
			var Klass = Object.extend();
			var instance = new Klass();
			expect(instance.initialize).toBeFunction();
		});

		it("sets the constructor to reference the class", function() {
			var Klass = Object.extend();
			var instance = new Klass();
			expect(Klass.prototype.constructor).toStrictlyEqual(Klass);
			expect(instance.constructor).toStrictlyEqual(Klass);
		});

		it("defines class level methods", function() {
			var Klass = Object.extend({
				self: {
					foo: function() {
						return "foo";
					}
				}
			});
			expect(Klass.hasOwnProperty("foo")).toBeTrue();
			expect(Klass.foo).toBeFunction();
			expect(Klass.foo()).toEqual("foo");
		});

		it("defines instance level methods", function () {
			var Klass = Object.extend({
				prototype: {
					foo: function() {
						return "foo";
					}
				}
			});
			var instance = new Klass();
			expect(Klass.prototype.hasOwnProperty("foo")).toBeTrue();
			expect(instance.foo).toEqual(Klass.prototype.foo);
			expect(instance.foo()).toEqual("foo");
		});

		it("defines instance and class level methods", function() {
			var Klass = Object.extend({
				self: {
					foo: function() {
						return "foo";
					}
				},
				prototype: {
					bar: function() {
						return "bar";
					}
				}
			});
			var instance = new Klass();
			expect(Klass.foo).toBeFunction();
			expect(Klass.foo()).toEqual("foo");
			expect(Klass.prototype.hasOwnProperty("bar")).toBeTrue();
			expect(Klass.prototype.bar).toBeFunction();
			expect(instance.bar).toEqual(Klass.prototype.bar);
			expect(instance.bar()).toEqual("bar");
		});

		it("includes a single mixin", function() {
			var Mixin = {
				self: {
					foo: function() {
						return "foo";
					}
				},
				prototype: {
					bar: function() {
						return "bar";
					}
				}
			};
			var Klass = Object.extend({
				includes: Mixin
			});
			var instance = new Klass();
			expect(Klass.foo).toBeFunction();
			expect(instance.bar).toBeFunction();
		});

		it("includes multiple mixins", function() {
			var Mixin1 = {
				self: {
					foo: function() {
						return "foo";
					}
				},
				prototype: {
					bar: function() {
						return "bar";
					}
				}
			};
			var Mixin2 = {
				prototype: {
					foobar: function() {
						return "foobar";
					}
				}
			};
			var Klass = Object.extend({
				includes: [Mixin1, Mixin2]
			});
			var instance = new Klass();
			expect(Klass.foo).toBeFunction();
			expect(instance.bar).toBeFunction();
			expect(instance.foobar).toBeFunction();
		});

		it("inherits from Object", function() {
			var Klass = Object.extend();
			var instance = new Klass();

			// Internet Explorer does not set the __proto__ property for the "prototype"
			// object of object constructors.
			if (Klass.prototype.hasOwnProperty("__proto__")) {
				expect(Klass.prototype.__proto__).toStrictlyEqual(Object.prototype);
			}

			expect(instance).toBeInstanceof(Klass);
			expect(instance).toBeInstanceof(Object);
			expect(instance.__proto__).toStrictlyEqual(Klass.prototype);
		});

		it("inherits from the parent class", function() {
			var ParentKlass = Object.extend();
			var ChildKlass = ParentKlass.extend();
			var instance = new ChildKlass();
			expect(ChildKlass.prototype.__proto__).toStrictlyEqual(ParentKlass.prototype);
			expect(instance).toBeInstanceof(ChildKlass);
			expect(instance).toBeInstanceof(ParentKlass);
			expect(instance).toBeInstanceof(Object);
		});

		it("inherits instance level methods", function() {
			var ParentKlass = Object.extend({
				prototype: {
					foo: function() {
						return "foo";
					}
				}
			});
			var ChildKlass = ParentKlass.extend();
			expect(ChildKlass.prototype.hasOwnProperty("foo")).toBeFalse();
			expect(ChildKlass.prototype.foo).toEqual(ParentKlass.prototype.foo);
		});

		it("inherits class level methods", function() {
			var ParentKlass = Object.extend({
				self: {
					foo: function() {
						return "foo";
					}
				}
			});
			var ChildKlass = ParentKlass.extend();
			expect(ChildKlass.hasOwnProperty("foo")).toBeTrue();
			expect(ChildKlass.foo).toEqual(ParentKlass.foo);
		});

		it("does not allow mixins to override class and instance methods", function() {
			var Mixin = {
				self: {
					foo: function() {
						return "incorrect";
					}
				},
				prototype: {
					bar: function() {
						return "incorrect";
					}
				}
			};
			var Klass = Object.extend({
				includes: Mixin,
				self: {
					foo: function() {
						return "foo";
					}
				},
				prototype: {
					bar: function() {
						return "bar";
					}
				}
			});
			var instance = new Klass();
			expect(Klass.foo).toNotEqual(Mixin.self.foo);
			expect(Klass.foo()).toEqual("foo");
			expect(instance.bar).toNotEqual(Mixin.prototype.bar);
			expect(instance.bar()).toEqual("bar");
		});
	});
});
