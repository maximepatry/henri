const spawn = require('cross-spawn');
const path = require('path');
const fs = require('fs');
const prettier = require('prettier');
const stack = require('callsite');
const readline = require('readline');
const bounce = require('bounce');

/**
 *  Check if yarn exists
 *
 * @return {boolean} it exists?
 */
const yarnExists = () => spawn.sync('yarn', ['help']);

/**
 *  Check if a bunch of packages exists
 *
 * @throws
 * @param {any} [packages=[]] list of packages
 * @returns {boolean} they exist?
 */
function checkPackages(packages = []) {
  let missing = checkMissing(packages);

  if (missing.length > 0) {
    const msg = generateMessage(missing);

    throw new Error(`Unable to load ${msg.join(' ')} from the current project.
    
    Try installing ${missing.length > 1 ? 'them' : 'it'}:
    
      # ${yarnExists ? 'yarn add' : 'npm install'} ${missing.join(' ')}
    `);
  }

  return true;
}

/**
 *  Checks missing packages
 *
 * @param {any} packages list of packages
 * @returns  {Array<string>} missing packages
 */
function checkMissing(packages) {
  let missing = [];

  for (let pkg of packages) {
    try {
      require.resolve(path.resolve(process.cwd(), 'node_modules', pkg));
    } catch (error) {
      missing.push(pkg);
    }
  }

  return missing;
}

/**
 * Join and conjugates words in a human readable manner
 *
 * @param {string} missing items
 * @returns {string} human readable string (i hope...)
 */
const generateMessage = missing => {
  if (missing.length > 1) {
    return missing.map(
      (val, index) =>
        index === missing.length - 1 ? `\b\b and '${val}'` : `'${val}',`
    );
  }

  return missing;
};

/**
 * Chalk color for log/pen
 *
 * @param {string} [level='error'] error level
 * @returns {string} color
 */
function getColor(level = 'error') {
  const colors = {
    debug: 'blue',
    error: 'red',
    info: 'green',
    silly: 'magenta',
    verbose: 'white',
    warn: 'yellow',
  };

  return colors[level.toLowerCase()] || 'red';
}

/**
 * Clears the console
 * Thanks to friendly-errors-webpack-plugin
 *
 * @returns {boolean} success?
 */
function clearConsole() {
  if (process.stdout.isTTY && process.env.NODE_ENV !== 'test') {
    // Fill screen with blank lines. Then move to 0 (beginning of visible part) and clear it
    const blank = '\n'.repeat(process.stdout.rows || 1);

    console.log(blank); // eslint-disable-line no-console
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  }

  return true;
}

/**
 * Checks syntax of a file (server.js has a better version?)
 *
 * @param {any} location file location
 * @param {any} onSuccess callback
 * @returns {(Promise<string>|boolean)} result
 */
async function syntax(location, onSuccess) {
  return new Promise(resolve => {
    fs.readFile(location, 'utf8', (err, data) => {
      if (err) {
        return resolve(`unable to check the syntax of ${location}`);
      }
      parseSyntax(resolve, location, data, onSuccess);
    });
  });
}

/**
 * Make it go through prettier
 *
 * @param {Promise} resolve to be resoived
 * @param {string} file filename
 * @param {string} data file data
 * @param {function} onSuccess callback
 * @returns {Promise} result
 */
function parseSyntax(resolve, file, data, onSuccess) {
  try {
    prettier.format(data.toString(), {
      singleQuote: true,
      trailingComma: 'es5',
    });
    typeof onSuccess === 'function' && onSuccess();

    return resolve(true);
  } catch (error) {
    console.log(`while parsing ${file}`); // eslint-disable-line no-console
    console.log(' '); // eslint-disable-line no-console
    console.log(error); // eslint-disable-line no-console
    resolve(error);
  }
}

module.exports = {
  bounce,
  checkPackages,
  clearConsole,
  getColor,
  stack,
  syntax,
  yarnExists,
};
