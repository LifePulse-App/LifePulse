export default function registerARSocket(io, socket) {

  socket.join("ar-global-portal");

  socket.on("join-ar-private-portal", (portalId) => {

    socket.join(`ar-private-portal:${portalId}`);

  });

}