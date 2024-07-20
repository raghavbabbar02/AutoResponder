import dotenv from "dotenv";
dotenv.config();

import { startService as gmailService } from "./src/services/gmailAutoresponder.js";
import { startService as outlookService } from "./src/services/outlookAutoresponder.js";
import logger from "./src/utils/logger.js";
import { authorize as outlookAuthorise } from "./src/auth/outlook.js";
import { authorize as googleAuthorise } from "./src/auth/gmail.js";

async function initAuthorisation() {
  await googleAuthorise();
  await outlookAuthorise();
}

initAuthorisation()
  .then(() => {
    gmailService();
    outlookService();
  })
  .catch((error) => {
    logger.error(error);
    logger.error("Error starting the services. Exiting...");
  });
