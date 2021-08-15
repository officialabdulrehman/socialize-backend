let socket;

export const io = {
  init: server => {
    socket = require('socket.io')(server, {
      cors: {
        methods: ["GET", "POST", "PUT", "DELETE"]
      }
    })
    return socket
  },
  getIO: () => {
    if(!socket) {
      throw new Error('Socket.io not initialized')
    }
    return socket
  }
}

export default io