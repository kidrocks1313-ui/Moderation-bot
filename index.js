/* eslint no-use-before-define: 0 */

if (parseInt(process.versions.node.split('.')[0]) < 10) {
  console.error(
    'ERROR: You are running on Node.js v%s, but not supported this version!',
    process.versions.node.split('.')[0]
  )
  process.exit(1)
}

require('./src/yaml')

const logger = require('./src/logger').getLogger('main', 'green')
const args = require('./src/argument_parser')(process.argv.slice(2))
const app = require('./config')

logger.info('Loaded core modules')

if (process.pid === 1 || args.debug.pid1) {
  logger.warn('=============== WARNING ===============')
    .warn('PID is 1, it may occur unexpected behavior! (And not supported)')
    .warn('=======================================')
}

if (args.debugg) {
  logger.debug('You enabled debug option, and you\'ll see debug messages.')
}

logger.info(`Config version: ${app.wanted_configversion}`)
logger.info('Checking for version')

require('./src/versioncheck')()
  .then(() => {
    logger.info('Starting')

    const { fork } = require('child_process')

    let spawned
    let restart = false

    const spawn = () => {
      spawned = fork('src/client', process.argv.slice(2))
    }

    const register = () => {
      spawned.on('error', e => {
        clearInterval(timer)
        logger.emerg('Failed to start Bot:')
        logger.emerg(e.stack)
        process.exit(1)
      })

      spawned.on('close', code => {
        if (!restart) clearInterval(timer)

        if (code === 0) {
          logger.info(`Bot exited: ${code}`)
        } else {
          logger.emerg(`Bot exited with unexpected code: ${code}`)
        }

        if (!restart) process.exit(code)

        spawned.kill('SIGKILL')
        restart = false
      })

      const KILLINTHandler = () => {
        clearInterval(timer)
        logger.info('Caught SIGINT')
        logger.info('Stopping bot')

        setTimeout(() => {
          if (spawned) spawned.kill('SIGKILL')
        }, 5000)

        if (spawned) {
          spawned.send('stop')
        } else {
          logger.error('Can\'t send message to client')
        }
      }

      spawned.on('message', msg => {
        if (msg !== 'ping' && msg !== 'stop') {
          process.stdout.write(msg)
        }

        if (msg === 'stop') {
          KILLINTHandler()
        }
      })

      process.on('SIGINT', KILLINTHandler)
      process.on('SIGTERM', KILLINTHandler)
      process.on('SIGHUP', KILLINTHandler)
    }

    let times = 0

    const heartbeat = async () => {
      let received = false

      const handler = msg => {
        if (msg === 'ping') {
          received = true
        }
      }

      if (spawned) {
        spawned.send('heartbeat')
      } else {
        logger.error('Can\'t send heartbeat')
        return
      }

      spawned.once('message', handler)

      setTimeout(() => {
        if (!received) {
          if (times >= 1) {
            logger.emerg(
              'Looks like client is unusable (not responding), killing client, and attempting restart'
            )

            restart = true
            spawned.kill('SIGKILL')
          } else {
            times++
          }
        }

        received = false
        spawned.removeListener('message', handler)
      }, 250)
    }

    const timer = setInterval(heartbeat, 10000)

    spawn()
    register()
  })
  .catch(err => {
    logger.emerg('Version check failed:')
    logger.emerg(err.stack || err)
    process.exit(1)
  })
