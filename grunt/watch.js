module.exports = {
  configFiles: {
    files: [
      'Gruntfile.js'
    ],
    options: {
      reload: true
    }
  },
  scripts: {
    files: [
      './src/*.js'
    ],
    tasks: ['scripts'],
    options: {
      spawn: false
    }
  }
};
