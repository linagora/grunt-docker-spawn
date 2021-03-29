![Archived](https://img.shields.io/badge/Current_Status-archived-blue?style=flat)

grunt-docker-spawn
=====================

This grunt task is inspired by [grunt-shell-spawn](https://github.com/cri5ti/grunt-shell-spawn). It supports instantiation of docker
containers using [dockerode](https://github.com/apocas/dockerode) library.

One of the best use of this task is being able to run complex integration tests against docker containers and then avoid dependencies
and setups problematics.

The second best use is to be able to test your application against several backend versions without the need of a hard and long installation/uninstall process.
Thus, you only need to pull a specific version then run your backend tests (ie: mongo:2.6.6, mongo:3.0.4, ...).

Install
=======

    npm install grunt-docker-spawn

Then add the task in your Gruntfile:

    grunt.loadNpmTasks('grunt-docker-spawn')

Examples
========

The general configuration for a specific container is as follows:

    containerName: {
      Image: {String}                    // The repository and name of the image to pull from the dockerhub
      Cmd: [String]                      // The command which will override the default one
      Name: {String}                     // The name you want the new container to have
      Options: {
        taskOptions: {
          async: true,
          matchOuput: {function(chunk, done)}    // Callback called with the standard outputted data of the container as first argument and the done callback
          timeout: {Number} // milliseconds, if the task is not done after timeout, it will be marked as failed
        },
        startContainerOptions: {Object}  // Directly forwarded option to the [docker API](https://docs.docker.com/reference/api/docker_remote_api/#full-documentation)
        removeContainerOptions: {Object} // Directly forwarded option to the [docker API](https://docs.docker.com/reference/api/docker_remote_api/#full-documentation), default { v: true, force: true }

      }
    }

The **containerName** object is directly forwarded to dockerode (see docker.createContainer).

Here's how you would launch mongodb(in replication), redis and elasticsearch in which mongodb is linked to elasticsearch (for indexation
purpose for instance):

    /**
    * Ensure that service of containers are finished to start.
    */
    function _taskSuccessIfMatch(grunt, regex, info) {
      return function(chunk, done) {
        var out = '' + chunk;
        var started = regex;
        if (started.test(out)) {
          grunt.log.write(info);
          done(true);
        }
      };
    }

    ...

    container: {
      options: {
        machine: {
          host: '192.168.99.100',
          port: 2376,
          ca: fs.readFileSync(process.env.DOCKER_CERT_PATH + '/ca.pem', 'utf-8'),
          cert: fs.readFileSync(process.env.DOCKER_CERT_PATH + '/cert.pem', 'utf-8'),
          key: fs.readFileSync(process.env.DOCKER_CERT_PATH + '/key.pem', 'utf-8'),
          pass: 'mypass'
        }
      },
      redis: {
        Image: 'redis:latest',
        Name: 'redis',
        PortBindings: { '6379/tcp': [{ 'HostPort': '23456' }] },
        Options: {
          taskOptions: {
            async: true,
            matchOuput: _taskSuccessIfMatch(grunt, /on port/, 'Redis server is started')
          },
          startContainerOptions: {}
        }
      },
      mongodb: {
        Image: 'mongo:latest',
        Cmd: 'mongod --replSet replication --smallfiles --oplogSize 128'.split(' '),
        Name: 'mongodb',
        PortBindings: { '27017/tcp': [{ 'HostPort': '23457' }] },
        ExtraHosts: ['mongo:127.0.0.1'],
        Options: {
          taskOptions: {
            async: true,
            matchOuput: _taskSuccessIfMatch(grunt, /connections on port 27017/, 'MongoDB server is started')
          },
          startContainerOptions: {}
        }
      },
      elasticsearch: {
        Image: 'elasticsearch:latest',
        Cmd: ['elasticsearch', '-Des.discovery.zen.ping.multicast.enabled=false'],
        Name: 'elasticsearch',
        PortBindings: { '9200/tcp': [{ 'HostPort': '23458' }] },
        Links: ['mongodb:mongo'],
        Options: {
          taskOptions: {
            async: true,
            matchOuput: _taskSuccessIfMatch(grunt, /started/, 'Elasticsearch server is started')
          },
          startContainerOptions: {}
        }
      },
    }

/!\ Do not forget to pull containers first if it is not already done. grunt-docker-spawn uses **docker start** implementation of dockerode, not **docker run** /!\

The options to give to instanciate a dockerode client can be set at the task level and selected with the docker argument:

```bash
grunt container:redis --docker=machine
```
This will instanciate the dockerode client with the configuration block defined in options.machine. Check the dockerode documentation for possible values.

Pull needed container
=====================

This is how you pull a container. Run this task during setup to initialize your environment. Containers must be available in the
[Docker Hub](https://hub.docker.com/account/signup/) community repositories.

    grunt container:redis:pull

Run a container
===============

This is how you start a container. Run this task at the beginning of your grunt workflow.

    grunt container:redis

Remove a container
==================

This is how you remove a container. Run this task at the end of your grunt workflow.

    grunt container:redis container:redis:remove

Containers that are not removed will continue running.

Typical grunt tasks for integration tests
========================================

    grunt.registerTask('spawn-containers', ['container:redis', 'container:mongodb']);
    grunt.registerTask('remove-containers', ['container:redis:remove', 'container:mongodb:remove']);
    ...
    grunt.registerTask('test-integration', ['linters', 'spawn-containers', 'run-integration-tests', 'remove-containers']);

License
=======

MIT License(c) [Linagora](https://github.com/linagora)
