var casperJs = require('gulp-casperjs');
var gulp     = require('gulp');

gulp.task('test', function () {
  gulp.src('./tests/*.js')
    .pipe(casperJs());
});
