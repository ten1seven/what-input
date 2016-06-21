var banner        = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n');
var browserSync   = require('browser-sync').create();
var casperJs      = require('gulp-casperjs');
var concat        = require('gulp-concat');
var del           = require('del');
var gulp          = require('gulp');
var header        = require('gulp-header');
var notify        = require('gulp-notify');
var pkg           = require('./package.json');
var plumber       = require('gulp-plumber');
var rename        = require('gulp-rename');
var runSequence   = require('run-sequence');
var webpackStream = require('webpack-stream');
var webpack       = require('webpack');
var cloneDeep     = require('lodash.clonedeep');
var webpackConfig = require('./webpack.config');

/*
  --------------------
  Clean task
  --------------------
*/

gulp.task('clean', function () {
  return del(['**/.DS_Store']);
});


/*
  --------------------
  Scripts tasks
  --------------------
*/

gulp.task('scripts:dev', function() {
  return gulp.src(['./src/what-input.js'])
    .pipe(webpackStream(webpackConfig))
    .pipe(rename('what-input.js'))
    .pipe(header(banner, { pkg : pkg } ))
    .pipe(gulp.dest('./dist/'))
    .pipe(notify('Development build complete'));
});

gulp.task('scripts:build', function() {
  var webpackBuildConfig = cloneDeep(webpackConfig);
  webpackBuildConfig.plugins = [new webpack.optimize.DedupePlugin(), new webpack.optimize.UglifyJsPlugin({minimize: true})];

  return gulp.src(['./src/what-input.js'])
    .pipe(webpackStream(webpackBuildConfig))
    .pipe(plumber({
      errorHandler: notify.onError("Error: <%= error.message %>")
    }))
    .pipe(rename('what-input.min.js'))
    .pipe(header(banner, { pkg : pkg } ))
    .pipe(gulp.dest('./dist/'))
    .pipe(notify('Minified build complete'));
});

gulp.task('scripts:ie8', function() {
  return gulp.src(['./src/polyfills/ie8/*.js'])
    .pipe(plumber({
      errorHandler: notify.onError("Error: <%= error.message %>")
    }))
    .pipe(concat('lte-IE8.js'))
    .pipe(gulp.dest('./dist/'))
    .pipe(notify('IE8 scripts task complete'));
});

gulp.task('scripts', ['scripts:dev', 'scripts:build', 'scripts:ie8']);

/*
  --------------------
  Test runner
  --------------------
*/

gulp.task('test', function () {
  gulp.src('./tests/*.js')
    .pipe(casperJs());
});


/*
  --------------------
  Default task
  --------------------
*/

gulp.task('default', function() {
  runSequence(
    'clean',
    [
      'scripts'
    ],
    function() {
      browserSync.init({
        server: {
          baseDir: './'
        }
      });

      gulp.watch([
        './src/what-input.js',
        './polyfills/*.js'
      ], ['scripts']).on('change', browserSync.reload);

      gulp.watch([
        './*.html',
      ]).on('change', browserSync.reload);
    }
  );
});
