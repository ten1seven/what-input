module.exports = {
  options: {
    mangle: false
  },
  my_target: {
    files: {
      './what-input.min.js': ['./what-input.js']
    }
  }
};
