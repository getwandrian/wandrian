module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Project settings
    path: {
      app: 'app',
      dist: 'dist',
    },

    watch: {
      options: {
        livereload: true,
      },
      files: [
        '<%= path.app %>/**/*',
      ],
      tasks: ['cssmin', 'uglify', 'htmlmin', 'copy']
    },

    cssmin: {
      internal: {
        files: [{
          expand: true,
          cwd: '<%= path.app %>/wandrian',
          src: '**/*.css',
          dest: '<%= path.dist %>/wandrian',
          ext: '.min.css'
        }]
      }
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },

      internal: {
        files: [{
          expand: true,
          cwd: '<%= path.app %>/wandrian',
          src: '**/*.js',
          dest: '<%= path.dist %>/wandrian',
          ext: '.min.js'
        }]
      },
    },

    htmlmin: {
      all: {
        options: {
          removeComments: true,
          collapseWhitespace: true
        },

        files: [{
          expand: true,
          cwd: '<%= path.app %>/html',
          src: '**/*.html',
          dest: '<%= path.dist %>/html'
        }]
      },
    },

    copy: {
      all: {
        files: [{
          expand: true,
          cwd: '<%= path.app %>/games',
          src: '**/*.*',
          dest: '<%= path.dist %>/games'
        }]
      },

      libs: {
        files: [
          {
            expand: true,
            cwd: '<%= path.app %>/bower_components/jquery/dist',
            src: ['**/*.js', '**/*.map'],
            dest: '<%= path.dist %>/libs'
          },
          {
            expand: true,
            cwd: '<%= path.app %>/bower_components/underscore',
            src: ['**/*.js', '**/*.map'],
            dest: '<%= path.dist %>/libs'
          }
        ]
      },
    },

    express: {
      all: {
        options: {
          port: 9000,
          hostname: "0.0.0.0",
          bases: ['dist'],
          livereload: true
        }
      }
    },

    open: {
      all: {
        path: 'http://localhost:<%= express.all.options.port%>/games/simple_collisions/'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.loadNpmTasks('grunt-express');
  grunt.loadNpmTasks('grunt-open');

  grunt.registerTask('default', [
    'cssmin:internal',
    'uglify:internal',
    'htmlmin',
    'copy',
    'express',
    'open',
    'watch',
  ]);

};