const banner        = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n')
const browserSync = require('browser-sync').create()
const concat      = require('gulp-concat')
const del         = require('del')
const gulp        = require('gulp')
const header      = require('gulp-header')
const notify      = require('gulp-notify')
const pkg         = require('./package.json')
const plumber     = require('gulp-plumber')
const rename      = require('gulp-rename')
const runSequence = require('run-sequence')
const standard    = require('gulp-standard')
const uglify      = require('gulp-uglify')
const webpack     = require('webpack-stream')

/*
 * clean task
 */

gulp.task('clean', () => {
  return del(['**/.DS_Store'])
})

/*
 * scripts tasks
 */

gulp.task('scripts:main', () => {
  return gulp.src(['./src/what-input.js'])
    .pipe(standard())
    .pipe(standard.reporter('default', {
      breakOnError: true,
      quiet: false
    }))
    .pipe(webpack({
      module: {
        loaders: [{
          test: /.jsx?$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
          query: {
            presets: ['es2015']
          }
        }]
      },
      output: {
        chunkFilename: '[name].js',
        library: 'whatInput',
        libraryTarget: 'umd',
        umdNamedDefine: true
      }
    }))
    .pipe(rename('what-input.js'))
    .pipe(header(banner, { pkg : pkg } ))
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('./docs/scripts/'))
    .pipe(uglify())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(header(banner, { pkg : pkg } ))
    .pipe(gulp.dest('./dist/'))
    .pipe(notify('Build complete'))
})

gulp.task('scripts:ie8', () => {
  return gulp.src(['./src/polyfills/ie8/*.js'])
    .pipe(plumber({
      errorHandler: notify.onError("Error: <%= error.message %>")
    }))
    .pipe(concat('lte-IE8.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('./docs/scripts/'))
    .pipe(notify('IE8 scripts task complete'))
})

gulp.task('scripts', ['scripts:main', 'scripts:ie8'])

/*
 * default task
 */

gulp.task('default', () => {
  runSequence(
    'clean',
    [
      'scripts'
    ],
    () => {
      browserSync.init({
        server: {
          baseDir: './docs/'
        }
      })

      gulp.watch([
        './src/what-input.js',
        './polyfills/*.js'
      ], ['scripts']).on('change', browserSync.reload)

      gulp.watch([
        './*.html',
      ]).on('change', browserSync.reload)
    }
  )
})
