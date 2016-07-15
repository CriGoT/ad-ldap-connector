var https = require('https');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var async = require('async');

function addCertificates(cb){
  return function(err, certificates) {
    if (err) {
      console.log('System CAs coudl not be imported', err);
      cb(err);
    }

    var cas = https.globalAgent.options.ca =
      https.globalAgent.options.ca || [];
    certificates.forEach(function (cert) {
        cas.push(cert.pem);
      });
    cb();
  }
}

function readPEM(file,cb){
  fs.readFile(file, function(err,data) {
    if (err) return cb(err);

    cb(null, {pem: data});
  });
}

function injectSystemCA(cb) {
  if (process.platform === 'win32') {
    require('windows-certs')
      .certs
      .get({
        storeLocation: 'LocalMachine',
        storeName: ['TrustedPeople', 'CertificateAuthority', 'Root']
      },addCertificates(cb));
  } else if (process.platform === 'linux' || process.platform === 'freebsd') {
    exec('openssl version -d', function(err, stdout, stderr){
      if (err) cb(err);

      var match = /.*\:\s*\"?(.*)\"?.*/.exec(stdout);
      if (match && match.length > 1) {
        fs.readDir(path.join(match[1], 'cert'), function(err, files) {          
          if (err) cb (err);

          async.map(files, readPEM,addCertificates(cb));
        });
      }
    });
  } else {
    console.log('CA import is not implemented for platform ' + process.platform);
    cb();
  }
}

module.exports = {
  inject: injectSystemCA
};
