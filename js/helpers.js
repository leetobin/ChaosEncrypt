String.prototype.isEmpty = function () {
	"use strict";
	return (this.length === 0 || !this.trim());
};

String.prototype.endsWith = function (suffix) {
	"use strict";
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

Array.prototype.min = function () {
	"use strict";
	return Math.min.apply(null, this);
};