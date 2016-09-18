// @requires events.js
// @requires events/dispatcher.js
// @requires events/event.js

Events.ApplicationEvents = {

	eventDispatcher: null,

	self: {

		getEventDispatcher: function getEventDispatcher() {
			if (!Events.ApplicationEvents.eventDispatcher) {
				Events.ApplicationEvents.eventDispatcher = new Events.Dispatcher();
			}

			return Events.ApplicationEvents.eventDispatcher;
		},

		checkEventDispatcher: function checkEventDispatcher() {
			if (!this.getEventDispatcher()) {
				throw new Error("No application event dispatcher was found. Please set Events.ApplicationEvents.eventDispatcher.");
			}

			return true;
		},

		publish: function publish(eventName, publisher, data) {
			this.checkEventDispatcher();
			return this.getEventDispatcher().publish(eventName, publisher, data);
		},

		subscribe: function subscribe(eventName, context, callback) {
			this.checkEventDispatcher();
			this.getEventDispatcher().subscribe(eventName, context, callback);
		},

		unsubscribe: function unsubscribe(eventName, context, callback) {
			this.checkEventDispatcher();
			this.getEventDispatcher().unsubscribe(eventName, context, callback);
		}

	},

	prototype: {

		eventDispatcher: null,

		_initApplicationEvents: function _initApplicationEvents() {
			if (!this.hasOwnProperty("eventDispatcher")) {
				this.eventDispatcher = this.constructor.getEventDispatcher();
			}
		},

		_destroyApplicationEvents: function _destroyApplicationEvents() {
			if (this.eventDispatcher) {
				this.eventDispatcher.unsubscribe(this);
			}
		},

		publish: function publish(eventName, data) {
			return this.eventDispatcher.publish(eventName, this, data);
		},

		subscribe: function subscribe(eventName, context, callback) {
			this.eventDispatcher.subscribe(eventName, context, callback);

			return this;
		},

		unsubscribe: function unsubscribe(eventName, context, callback) {
			this.eventDispatcher.unsubscribe(eventName, context, callback);

			return this;
		}

	}

};
