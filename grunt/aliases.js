module.exports = {
  'default': [
    'connect',
    'notify:server',
    'watch'
  ],

  'scripts': [
    'newer:jshint',
    'newer:concat:ie8',
    'umd',
    'uglify',
    'notify:scripts'
  ],

  'build': [
    'clean',
    'scripts'
  ]
};
