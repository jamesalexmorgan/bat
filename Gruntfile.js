module.exports = function(grunt){
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    clean:{
      dist: ["dist/"],
      build: ["build/"]      
    },

    sass: {
      mainCSS: {
        options: {
          style: 'nested'
        },
        files: {
          'build/global.css': 'src/global.scss'
        }
      }      
    },

    concat: {
      options: {
        // define a string to put between each file in the concatenated output
        separator: '\n\n'
      },
      myConcatAllTask: {
        src: [
          'src/html/user-data.html',

          'src/html/tag-style-open.html',
          'bower_components/bootstrap/dist/css/bootstrap.min.css',
          'build/global.css',
          'src/html/tag-style-close.html',

          'src/main.html',

          'src/html/tag-script-open.html',
          'bower_components/underscore/underscore-min.js',
          'bower_components/angular/angular.min.js',
          'bower_components/moment/min/moment.min.js',
          'src/js/global.js',
          'src/html/tag-script-close.html'
        ],
        dest: 'dist/BAT-all.html'
      }
    },

    'string-replace': {
      batAll: {
        files: {
          'dist/BAT-all-escaped.html': 'dist/BAT-all.html',
        },
        options: {
          replacements: [{
            pattern: /\&/g,
            replacement: '&amp;'
          },{
            pattern: /\</g,
            replacement: '&lt;'
          },{
            pattern: /\>/g,
            replacement: '&gt;'
          }]
        }
      }
    },

    watch: {
      files: ['src/**'],
      tasks: ['clean:dist','sass','concat','clean:build','string-replace']
    }

  });

  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-sass');  
  grunt.loadNpmTasks('grunt-contrib-watch');  

  // Default task(s).
  grunt.registerTask('default', ['clean:dist','sass','concat','clean:build','string-replace']);

}
