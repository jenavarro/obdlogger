## JavaScript Inheritance Made Easy

Inherit.js assists in classical style inheritance for JavaScript. It requires no
outside dependencies and works with any JavaScript library or framework.
Furthermore, it plays well with existing code.

Prototype/Scriptaculous users, see the section titled "Notes about
Prototype/Scriptaculous Compatibility" at the bottom.

## Features

- Supports true Prototypal inheritance, so the `instanceof` operator works
- Sets the `constructor` property to reference the Constructor Function
- Inherits instance level methods and properties via the prototype
- Inherits class level methods and properties via direct copy
- Allows for multiple inheritance (more on that later)
- Augments the Function object's prototype so all JavaScript "classes",
  regardless of how there were written, can be inheritable with this library

## Usage

### Create a basic class

Every class in JavaScript naturally inherits from Object, so naturally, we
extend Object when creating a new class:

    var Dog = Object.extend();

Let's add an instance method:

    var Dog = Object.extend({
        prototype: {
            bark: function(text) {
                alert("The dog says: " + text);
            }
        }
    });

    var instance = new Dog();

    instance.bark("Woof!");

Now let's add a class level method:

    var Dog = Object.extend({
        self: {
            bark: function(text) {
                new Dog().bark(text);
            }
        },
        prototype: {
            bark: function(text) {
                alert("The dog says: " + text);
            }
        }
    });

    Dog.bark("Bow-wow!");

### Basic inheritance

It seems that dogs share lots of attributes with other animals. Now we need
inheritance.

    var Animal = Object.extend({
        self: {
            speak: function(text) {
                new this().speak(text);
            }
        },
        prototype: {
            type: "animal",
    
            speak: function(text) {
                alert("The " + this.type + " says: " + text);
            }
        }
    });

    var Dog = Animal.extend({
        prototype: {
            type: "dog"
        }
    });

    var dog = new Dog();

    dog instanceof Dog      // true
    dog instanceof Animal   // true
    dog instanceof Object   // true
    dog.constructor === Dog // true

So what methods do we have?

    Animal.speak("Boo!"); // alerts "The animal says: Boo!"
    Dog.speak("Yipe!");   // alerts "The dog says: Yipe!"

    var animal = new Animal();
    var dog = new Dog();

    animal.speak("bzzz"); // alerts "The animal says: bzzz"
    dog.speak("woof");    // alerts "The dog says: woof";

### The class constructor

A function called `initialize` is used as the class constuctor:

    var Point = Object.extend({
        prototype: {
            x: 0,
    
            y: 0,
    
            initialize: function(x, y) {
                this.x = x;
                this.y = y;
            }
        }
    });

    var point = new Point(10, 11); // point.x is 10, point.y is 11

Child classes can override methods on the parent class. You can call the
overridden method:

    var Point3D = Point.extend({
        prototype: {
            z: 0,
    
            initialize: function(x, y, z) {
                // Call "initialize" on the parent class
                Point.prototype.initialize.call(this, x, y);
      
                this.z = z;
            }
        }
    });

### Overriding methods on the parent class

Child classes can override any method on the parent class. Calling the method on
the parent class is a very manual process:

    var Parent = Object.extend({
        prototype: {
            foo: function() {
                return "foo";
            }
        }
    });

    var Child = Parent.extend({
        prototype: {
            foo: function() {
                var text = Parent.prototype.foo.call(this);
                return text + " bar";
            }
        }
    });

    var parent = new Parent();
    var child = new Child();

    parent.foo() // returns "foo"
    child.foo()  // returns "foo bar"

### Multiple inheritance

True multiple inheritance is not supported. It's basically an easy way to mix in
a bunch of instance and class level methods at once.

Multiple inheritance:

- Includes class level methods
- Includes instance level methods
- Does not overwrite instance methods
- Does not overwrite class methods

Utilizing multiple inheritance involves two steps:

1. Defining an object literal, called a "Mixin"
2. Including the Mixin in one of two ways:
  1. In a class definition
  2. By calling the `include` method of a class

#### Defining your Mixin

Mixins are just Plain Old JavaScript objects containing a certain structure,
which mirrors the structure of defining a class, with the addition of an
optional `included` function, which gets executed when this mixin is included in
another class.

    var MyMixin = {
        included: function(Klass) {
            // "Klass" is the class that just included this mixin.
        },

        self: {
            // class level methods go here
        },
  
        prototype: {
            // instance level methods go here
        }
    };

The `self` and `prototype` properties are optional.

The `included` function is optional as well. When called, the `this` variable
inside the function body references the mixin. This function gets passes a
reference to the class that just included the mixin:

    var Point = Object.extend({
        prototype: {
            x: 0,
    
            y: 0,
    
            initialize: function(x, y) {
                this.x = x;
                this.y = y;
            }
        }
    });

    var Mixin = {
        included: function(Klass) {
            this === Mixin // true
            Klass === Point // true
            Klass.foo === Point.foo // true
            Klass.prototype.foo === Mixin.prototype.foo // true
            Klass.prototype.initialize = Point.prototype.initialize // true
            new Klass() instanceof Point // true
        },

        self: {
            foo: function() {}
        },
        
        prototype: {
            bar: function() {}
        }
    };

    Point.include(Mixin); // triggers the Mixin.included function

#### Including a Mixin inside a class definition

Include a single Mixin:

    var MyClass = Object.extend({
        includes: MyMixin
    });

Include multiple Mixins:

    var MyClass = Object.extend({
        includes: [
            Mixin1,
            Mixin2
        ]
    });

#### Include a Mixin outside of a class definition

You can force a class to include a Mixin after the class has been defined.

    MyClass.include(MyMixin); 

#### Including Mixins inside a Mixin

You can declare a Mixin that includes other Mixins:

    var CompositeMixin = {
        includes: [
            Mixin1,
            Mixin2
        ]
    };

## Class and Mixin definition structure

The structures of class and mixin definitions are the same, and allow you to:

- Declare instance methods
- Declare class methods
- Include one or more Mixins

An example class definition with everything:

    var MyClass = Object.extend({
        includes: [
            Mixin1,
            Mixin2
        ],
        self: {
            // class or "static" methods
        },
        prototype: {
            // instance methods
        }
    });

An example Mixin definition with everything:

    var Mixin = {
        included: function(Klass) {
            // Klass is a class that just included this mixin
        },
        includes: [
            Mixin1,
            Mixin2
        ],
        self: {
            // class or "static" methods
        },
        prototype: {
            // instance methods
        }
    };

## Using Inherit.js with existing code

You can use this library even if you've created your own classes:

    function Point(x, y) {
        this.x = x;
        this.y = y;
    }

    Point.prototype.isAbove = function(point) {
        return this.y > point.y;
    };

    var Point3D = Point.extend({
        prototype: {
          z: 0,
  
          initialize: function(x, y, z) {
              // Call the parent class constructor:
              Point.call(this, x, y);
    
              this.z = z;
          }
        }
    });

## Notes about Prototype/Scriptaculous Compatibility

For those using the Prototype JavaScript library, there are a couple of caveats:

### Compatibility with Object.extend()

The Prototype library defines a function called `Object.extend`. For the sake of
compatibility, use `Object._extend(...)` when inheriting from Object. For any
other class, use `ClassName.extend(...)` (no underscore).

### Compatibility with Class.create()

Unfortunately at this time, you cannot use Prototype's `Class.create` to sub
class a class created using Anything.extend(), just like you cannot use
`Class.create` to sub class a regular JavaScript class not created by
`Class.create`.