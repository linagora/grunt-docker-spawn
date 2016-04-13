'use strict';

var Docker = require('dockerode');
var DEFAULT_DOCKER_OPTIONS = {socketPath: '/var/run/docker.sock'};

module.exports = function(grunt) {
  var log = grunt.log;
  var containers = {};

  grunt.registerMultiTask('container', 'Run a container', function() {
    var options = this.options();
    var taskOptions = options.taskOptions;
    var data = this.data;
    var target = this.target;
    var command = this.args[0];

    var docker = new Docker(options[grunt.option('docker')] || DEFAULT_DOCKER_OPTIONS);
    var done;
    var taskIsDone = false;
    var doneTimeout;
    var container;

    grunt.verbose.writeflags(data, 'Data');
    grunt.verbose.writeflags(options, 'Options');

    if (!taskOptions.async) {
      var doneFn = this.async();
      done = function(isSuccess) {
        clearTimeout(doneTimeout);
        if (!taskIsDone) {
          taskIsDone = true;
          doneFn(isSuccess);
        }
      }
    } else {
      done = function() {
        clearTimeout(doneTimeout);
      };
    }

    if (taskOptions.timeout) {
      doneTimeout = setTimeout(function() {
        if (!taskIsDone) {
          grunt.fail.warn('Task is marked as failure because of ' + taskOptions.timeout + ' timeout');
          done(false);
        }
      }, taskOptions.timeout);
    }

    if (command === 'remove') {
      container = containers[target] || docker.getContainer(data.name);

      if (!container) {
        grunt.fatal('No running container for target: ' + target);
      }

      log.writeln('Removing container for target: ' + target + ' (id = ' + container.id + ')');

      var removeContainerOptions = { force: true, v: true };

      if (options.removeContainerOptions) {
        for (var key in options.removeContainerOptions) {
          if (options.removeContainerOptions.hasOwnProperty(key)) {
            removeContainerOptions[key] = options.removeContainerOptions[key];
          }
        }
      }

      container.remove(removeContainerOptions, function(err, data) {
        if (err) {
          grunt.fail.warn('Unable to remove container for target: ' + target + ' - ' + err.message);

          return done(false);
        }
        delete containers[target];
        log.writeln('Successfully removed container for target: ' + target + ' (id = ' + container.id + ')');
        done();
      });
    } else if (command === 'pull') {
      log.writeln('Pulling image for target: ' + target);
      docker.pull(data.Image, function(err, stream) {
        if (err) {
          grunt.fatal('Could no pull image for target: ' + target + ' - ' + err.message);

          return done(false);
        }
        stream.on('data', function(chunk) {
          log.writeln(chunk);
        });
        stream.on('end', function() {
          done();
        });
      });
    } else {
      log.writeln('Creating container for target: ' + target);
      docker.createContainer(data, function(err, container) {
        if (err) {
          grunt.fatal('Could no create container for target: ' + target + ' - ' + err.message);
        }

        grunt.verbose.writeflags(container, 'Container');

        container.start(options.startContainerOptions, function(err, data) {
          if (err) {
            grunt.fatal('Could not run container for target: ' + target + ' - ' + err.message);
          }

          grunt.verbose.writeflags(data, 'Data');

          containers[target] = container;
          log.writeln('Successfully created container for target: ' + target + ' (id = ' + container.id + ')');

          // Attach a stream only if we need to parse output
          if (typeof taskOptions.matchOutput === 'function') {
            container.attach({stream: true, stdout: true, stderr: true}, function(err, stream) {
              if (err) {
                grunt.fatal('Could not attach stream container for target: ' + target + ' - ' + err.message);
              }
              stream.setEncoding('utf8');

              stream.on('data', function(data) {
                taskOptions.matchOutput(data, done);
              });

              stream.on('end', function() {
                taskOptions.matchOutput(null, done);
              });
            });
          } else {
            done();
          }
        });
      });
    }
  });
};
