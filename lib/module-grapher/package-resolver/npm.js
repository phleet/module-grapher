var fs = require('fs'),
    path = require('path'),
    pathResolver = require('../path-resolver'),
    packageDescriptor = require('./package-descriptor'),
    npm = null;
    
try {
  npm = require('npm');
  exports.npmRoot = npm.root;
  exports.npmDir = npm.dir;
} catch(e) {}

exports.PackageResolver = PackageResolver;
function PackageResolver(module) {
  this.module = module;
  this.relativePath = module.relativePath;
  this.packagePath = path.join(exports.npmDir, this.relativePath, 'active', 'package');
  this.descriptorPath = path.join(this.packagePath, 'package.json');
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    var self = this;
    path.exists(this.descriptorPath, function(exists) {
      if (exists) {
        self.getPackageDescriptor(function(err, json) {
          if (err) {
            callback(err);
            return;
          }

          var dirname = path.dirname(json.main || ''),
              libPath = path.join(self.packagePath, dirname),
              filePath = path.join(libPath, pathResolver.addExtension(json.main || 'index'));
              
          self.module.packagePath = libPath;
          
          callback(null, filePath);
        });
      } else {
        callback(null, null);
      }
    });
  }
  
  p.getPackageDescriptor = getPackageDescriptor;
  function getPackageDescriptor(callback) {
    fs.readFile(this.descriptorPath, 'utf8', function(err, data) {
      if (err) {
        callback(err);
      } else {
        try {
          callback(null, JSON.parse(data));
        } catch(err) {
          callback(err);
        }
      }
    });
  }
})(PackageResolver.prototype);

function ModuleResolver(module) {
  this.module = module;
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    var p = path.join(this.module.packagePath, this.module.relativePath);
    pathResolver.testPath(p, callback);
  }
})(ModuleResolver.prototype);

function ExposedModuleResolver(module) {
  this.module = module;
}

(function(p) {
  p.resolve = resolve;
  function resolve(callback) {
    var p = path.join(this.module.packagePath, this.module.relativePath);
    pathResolver.testPath(p, callback);
  }
})(ExposedModuleResolver.prototype);

exports.createResolver = createResolver;
function createResolver(module) {
  if (module.packagePath) {
    return new ModuleResolver(module);
  } else if (module.identifier.isTopLevel() && module.identifier.terms.length > 1) {
  } else {
    return new PackageResolver(module);
  }
}