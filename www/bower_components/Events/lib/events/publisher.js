// @requires events.js
// @requires events/dispatcher.js
// @requires events/event.js

Events.Publisher = {

	prototype: {

		dispatcher: null,

		_initEventPublishing: function _initEventPublishing() {
			if (!this.hasOwnProperty("dispatcher")) {
				this.dispatcher = new Events.Dispatcher();
			}
		},

		_destroyEventPublishing: function _destroyEventPublishing() {
			if (this.dispatcher) {
				this.dispatcher.unsubscribeAll(this);
			}

			this.dispatcher = null;
		},

		publish: function publish(type, data) {
			this.dispatcher.publish(type, this, data);
		},

		subscribe: function subscribe(type, instance, method) {
			this.dispatcher.subscribe(type, instance, method);
		},

		unsubscribe: function unsubscribe(type, instance) {
			this.dispatcher.unsubscribe(type, instance);
		}

	}

};
