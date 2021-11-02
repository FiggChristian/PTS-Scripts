const listeners = {};

// Trigger an event and call any listeners registered to this event.
module.exports.trigger = function(eventName, ...args) {
    if (!(eventName in listeners)) return;

    for (const callback of listeners[eventName]) {
        callback(...args);
    }
}

// Add a listener that gets called when an event with the same name gets triggered.
module.exports.addListener = function(eventName, callback) {
    module.exports.removeListener(eventName, callback);
    listeners[eventName] = listeners[eventName] || [];
    listeners[eventName].push(callback);
}

// Remove a listener that was previously added.
module.exports.removeListener = function(eventName, callback) {
    if (!(eventName in listeners)) return;
    const index = listeners[eventName].indexOf(callback);
    if (~index) {
        listeners[eventName].splice(index, 1);
    }
}