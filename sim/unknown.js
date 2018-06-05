/**
 * A generic unknown object, such as an unknown move or an unknown EV stat.
 */
'use strict';

const UNKNOWN_ITEM = 0;

class Unknown {
    /**
     * @param {Object} obj
     * @param {string} type
     */
    constructor(obj, type) {
        this.obj = obj;
        this.type = type;
    }

    resolve() {}
}

module.exports = {
    'Unknown': Unknown,
    'UNKNOWN_ITEM': UNKNOWN_ITEM
};
