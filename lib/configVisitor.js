'use strict';

var _ = require('lodash');

var DEFAULT_EXCLUDE_FIELDS = ['filename'];

/**
 * Default config transform which just returns original `options`
 * @param {Config} config
 * @private
 * @returns {Config}
 */
function defaultTransform(config) {
    return config;
}

/**
 * @class
 * @alias ConfigVisitor
 * @constructor
 * @param {ConfigLoader} loader
 * @param {ConfigPathResolver} pathResolver
 * @param {String[]} [excludeFields=['filename']]
 */
function ConfigVisitor(loader, pathResolver, excludeFields) {
    this.loader = loader;
    this.pathResolver = pathResolver;
    this.excludeFields = _.union(DEFAULT_EXCLUDE_FIELDS, excludeFields);
}

/**
 * Converts `arguments` to `Object<String,Function>` transforms
 * @private
 * @param {...ExtendOptions} arguments
 * @returns {Object<String,Function>}
 */
ConfigVisitor.prototype.toTransforms = function() {
    var args = _.flatten(_.toArray(arguments), true);

    var transforms = _.reduce(args, function(acc, value) {
        if (_.isString(value)) {
            acc[value] = defaultTransform;
        } else if (_.isObject(value)) {
            value = _.pick(value, function(x) {
                return _.isFunction(x) || x === true;
            });

            _.forEach(value, function (x, y) {
                acc[y] = x === true ? defaultTransform : x;
            });
        }

        return acc;
    }, {});

    return _.chain(transforms).mapKeys(function(value, key) {
        return this.pathResolver.resolve(key);
    }, this).value();
};

/**
 * Returns `visited` configs
 * @param {...ExtendOptions} arguments
 * @returns {Object<String,Config>}
 */
ConfigVisitor.prototype.visit = function() {
    var visited = {},
        transforms = this.toTransforms(arguments);

    _.forEach(transforms, function(value, key) {
        if (!_.has(visited, key)) {
            var currentConfig = this.loader.load(key);

            if (_.isFunction(value)) {
                currentConfig = value(currentConfig);
            }

            if (!_.isObject(currentConfig)) {
                currentConfig = {};
            }

            _.forEach(this.excludeFields, function(name) {
                delete currentConfig[name];
            });

            visited[key] = currentConfig;
        }
    }, this);

    return visited;
};

/**
 * @module webpack-config/lib/configVisitor
 * @returns {ConfigVisitor}
 */
module.exports = ConfigVisitor;