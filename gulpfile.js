'use strict';

var gulp = require('gulp'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    umd = require('gulp-umd'),
    webpack = require('gulp-webpack');

var config = {

  webpack: function(output) {
    var plugins = ['add-module-exports'];
    if (output === 'bundle') {
      plugins.push('transform-runtime');
    }
    return {
      output: {
        libraryTarget: 'var',
        library: 'Sortasync'
      },
      module: {
        loaders: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel',
            query: {
              presets: ['es2015'],
              plugins: plugins
            }
          }
        ]
      }    
    };
  },

  umd: function() {
    return {
      exports: function(file) {
        return 'Sortasync';
      },
      namespace: function(file) {
        return 'Sortasync';
      }
    };
  }
  
};

gulp.task('build', ['build-es2015', 'build-compat', 'build-bundle']);

gulp.task('build-es2015', function() {
  gulp.src('src/sortasync.js')
    .pipe(rename('sortasync.es2015.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('build-compat', function() {
  gulp.src('src/sortasync.js')
    .pipe(webpack(config.webpack('compat')))
    .pipe(umd(config.umd()))
    .pipe(uglify())
    .pipe(rename('sortasync.compat.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('build-bundle', function() {
  gulp.src('src/sortasync.js')
    .pipe(webpack(config.webpack('bundle')))
    .pipe(umd(config.umd()))
    .pipe(uglify())
    .pipe(rename('sortasync.bundle.js'))
    .pipe(gulp.dest('dist'));
});
