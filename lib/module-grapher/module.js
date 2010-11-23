var path = require('path'),
    fs = require('fs'),
    pathResolver = require('./path-resolver'),
    depResolver = require('./dependency-resolver'),
    identifier = require('./identifier'),
    memoize = require('async-memoizer').memoize;
    
var NATIVE_MODULES = process.binding('natives');


exports.createModuleFromString = createModuleFromString;
function createModuleFromString(str) {
  var id = identifier.createIdentifierFromString(str);
  return createModule(id);
}

exports.createModule = createModule;
function createModule(identifier) {
  return new Module(identifier);
}

function Module(identifier) {
  this.identifier = identifier;
}

(function(p) {
  p.requirer = null;
  
  p.getId = getId;
  p._id = null;
  function getId() {
    if (this._id == null) {
      this._id = this.getResolvedIdentifier().toString();
    }
    return this._id;
  }
  
  p.getSrc = getSrc;
  function getSrc(callback) {
    var identifier = this.identifier.toString();
    
    if (this.isNative()) {
      process.nextTick(function() {
        callback(null, NATIVE_MODULES[identifier]);
      });
      return;
    }
    
    this.resolvePath(function(err, p) {
      if (err) {
        callback(err);
        return;
      }
      fs.readFile(p, 'utf8', function (err, src) {
        if (err || src == null) { // TODO test whether or not file exists before read
          err = new Error('Cannot load module: "' + identifier + '".');
          callback(err);
        } else {
          callback(null, src);
        }
      });
    });
  }
  
  p.resolvePath = resolvePath;
  function resolvePath(callback) {
    pathResolver.resolvePath(this, callback);
  }
  
  p.getResolvedIdentifier = getResolvedIdentifier;
  p._resolvedIdentifier = null;
  function getResolvedIdentifier() {
    if (!this._resolvedIdentifier) {
      var identifier = this.identifier,
          requirer = this.requirer;
      if (!requirer || identifier.isTopLevel()) {
        this._resolvedIdentifier = identifier.clone();
      } else  {
        var reqID = requirer.getResolvedIdentifier();
        this._resolvedIdentifier = identifier.resolve(reqID);
      }
    }
    return this._resolvedIdentifier;
  }
  
  p.getRelativePath = getRelativePath;
  p._relativePath = null;
  function getRelativePath() {
    if (this._relativePath == null) {
      var identifier =  this.getResolvedIdentifier();
      this._relativePath = path.join.apply(path, identifier.terms);
    }
    return this._relativePath;
  }
  
  p.getRequirerPackagePath = getRequirerPackagePath;
  function getRequirerPackagePath() {
    var m = this, p;
    while (m = m.requirer) {
      p = m.getPackagePath();
      if (p) { return p; }
    }
    return null;
  }
  
  p.setPackagePath = setPackagePath;
  p._packagePath = null;
  function setPackagePath(p) {
    return this._packagePath = p;
  }
  
  p.getPackagePath = getPackagePath;
  function getPackagePath() {
    return this._packagePath;
  }
  
  p.isPackage = isPackage;
  function isPackage() {
    return !!this._packagePath;
  }
  
  p.isNative = isNative;
  function isNative() {
    var identifier = this.identifier.toString();
    return (identifier in NATIVE_MODULES);
  }
  
  p.getDirectDependencies = getDirectDependencies;
  function getDirectDependencies(callback) {
    depResolver.getDirectDependencies(this, {}, callback);
  }
  
  p.getDependencies = getDependencies;
  function getDependencies(callback) {
    depResolver.getDependencies(this, {}, callback);
  }
  
  memoize(p, 'getSrc');
  memoize(p, 'getDependencies');
  memoize(p, 'getDirectDependencies');
  
})(Module.prototype);

