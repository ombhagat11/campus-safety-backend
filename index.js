import httpServer from "./src/app.js";

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`✔ Server running at http://localhost:${PORT}`);
  console.log(`✔ Socket.io ready for real-time connections`);
});
