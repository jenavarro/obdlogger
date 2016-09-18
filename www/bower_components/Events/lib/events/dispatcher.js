// @requires events.js

Events.Dispatcher = function Dispatcher() {
	this._subscribers = {};
};

Events.Dispatcher.logger = window.console || null;

Events.Dispatcher.prototype = {

	_subscribers: null,

	constructor: Events.Dispatcher,

	destructor: function destructor() {
		if (!this._subscribers) {
			return;
		}

		var _subscribers = this._subscribers, subscriber, eventType, i, length;

		for (eventType in _subscribers) {
			if (_subscribers.hasOwnProperty(eventType)) {
				for (i = 0, length = _subscribers[eventType].length; i < length; i++) {
					subscriber = _subscribers[eventType][i];
					subscriber.callback = subscriber.context = null;
				}

				_subscribers[eventType] = null;
			}
		}

		subscriber = _subscribers = this._subscribers = null;
	},

	_dispatchEvent: function _dispatchEvent(event, _subscribers) {
		var subscriber;

		for (var i = 0, length = _subscribers.length; i < length; i++) {
			subscriber = _subscribers[i];

			if (subscriber.type === "function") {
				subscriber.callback.call(subscriber.context, event, event.publisher, event.data);
			}
			else if (subscriber.type === "string") {
				subscriber.context[ subscriber.callback ]( event, event.publisher, event.data );
			}

			if (event.cancelled) {
				break;
			}
		}

		_subscribers = subscriber = event = null;
	},

	publish: function publish(eventType, publisher, data) {
		if (!this._subscribers[eventType]) {
			return true;
		}

		var event = new Events.Event(eventType, publisher, data);
		var _subscribers = this._subscribers[eventType];
		var cancelled = false;

		this._dispatchEvent(event, _subscribers);
		cancelled = event.cancelled;
		event.destructor();

		event = publisher = data = _subscribers = null;

		return !cancelled;
	},

	subscribe: function subscribe(eventType, context, callback) {
		var contextType = typeof context;
		var callbackType = typeof callback;

		this._subscribers[eventType] = this._subscribers[eventType] || [];

		if (contextType === "function") {
			this._subscribers[eventType].push({
				context: null,
				callback: context,
				type: "function"
			});
		}
		else if (contextType === "object") {
			if (callbackType === "string" && typeof context[ callback ] !== "function") {
				throw new Error("Cannot subscribe to " + eventType + " because " + callback + " is not a function");
			}

			this._subscribers[eventType].push({
				context: context || null,
				callback: callback,
				type: callbackType
			});
		}
	},

	unsubscribe: function unsubscribe(eventType, context, callback) {
		if (this._subscribers[eventType]) {
			var contextType = typeof context;
			var callbackType = typeof callback;
			var _subscribers = this._subscribers[eventType];
			var i = _subscribers.length;
			var subscriber;

			if (contextType === "function") {
				callback = context;
				context = null;
				callbackType = "function";
			}
			else if (contextType === "object" && callbackType === "undefined") {
				callbackType = "any";
			}

			while (i--) {
				subscriber = _subscribers[i];

				if (
				    (callbackType === "any" && subscriber.context === context) ||
						(subscriber.type === callbackType && subscriber.context === context && subscriber.callback === callback)
				) {
					_subscribers.splice(i, 1);
				}
			}
		}

		context = callback = _subscribers = subscriber = null;
	},

	unsubscribeAll: function unsubscribeAll(context) {
		var type, i, _subscribers;

		for (type in this._subscribers) {
			if (this._subscribers.hasOwnProperty(type)) {
				_subscribers = this._subscribers[type];
				i = _subscribers.length;

				while (i--) {
					if (_subscribers[i].context === context) {
						_subscribers.splice(i, 1);
					}
				}
			}
		}

		context = _subscribers = null;
	}
};
