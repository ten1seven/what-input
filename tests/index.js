casper.test.begin('Tests', function(test) {
  casper.start('http://localhost:3000').then(function() {

    /*
      --------------------
      Mouse move
      --------------------
    */

    this.click('body');
    test.assertEquals(
      this.getElementAttribute('body', 'data-whatinput'),
      'mouse',
      'FUNCTIONAL: Clicking with the mouse sets data-whatinput to `mouse`'
    );

  }).then(function() {

    /*
      --------------------
      Key press
      --------------------
    */

    this.sendKeys('body', 'tab');
    test.assertEquals(
      this.getElementAttribute('body', 'data-whatinput'),
      'keyboard',
      'FUNCTIONAL: Using the keyboard sets data-whatinput to `keyboard`'
    );

  }).then(function() {

    /*
      --------------------
      API
      --------------------
    */

    // types
    var types = casper.evaluate(function() {
      return whatInput.types();
    });

    test.assertInstanceOf(
      types,
      Array,
      'API: `types` returns an array'
    );

    test.assertTruthy(
      types.length === 2,
      'API: `types` array length is 2'
    );

    test.assertTruthy(
      (types.indexOf('mouse') !== -1 && types.indexOf('keyboard') !== -1),
      'API: `types` array contains `mouse` and `keyboard`'
    );

    // set/ask
    var ask = casper.evaluate(function() {
      whatInput.set('hampster');
      return whatInput.ask();
    });

    test.assertEquals(
      ask,
      'hampster',
      'API: Setting `hampster` returns `hampster`'
    );

    // keys
    this.page.sendEvent('keydown', this.page.event.key.Tab);
    var keys = casper.evaluate(function() {
      return whatInput.keys();
    });

    test.assertInstanceOf(
      keys,
      Array,
      'API: `keys` returns an array'
    );

    test.assertTruthy(
      keys.indexOf('tab') !== -1,
      'API: `tab` is in the `keys` array'
    );

  }).run(function() {
    test.done();
  });
});
