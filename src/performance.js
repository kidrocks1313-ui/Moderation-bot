const logger = require(__dirname + '/logger').getLogger('performance', 'orange')

setInterval(() => {
  const memory = process.memoryUsage()
  const cpu = process.cpuUsage()

  const memoryMB = (memory.rss / 1024 / 1024).toFixed(2)

  logger.debug(
    `Memory usage: ${memoryMB} MB  CPU usage: ${cpu.user} user / ${cpu.system} system`
  )
}, 5 * 60 * 1000)
