//socket.io client testing

import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";
const roomId = "<room_id>"; // Chill Vibes room

const users = [
  { id: "<user_id>", name: "mohini_joshi" },
  { id: "<user_id>", name: "kajol" },
  { id: "<user_id>", name: "rahul" }
];

users.forEach((user, index) => {
  const socket = io(SERVER_URL);

  socket.on("connect", () => {
    console.log(`✅ [${user.name}] Connected`);

    // Join room
    socket.emit("join_room", roomId);
    console.log(`🚪 [${user.name}] Joined room`);

    // Listen for messages
    socket.on("receive_message", (msg) => {
      console.log(`📨 [${user.name}] Received message:`, msg);
    });

    // User 1 sends a message after 2 seconds
    if (index === 0) {
      setTimeout(() => {
        socket.emit("send_message", {
          roomId,
          userId: user.id,
          content: `Hello from ${user.name}!`
        });
      }, 2000);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ [${user.name}] Disconnected`);
  });
});