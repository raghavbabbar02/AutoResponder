import dotenv from "dotenv";
dotenv.config();
import {
  AuthProvider,
  AuthProviderCallback,
  Client,
  Options,
} from "@microsoft/microsoft-graph-client";
import { authorize } from "../auth/outlook";
import { getMessageContent } from "./utility";
import { generateLabelAndReply } from "../services/openai";
import { EmailQueue } from "../configs/bullmq";
import { OutlookMessage } from "./types/outlook";
import logger from "./logger";

async function getAuthenticatedClient() {
  const credentials = await authorize();

  // Some callback function
  const authProvider: AuthProvider = (callback: AuthProviderCallback) => {
    if (!credentials || !credentials.accessToken) {
      callback(new Error("Failed to retrieve access token"), null);
    } else {
      callback(null, credentials.accessToken);
    }
  };
  let options: Options = {
    authProvider,
  };
  const client = Client.init(options);

  return client;
}

async function getUnreadEmails() {
  const client = await getAuthenticatedClient();

  // Gets emails received in the last 2 minutes
  const timeBeforeDelay = new Date(
    Date.now() - 100000 * 60 * 1000
  ).toISOString();

  const messages = await client
    .api("/me/messages")
    .filter(`isRead eq false and receivedDateTime ge ${timeBeforeDelay}`)
    .get();

  logger.debug(
    `[OUTLOOK] Messages: ${JSON.stringify(messages.value, null, 2)}`
  );

  return messages?.value || [];
}

async function processEmails() {
  logger.debug("[OUTLOOK] Fetching unread emails");
  const emails = await getUnreadEmails();

  logger.info(`[OUTLOOK] Found ${emails.length} unread emails`);

  let emailCount: number = 0;
  for (const email of emails) {
    const emailContent = getMessageContent(email.body.content);
    const replyData = await generateLabelAndReply(emailContent);

    const outlookEmailPayload: OutlookMessage = {
      messageId: email.id,
      to: email.sender.emailAddress.address,
      label: replyData[0],
      reply: replyData[1],
    };

    logger.info(`[OUTLOOK] Pushing email ${emailCount} to queue`);
    await EmailQueue.add("sendOutlook", outlookEmailPayload);
    emailCount++;
  }
}

async function updateEmailStatus(client: Client, messageId: string) {
  try {
    await client.api(`/me/messages/${messageId}`).update({ isRead: true });
    logger.debug(`Email status updated for message: ${messageId}`);
  } catch (error) {
    logger.error(`Error updating email status to READ: ${error}`);
  }
}

async function send(message: OutlookMessage) {
  const client = await getAuthenticatedClient();

  logger.debug(JSON.stringify(message));

  const email = {
    message: {
      toRecipients: [
        {
          emailAddress: {
            address: message.to,
          },
        },
      ],
    },
    comment: message.reply,
  };

  try {
    await client.api(`/me/messages/${message.messageId}/reply`).post(email);
    logger.info(`[OUTLOOK] Email sent successfully`);
    updateEmailStatus(client, message.messageId);
  } catch (error) {
    console.error(`Error sending email: ${error}`);
  }
}

export { send, processEmails, getAuthenticatedClient };
