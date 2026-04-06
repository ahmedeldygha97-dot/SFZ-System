import { app } from "./app.js";
import { env } from "./config/env.js";
import { startSchedulers } from "./services/schedulerService.js";
import { ensureDefaultAdmin } from "./utils/bootstrap.js";

const port = env.port;

async function start() {
  await ensureDefaultAdmin();
  startSchedulers();

  app.listen(port, "0.0.0.0", () => {
    console.log(`SFZ System API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start the server:", error);
  process.exit(1);
});
