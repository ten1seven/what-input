/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
	'*.js': 'prettier --write --experimental-cli',
}
