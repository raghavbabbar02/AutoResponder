import { gmail_v1, google } from "googleapis";

import {
  createLabelIfNotExists,
  getUser,
  getMessages,
  getMessageData,
  extractMessageContent,
  pushEmailToQueue,
} from "../utils/gmail";
import { getGoogleClient } from "../auth/gmail.js";
import { labelCategories } from "../constants/emailConfig";
import logger from "../utils/logger.js";
import { delay } from "../utils";
import { delayBetweenRequests, emailProviders } from "../constants/others";
import { generateLabelAndReply } from "./openai";

async function reply(gmail: gmail_v1.Gmail, labels: gmail_v1.Schema$Label[]) {
  const messages = await getMessages(gmail);

  if (!messages) {
    logger.info("[GOOGLE] No messages found");
    return;
  }

  for (const message of messages) {
    const messageData = await getMessageData(gmail, message.id);

    if (!messageData) {
      logger.info("[GOOGLE] Message data not found");
      continue;
    }

    const messageContent = extractMessageContent(messageData);

    // getReplyData should return { label, reply }
    const replyData = await generateLabelAndReply(messageContent);

    let label = labels[3];
    for (let i = 0; i < labelCategories.length; i++) {
      if (replyData[0] === labelCategories[i]) {
        label = labels[i];
        break;
      }
    }

    await pushEmailToQueue(messageData, label, replyData[1]);
  }
}

async function startService() {
  logger.info("Starting autoresponder service...");
  try {
    const gmailClient = await getGoogleClient();

    // get the user email just to check if the user exists
    const user = await getUser(gmailClient);

    if (!user) {
      logger.info("[GOOGLE] User not found");
      throw new Error("[GOOGLE] User not found");
    }

    logger.info(`[GOOGLE] User: ${user}`);

    // create the label if it doesn't exist already
    const labelPromises = labelCategories.map((label) =>
      createLabelIfNotExists(gmailClient, label)
    );

    let labels: gmail_v1.Schema$Label[] | null = null;
    try {
      labels = await Promise.all(labelPromises);
    } catch (error) {
      logger.error("[GOOGLE] Error creating all the labels");
      throw error;
    }

    logger.debug(`[GOOGLE] ${JSON.stringify(labels, null, 2)}`);

    while (true) {
      // Reply to new threads
      await reply(gmailClient, labels);

      // Introduce a random delay
      await delay(delayBetweenRequests);
    }
  } catch (err) {
    logger.error("[GOOGLE] Error starting autoresponder service...");
    logger.error(err);
  }
}

export { startService };
