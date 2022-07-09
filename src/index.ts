import express from 'express'
import http from 'http'
import { Server, Socket } from 'socket.io'
import assert from 'assert'
import { assertHasKey, assertIsStringUnion, hasKey } from './typeHelpers'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['POST'],
  },
})

const appsMap = new Map<string, Map<string, Map<string, Socket>>>()
const socketIdMap = new Map<string, { app: string; username: string }>()

const handleInit = (socket: Socket, username: string, app: string) => {
  let appMap = appsMap.get(app)
  if (appMap === undefined) {
    appMap = new Map()
    appsMap.set(app, appMap)
  }

  let usernameMap = appMap.get(username)
  if (usernameMap === undefined) {
    usernameMap = new Map()
    appMap.set(username, usernameMap)
  }

  socketIdMap.set(socket.id, { app, username })

  socket.emit('socketIds', {
    socketIds: Array.from(usernameMap.keys()),
  })

  usernameMap.set(socket.id, socket)
}

const handleSignal = (
  socket: Socket,
  {
    socketId,
    signalData,
    username,
  }: {
    socketId: string
    signalData: string
    username: string
  },
  app: string,
) => {
  const appMap = appsMap.get(app)
  if (appMap === undefined) {
    console.error(`Trying to signal unknown app named "${app}"`)
    return
  }
  const usernameMap = appMap.get(username)
  if (usernameMap === undefined) {
    console.error(`Trying to signal unknown username "${username}"`)
    return
  }
  usernameMap.get(socketId)?.emit('signal', { socketId: socket.id, signalData })
}

const validMsg = ['init', 'signal'] as const

type Message = {
  app: string
  data: {
    msg: typeof validMsg[number]
    payload?: unknown
  }
}

const isValidMessage = (message: unknown): message is Message => {
  try {
    assertHasKey(message, 'app', 'Message must have "app" key')
    assertHasKey(message, 'data', 'Message must have "data" key')
    const { app, data } = message
    assert(typeof app === 'string', 'App name must be a string')
    assertHasKey(data, 'msg', 'Data must have "msg" key')
    const { msg } = data
    assertIsStringUnion(
      msg,
      validMsg,
      `msg must be ${validMsg.map((msg) => `"${msg}"`).join(', ')}`,
    )
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}

io.on('connection', (socket) => {
  socket.on('message', (message: unknown) => {
    if (!isValidMessage(message)) {
      console.error('Invalid message', message)
      socket.disconnect()
      return
    }

    const { app, data } = message
    const { msg } = data

    switch (msg) {
      case 'init': {
        if (!hasKey(data, 'payload') || !(typeof data.payload === 'string')) {
          console.error(`Init payload must be string, but got: ${data.payload}`)
          return
        }
        handleInit(socket, data.payload, app)
        break
      }

      case 'signal': {
        if (!hasKey(data, 'payload')) {
          console.error('Signal data must have payload')
          return
        }
        const { payload } = data
        if (
          !hasKey(payload, 'socketId') ||
          !hasKey(payload, 'username') ||
          !hasKey(payload, 'signalData')
        ) {
          console.error(
            `Signal payload must have socketId, username, signalData. Found: ${payload}`,
          )
          return
        }

        const { socketId, username, signalData } = payload

        if (
          !(typeof username === 'string') ||
          !(typeof socketId === 'string') ||
          !(typeof signalData === 'string')
        ) {
          console.error(
            `Username, socketId, signalData must be of type string. Found: ${payload}`,
          )
          return
        }

        handleSignal(socket, { socketId, signalData, username }, app)
        break
      }

      default: {
        const never: never = msg
        never
      }
    }
  })

  socket.on('disconnect', async () => {
    const data = socketIdMap.get(socket.id)
    if (data === undefined) {
      return
    }
    socketIdMap.delete(socket.id)

    const { app, username } = data
    const appMap = appsMap.get(app)
    if (appMap === undefined) {
      return
    }

    const usernameMap = appMap.get(username)
    if (usernameMap === undefined) {
      return
    }

    usernameMap.delete(socket.id)
  })
})

const port = process.env['PORT'] || 8080
server.listen(port, () => {
  console.log(`listening on *:${port}`)
})
