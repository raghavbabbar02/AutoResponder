import "isomorphic-fetch";
import { delay, logger } from "../utils";
import { getAuthenticatedClient, processEmails } from "../utils/outlook";
import { delayBetweenRequests } from "../constants/others";

async function startService() {
  const client = await getAuthenticatedClient();

  const user = await client.api("/me").get();
  logger.info(`[OUTLOOK] User: ${user.mail}`);

  try {
    while (true) {
      await processEmails();

      await delay(delayBetweenRequests);
    }
  } catch (error) {
    logger.error(`[OUTLOOK] ${error}`);
  }
}

export { startService };
