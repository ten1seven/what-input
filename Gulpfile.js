var concat = require('gulp-concat');
var del = require('del');
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var rename = require("gulp-rename");
var server = require('gulp-server-livereload');
var uglify = require('gulp-uglify');


gulp.task('clean', function () {
  return del([
    './.DS_Store',
    './src/**/.DS_Store'
  ]);
});


gulp.task('scripts-main', function() {
  return gulp.src(['./src/what-input.js'])
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(jshint())
    .pipe(gulp.dest('./'))
    .pipe(notify('Scripts task complete'));
});


gulp.task('scripts-uglify', function() {
  return gulp.src(['./what-input.js'])
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(uglify())
    .pipe(rename('what-input.min.js'))
    .pipe(gulp.dest('./'))
    .pipe(notify('Scripts uglify task complete'));
});


gulp.task('scripts-ie8', function() {
  return gulp.src(['./src/polyfills/ie8/*.js'])
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(concat('lte-IE8.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./'))
    .pipe(notify('IE8 scripts task complete'));
});


gulp.task('scripts', ['scripts-main', 'scripts-uglify', 'scripts-ie8']);


gulp.task('serve', ['clean', 'scripts'], function() {
  gulp.src('./')
    .pipe(server({
      defaultFile: 'demo.html',
      livereload: true,
      open: true
  }));

  gulp.watch('./src/*.js', ['scripts']);
});
