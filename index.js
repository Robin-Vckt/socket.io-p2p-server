var debug = require('debug')('socket')
var clients = {}

module.exports.clients = clients
module.exports.Server = p2pSocket

function p2pSocket (socket, next, room) {
  if (typeof room === 'object' && ('name' in room) && (room.name in socket.adapter.rooms)) { 
    var connectedClients = {} 
    for (var id in socket.adapter.rooms[room.name].sockets) { 
     connectedClients[id] = clients[id]; 
    } 
  } else {
    var connectedClients = clients
  }
  socket.emit('numClients', Object.keys(connectedClients).length - 1)

  socket.on('disconnect', function () {
    delete clients[socket.id]
    Object.keys(connectedClients).forEach(function (clientId, i) {
      var client = clients[clientId]
      if(client !== undefined){
        client.emit('peer-disconnect', {peerId: socket.id})
        delete clients[socket.id]
      }
    })
    debug('Client gone (id=' + socket.id + ').')
  })

  socket.on('offers', function (data) {
    // send offers to everyone in a given room
    Object.keys(connectedClients).forEach(function (clientId, i) {
      var client = clients[clientId]
      if (client !== socket) {
        var offerObj = data.offers[i]
        var emittedOffer = {fromPeerId: socket.id, offerId: offerObj.offerId, offer: offerObj.offer}
        debug('Emitting offer: %s', JSON.stringify(emittedOffer))
        client.emit('offer', emittedOffer)
      }
    })
  })

  socket.on('peer-signal', function (data) {
    var toPeerId = data.toPeerId
    debug('Signal peer id %s', toPeerId);
    var client = clients[toPeerId]
    client.emit('peer-signal', data)
  })
  typeof next === 'function' && next()
}
