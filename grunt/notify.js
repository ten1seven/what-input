var projTitle = 'What Input?';

module.exports = {
  options: {
    enabled: true,
    max_jshint_notifications: 5,
    title: projTitle,
    success: false,
    duration: 5
  },
  scripts: {
    options: {
      title: projTitle,
      message: 'Scripts task finished running.',
    }
  },
  server: {
    options: {
      title: projTitle,
      message: 'Server is ready.'
    }
  }
};
