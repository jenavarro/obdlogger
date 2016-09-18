// @requires events.js
// @requires events/dispatcher.js
// @requires events/event.js
// @requires events/application_events.js

Events.Notifications = {

	includes: Events.ApplicationEvents,

	guid: 0,

	self: {

		addNotifications: function addNotifications(newNotifications) {
			var name, notifications = this.prototype.notifications || {};

			for (name in newNotifications) {
				if (newNotifications.hasOwnProperty(name)) {
					if (notifications[name]) {
						notifications[name] = (notifications[name] instanceof Array) ? notifications[name] : [ notifications[name] ];
					}
					else {
						notifications[name] = [];
					}

					notifications[name].push( newNotifications[name] );
				}
			}

			this.prototype.notifications = notifications;
			notifications = newNotifications = null;
		}

	},

	prototype: {

		_notificationDispatcher: null,

		_notificationId: null,

		_notificationIdPrefix: "notifications",

		notifications: null,

		_initNotifications: function _initNotifications() {
			if (!this.__proto__.hasOwnProperty("_compiledNotifications")) {
				this._compileNotifications();
			}

			this._initApplicationEvents();

			this._notificationId = Events.Notifications.guid++;

			var name, i, length, notifications;

			for (name in this._compiledNotifications) {
				if (this._compiledNotifications.hasOwnProperty(name)) {
					notifications = this._compiledNotifications[name];

					for (i = 0, length = notifications.length; i < length; i++) {
						this.listen( name, this, notifications[i] );
					}
				}
			}

			this._setUpNotifications();
		},

		_compileNotifications: function _compileNotifications() {
			var _compiledNotifications = {}, name, i, length, notifications, proto = this.__proto__;

			while (proto) {
				if (proto.hasOwnProperty("notifications") && proto.notifications) {
					notifications = proto.notifications;

					for (name in notifications) {
						if (notifications.hasOwnProperty(name)) {
							_compiledNotifications[name] = _compiledNotifications[name] || [];
							notifications[name] = notifications[name] instanceof Array ? notifications[name] : [ notifications[name] ];

							// To keep notifications executing in the order they were defined in the classes,
							// we loop backwards and place the new notifications at the top of the array.
							i = notifications[name].length;
							while (i--) {
								_compiledNotifications[name].unshift( notifications[name][i] );
							}
						}
					}
				}

				proto = proto.__proto__;
			}

			this.__proto__._compiledNotifications = _compiledNotifications;

			proto = notifications = _compiledNotifications = null;
		},

		_destroyNotifications: function _destroyNotifications() {
			if (this._notificationDispatcher) {
				this._notificationDispatcher.destructor();
				this._notificationDispatcher = null;
			}
		},

		_setUpNotifications: function _setUpNotifications() {
			// Child classes may override this to do something special with adding notifications.
		},

		notify: function notify(message, data) {
			var success = this.publish(this._notificationIdPrefix + "." + this._notificationId + "." + message, data);
			data = null;
			return success;
		},

		listen: function listen(message, context, notification) {
			this.subscribe(this._notificationIdPrefix + "." + this._notificationId + "." + message, context, notification);
			context = notification = null;

			return this;
		},

		ignore: function ignore(message, context, notification) {
			this.unsubscribe(this._notificationIdPrefix + "." + this._notificationId + "." + message, context, notification);
			context = notification = null;

			return this;
		}

	}

};
