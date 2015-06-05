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
        tasks: {
          async: true
        },
        startContainerOptions: {Object}  // Directly forwarded option to the [docker API](https://docs.docker.com/reference/api/docker_remote_api/#full-documentation) 
        matchOuput: {function(chunk)}    // Callback called with the standard outputted data of the container as first argument
      }
    }

The **containerName** object is directly forwarded to dockerode (see docker.createContainer).

Here's how you would launch mongodb(in replication), redis and elasticsearch in which mongodb is linked to elasticsearch (for indexation
purpose for instance):

    /**
    * Ensure that service of containers are finished to start.
    */
    function _taskSuccessIfMatch(grunt, regex, info) {
      return function(chunk) {
        var done = grunt.task.current.async();
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
      redis: {
        Image: 'redis:latest',
        Name: 'redis',
        Options: {
          tasks: {
            async: true
          },
          startContainerOptions: { PortBindings: { '6379/tcp': [{ 'HostPort': '23456' }] } },
          matchOuput: _taskSuccessIfMatch(grunt, /on port/, 'Redis server is started')
        }
      },
      mongodb: {
        Image: 'mongo:latest',
        Cmd: 'mongod --replSet replication --smallfiles --oplogSize 128'.split(' '),
        Name: 'mongodb',
        Options: {
          tasks: {
            async: true
          },
          startContainerOptions: { PortBindings: { '27017/tcp': [{ 'HostPort': '23457' }] }, ExtraHosts: ['mongo:127.0.0.1']},
          matchOuput: _taskSuccessIfMatch(grunt, /connections on port 27017/, 'MongoDB server is started')
        }
      },
      elasticsearch: {
        Image: 'elasticsearch:latest',
        Cmd: ['elasticsearch', '-Des.discovery.zen.ping.multicast.enabled=false'],
        Name: 'elasticsearch',
        Options: {
          tasks: {
            async: true
          },
          startContainerOptions: { PortBindings: { '9200/tcp': [{ 'HostPort': '23458' }] }, Links: ['mongodb:mongo'] },
          matchOuput: _taskSuccessIfMatch(grunt, /started/, 'Elasticsearch server is started')
        }
      },
    }

/!\ Do not forget to pull containers first if it is not already done. grunt-docker-spawn uses **docker start** implementation of dockerode, not **docker run** /!\

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