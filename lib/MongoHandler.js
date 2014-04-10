var mongoose = require('mongoose'),
	errorLogger	= require("edm-errorlogger"),
	logModel	= require("../models/log"),

	async		= require("async");

module.exports = function MongoHandler(modelToWorkOn, returnModeToSendBack) {
	if(!modelToWorkOn) {
		throw('MongoHandler needs parameter Model!');
	}
	var model = modelToWorkOn,
		returnMode = (returnModeToSendBack) ? returnModeToSendBack : "JSON";

	/*
	 * @param req {object} containing the req Object. Used for error logging. Obligated.
	 * @param res {object} containing the res Object. Used for error logging. Obligated.
	 * @param optionsParam {object} Object containing further params. Obligated.
	 *		find {object} mongoose conditions //example: { name: 'john', age: { $gte: 18 }}
	 *		skip {Number} the point from start listing
	 *		sort {Number} sorting options
	 *		limit {Number} the length to list
	 *		select {array} contains strings. Option for filter fields to receive in the result.
	 * @param logMessage {string} Optional.
	 * @param callback {function || 'json' || jsonp} Optional.
	 **/
	function find(req, res, optionsParam, logMessage, callback) {
		if(!req || !res) {
			throw('MongoHandler.find needs proper parameters: req, res. ');
		}
		
		var options = null,
			returnObject = {},
			execObject = null,
			countObject = null,
			totalCount = null;
			
		if(!optionsParam) {
			options = {find: {}};
		} else {
			options = optionsParam;
			if(!optionsParam.find) {
				options.find = {};
			}
		}
		
		execObject = model.find(options.find);
		
		if(options.sort) {
			execObject = execObject.sort(options.sort);
		}
		
		if(options.select instanceof Array || typeof options.select === 'string') {
			execObject = execObject.select(options.select);
		}
		
		if(options.populate) {
			execObject = execObject.populate(options.populate);
		}

		
		if(!isNaN(options.skip) || !isNaN(options.limit)) {
			countObject = model.find(options.find).count();
			countObject.exec(onCounted);
		} else {
			execObject.exec(onFind);
		}
		
		
		function onCounted(err, count) {
			if(err) {
				returnObject.err = err;
				onFinished(returnObject, callback, req, res, logMessage);
			} else {
				totalCount = count;
				if(!isNaN(options.limit)) {
					execObject = execObject.limit(options.limit);
				}
				if(!isNaN(options.skip)) {
					execObject = execObject.skip(options.skip);
				}
				execObject.exec(onFind);
			}
		}
		
		function onFind(err, result) {
			if(err) {
				returnObject.err = err;
			} else {
				returnObject.result = result;
				if(!isNaN(options.skip) || !isNaN(options.limit)){
					returnObject.result = {result: result, totalCount: totalCount};
				} else {
					returnObject.result = result;
				}
			}
			onFinished(returnObject, callback, req, res, logMessage);
		}
	}

	/*
	 * @param req {object} containing the req Object. Used for error logging. Obligated.
	 * @param res {object} containing the res Object. Used for error logging. Obligated.
	 * @param find {object} find object. Obligated.
	 * @param select {array} select object. Optional.
	 * @param callback {function || 'json' || jsonp} Optional.
	 * @param logMessage {string} Optional.
	 */
	function findOne(req, res, find, select, callback, logMessage) {
		if(!req || !res || !find) {
			throw('MongoHandler.findOne needs proper parameters: req, res, find. ');
		}
		
		var returnObject = {
			result: {}
		},
			execObject = null;
		
		execObject = model.findOne(find);
		
		if(select instanceof Array) {
			var length = select.length;
			var selectString = "";
			for(var i = 0; i < length; i++) {
				if(typeof select[i] === "string") {
					selectString += select[i];
					if(i+1 < length) {
						selectString += " ";
					}
				}
			}
			execObject = execObject.select(selectString);
		}
		
		execObject.exec(onFound);
		
		function onFound(err, result) {
			if(err) {
				returnObject.err = err;
			} else {
				returnObject.result = result;
				if(!result) {
					returnObject.err = 'Not found';
				}
			}
			onFinished(returnObject, callback, req, res, logMessage);
		}
	}

	/*
	 * @param req {object} containing the req Object. Used for error logging. Obligated.
	 * @param res {object} containing the res Object. Used for error logging. Obligated.
	 * @param find {object} find object Obligated.
	 * @param callback {function || 'json' || jsonp} Optional.
	 * @param logMessage {string} Optional.
	 */
	function count(req, res, find, callback, logMessage) {
		if(!req || !res || !find) {
			throw('MongoHandler.count needs proper parameters: req, res, find. ');
		}
		var returnObject = {};
		model.find(find).count(onFound);
		
		function onFound(err, result) {
			if(err) {
				returnObject.err = err;
			} else {
				returnObject.result = result;
			}
			onFinished(returnObject, callback, req, res, logMessage);
		}
	}

	/*
	 * @param req {object} containing the req Object. Used for error logging. Obligated.
	 * @param res {object} containing the res Object. Used for error logging. Obligated.
	 * @param find {object} find object Obligated.
	 * @param callback {function || 'json' || jsonp} Optional.
	 * @param logMessage {string} Optional.
	 */
	function remove(req, res, find, callback, logMessage) {
		if(!req || !res || !find) {
			throw('MongoHandler.remove needs proper parameters: req, res, find. ');
		}
		var returnObject = {
			result: {}
		};
		var execObject = model.find(find).remove();
		
		execObject.exec(onExecuted);
		
		function onExecuted(err, result) {
			if(err) {
				returnObject.err = err;
			} else {
				returnObject.result = result;
				if(!result) {
					returnObject.err = 'Not found';
				}
			}
			
			onFinished(returnObject, callback, req, res, logMessage);
		}
	}
	
	/*
	 * @param req {object} containing the req Object. Used for error logging. Obligated.
	 * @param res {object} containing the res Object. Used for error logging. Obligated.
	 * @param find {object} find object. Obligated.
	 * @param callback {function || 'json' || jsonp} Optional.
	 * @param logMessage {string} Optional.
	 */
	function removeOne(req, res, find, callback, logMessage) {
		if(!req || !res || !find) {
			throw('MongoHandler.removeById needs proper parameters: req, res, find.');
		}
		
		var returnObject = {
			result: {}
		};
		var execObject = model.findOne(find).remove();
		
		execObject.exec(onExecuted);
		
		function onExecuted(err, result) {
			if(err) {
				returnObject.err = err;
			} else {
				returnObject.result = result;
				if(!result) {
					returnObject.err = 'Not found';
				}
			}
			
			onFinished(returnObject, callback, req, res, logMessage);
		}
	}
		
	/*
	 * @param req {object} containing the req Object. Used for error logging. Obligated.
	 * @param res {object} containing the res Object. Used for error logging. Obligated.
	 * @param item {object} the object that should be created. Should fit to the schema. Obligated.
	 * @param callback {function || 'json' || jsonp} Optional.
	 * @param logMessage {string} Optional.
	 */
	function create(req, res, item, callback, logMessage) {
		if(!req || !res || !item) {
			throw('MongoHandler.create needs proper parameters: req, res, item.');
		}
		var returnObject = {
			result: {}
		};
		var newItem = new model(item);
		
		newItem.save(onSaved);
		
		function onSaved(err, result) {
			if(err) {
				returnObject.err = err;
			} else {
				returnObject.result._id = result._id;
			}
			onFinished(returnObject, callback, req, res, logMessage);
		}
	}
	
	/*
	 * @param req {object} containing the req Object. Used for error logging. Obligated.
	 * @param res {object} containing the res Object. Used for error logging. Obligated.
	 * @param items {array} the objects that should be created. Should fit to the schema. Obligated.
	 * @param callback {function || 'json' || 'jsonp'} Optional.
	 * @param logMessage {string} Optional.
	 */
	function createMore(req, res, items, callback, logMessage) {
		if(!req || !res || !(items instanceof Array)) {
			throw('MongoHandler.createMore needs proper parameters: req, res, items.');
		}

		var returnObject = {
			result: {
				failed: [],
				alreadyHave: [],
				created: []
			}
		};

		async.forEach(items,
					function(item, callback) {
						var newItem = new model(item);
						newItem.save(function(err, result) {
							if(err) {
								if(err.code === 11000) {
									returnObject.result.alreadyHave.push(item);
									//mongodb upsert!!!!!!
								} else {
									returnObject.result.failed.push(item);
								}
							} else {
								returnObject.result.created.push(result);
							}
							callback();
						});
					}, function(err) {
						if(err) {
							returnObject.err = err;
						}
						onFinished(returnObject, callback, req, res, logMessage);
					});
	}
	
	/*
	 * @param req {object} containing the req Object. Used for error logging. Obligated.
	 * @param res {object} containing the res Object. Used for error logging. Obligated.
	 * @param find {object} find object. Obligated.
	 * @param updateObject {string} the objects that should be update. Should fit to the schema. Obligated.
	 * @param callback {function || 'json' || jsonp} Optional.
	 * @param logMessage {string} Optional.
	 */
	function updateOne(req, res, find, updateObject, callback, logMessage) {
		if(!req || !res || !find || !updateObject) {
			throw('MongoHandler.updateById needs proper parameters: req, res, updateObject, find.');
		}
		
		var returnObject = {
			result: {}
		};
		
		model.findOne(find, onItemFound);
		
		function onItemFound(err, item) {
			if(err) {
				returnObject.err = err;
				onFinished(returnObject, callback, req, res, logMessage);
			} else if(item){
				if(typeof updateObject === "function") {
					item = updateObject(item);
					if(item.err) {
						returnObject.err = item.err;
						onFinished(returnObject, callback, req, res, logMessage);
						return;
					}
				} else {
					for(var i in updateObject) {
						if(updateObject.hasOwnProperty(i)) {
							item[i] = updateObject[i];
						}
					}
				}
				item.save(onItemSaved);
			} else {
				returnObject.err = "Not Found";
				onFinished(returnObject, callback, req, res, logMessage);
			}
		}
		
		function onItemSaved(err, result) {
			if(err) {
				returnObject.err = err;
			} else {
				returnObject.result = result;
			}
			onFinished(returnObject, callback, req, res, logMessage);
		}
	}
	
	function updateMore(req, res, find, update, callback, logMessage) {
		if(!req || !res || !find || !update) {
			throw('MongoHandler.updateById needs proper parameters: req, res, update, find.');
		}

		var returnObject = {
			result: {
				failed: [],
				updated: []
			}
		};

		model.find(find).exec(function(err, items) {
			async.forEach(items,
					function(item, callback) {
						if(typeof update === "function") {
							item = update(item);
							if(item.err) {
								returnObject.err = item.err;
								onFinished(returnObject, callback, req, res, logMessage);
								return;
							}
						} else {
							for(var i in update) {
								if(update.hasOwnProperty(i)) {
									item[i] = update[i];
								}
							}
						}
						item.save(function(err, result) {
							if(err) {
								returnObject.result.failed.push(item);
							} else {
								returnObject.result.updated.push(result);
							}
							callback();
						});
					}, function(err) {
						if(err) {
							returnObject.err = err;
						}
						onFinished(returnObject, callback, req, res, logMessage);
					});
		});
	}
	
	/*
	 * @param req {object} containing the req Object. Used for error logging. Obligated.
	 * @param res {object} containing the res Object. Used for error logging. Obligated.
	 * @param find {object} find object. Obligated.
	 * @param callback {function || 'json' || jsonp} Optional.
	 * @param logMessage {string} Optional.
	 */
	function duplicateOne(req, res, find, callback, logMessage) {
		if(!req || !res || !find) {
			throw('MongoHandler.duplicate needs proper parameters: req, res, find.');
		}
		
		var returnObject = {
			result: {}
		};
		
		findOne(find, onFound);
		
		function onFound(err, item) {
			if(err) {
				returnObject.err = err;
				onFinished(returnObject, callback, req, res, logMessage);
				return;
			} else {
				if(!item) {
					returnObject.err = 'Not found';
					onFinished(returnObject, callback, req, res, logMessage);
					return;
				}
				var newItem = new model(item);
				newItem.save(onSaved);
			}
		}
		
		function onSaved(err, item) {
			if(err) {
				returnObject.err = err;
			} else {
				returnObject.result = item._id;
			}
			onFinished(returnObject, callback, req, res, logMessage);
		}
	}
	
	function onFinished(returnObject, callback, req, res, logMessage) {
		var returning = (typeof callback === 'function') ? callback : returnMode;
		if(returnObject.err) {
			var errorLogObject = {};
			errorLogObject.statusCode = errorLogger.errorCodes.MONGO_DB_GENERAL_ERROR;
			errorLogObject.statusText = new Error('findOne').stack;
			if(req && req.headers) {
				errorLogObject.headers = req.headers;
			}
			if(req && req.user && req.user._id) {
				errorLogObject.user = req.user._id;
			}
			errorLogger.logError(errorLogObject);
		}
		
		if(logMessage && req.user && req.user._id) {
			new logModel({
				user : req.user._id,
				message: logMessage
			}).save();
		}
	
		if(typeof returning === 'function') {
			returning(returnObject.err, returnObject.result);
		} else if(typeof returning === 'string' && returning.toLowerCase() === 'json') {
			if(returnObject.err) {
				res.json({err: returnObject.err});
			} else {
				res.json(returnObject.result);
			}
		} else if(typeof returning === 'string' && returning.toLowerCase() === 'jsonp') {
			if(returnObject.err) {
				res.jsonp({err: returnObject.err});
			} else {
				res.jsonp(returnObject.result);
			}
		} else {
			res.json(returnObject);
		}
	}
	
	return {
		findOne: findOne,
		find: find,
		count: count,
		remove: remove,
		removeOne: removeOne,
		updateOne: updateOne,
		create: create,
		createMore:createMore,
		duplicateOne: duplicateOne,
	};
};

module.exports.models = {
	logModel: logModel
};