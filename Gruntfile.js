'use strict';

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      files: ['Gruntfile.js', 'tasks/**/*.js', 'test/**/*.js']
    },
    release: {
      options: {
        npmtag: true
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-release');

  grunt.registerTask('default', ['jshint']);
};