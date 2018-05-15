const banner = [
  '/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''
].join('\n')
const autoprefixer = require('autoprefixer')
const browserSync = require('browser-sync').create()
const concat = require('gulp-concat')
const del = require('del')
const ghPages = require('gulp-gh-pages')
const gulp = require('gulp')
const header = require('gulp-header')
const mqpacker = require('css-mqpacker')
const nano = require('gulp-cssnano')
const notify = require('gulp-notify')
const pkg = require('./package.json')
const plumber = require('gulp-plumber')
const postcss = require('gulp-postcss')
const rename = require('gulp-rename')
const runSequence = require('run-sequence')
const sass = require('gulp-sass')
const sassGlob = require('gulp-sass-glob')
const sourcemaps = require('gulp-sourcemaps')
const standard = require('gulp-standard')
const uglify = require('gulp-uglify')
const webpack = require('webpack-stream')

/*
 * clean task
 */

gulp.task('clean', () => {
  return del(['**/.DS_Store', './build/*', './dist/*'])
})

/*
 * scripts tasks
 */

gulp.task('scripts', () => {
  return gulp
    .src(['./src/scripts/what-input.js'])
    .pipe(standard())
    .pipe(
      standard.reporter('default', {
        breakOnError: true,
        quiet: false
      })
    )
    .pipe(
      webpack({
        module: {
          loaders: [
            {
              test: /.jsx?$/,
              loader: 'babel-loader',
              exclude: /node_modules/,
              query: {
                presets: ['env']
              }
            }
          ]
        },
        output: {
          chunkFilename: '[name].js',
          library: 'whatInput',
          libraryTarget: 'umd',
          umdNamedDefine: true
        }
      })
    )
    .pipe(rename('what-input.js'))
    .pipe(header(banner, { pkg: pkg }))
    .pipe(gulp.dest('./dist/'))
    .pipe(gulp.dest('./build/scripts/'))
    .pipe(uglify())
    .pipe(
      rename({
        suffix: '.min'
      })
    )
    .pipe(header(banner, { pkg: pkg }))
    .pipe(gulp.dest('./dist/'))
    .pipe(notify('Build complete'))
})

/*
 * stylesheets
 */

gulp.task('styles', () => {
  let processors = [
    autoprefixer({
      browsers: ['last 3 versions', '> 1%', 'ie >= 10']
    }),
    mqpacker({
      sort: true
    })
  ]

  return gulp
    .src(['./src/styles/index.scss'])
    .pipe(
      plumber({
        errorHandler: notify.onError('Error: <%= error.message %>')
      })
    )
    .pipe(sourcemaps.init())
    .pipe(sassGlob())
    .pipe(sass())
    .pipe(postcss(processors))
    .pipe(
      nano({
        minifySelectors: false,
        reduceIdents: false,
        zindex: false
      })
    )
    .pipe(sourcemaps.write('maps'))
    .pipe(gulp.dest('./build/styles'))
    .pipe(browserSync.stream())
    .pipe(notify('Styles task complete'))
})

/*
 * images task
 */

gulp.task('images', () => {
  return gulp.src(['./src/images/**/*']).pipe(gulp.dest('./build/images'))
})

/*
 * markup task
 */

gulp.task('markup', () => {
  return gulp.src(['./src/markup/*']).pipe(gulp.dest('./build'))
})

/*
 * deploy task
 */

gulp.task('deploy', () => {
  return gulp.src('./build/**/*').pipe(ghPages())
})

/*
 * default task
 */

gulp.task('default', () => {
  runSequence('clean', ['markup', 'scripts', 'styles', 'images'], () => {
    browserSync.init({
      server: {
        baseDir: './build/'
      }
    })

    gulp
      .watch(
        ['./src/scripts/what-input.js', './src/scripts/polyfills/*.js'],
        ['scripts']
      )
      .on('change', browserSync.reload)

    gulp.watch(['./src/styles/{,*/}{,*/}*.scss'], ['styles'])

    gulp
      .watch(['./src/markup/*.html'], ['markup'])
      .on('change', browserSync.reload)
  })
})
