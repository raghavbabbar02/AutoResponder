import { gmail_v1 } from "googleapis";
import logger from "./logger.js";
import { GmailMessage, RequiredEmailHeaders } from "./types/google.js";
import { getGoogleClient } from "../auth/gmail.js";
import { EmailQueue } from "../configs/bullmq.js";
import { getExcludeQuery } from "../constants/emailConfig.js";

// to get the data of the user
async function getUser(gmail: gmail_v1.Gmail): Promise<string> {
  const res = await gmail.users.getProfile({
    userId: "me",
  });

  return res.data.emailAddress || "";
}

// to check if label with the given name exists or not
async function findLabel(
  gmail: gmail_v1.Gmail,
  labelName: string
): Promise<gmail_v1.Schema$Label> | null {
  const res = await gmail.users.labels.list({
    userId: "me",
  });

  logger.debug(`[GOOGLE] Labels: ${JSON.stringify(res.data, null, 2)}`);

  const labelsList = res.data.labels || [];

  let label = labelsList.find(
    (label) => label.name?.toLowerCase() === labelName.toLowerCase()
  );

  return label || null;
}

// to create a label if it not exists yet
async function createLabelIfNotExists(
  gmail: gmail_v1.Gmail,
  labelName: string
): Promise<gmail_v1.Schema$Label> | null {
  let label = await findLabel(gmail, labelName);

  if (!label) {
    logger.debug(`[GOOGLE] Label "${labelName}" not found`);

    const res = await gmail.users.labels.create({
      userId: "me",
      requestBody: {
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
        name: labelName,
      },
    });

    label = res.data;
    logger.debug(`[GOOGLE] Created label "${labelName}"`);
  } else {
    logger.debug(`[GOOGLE] Label "${labelName}" already present`);
  }

  return label;
}

async function getMessages(
  gmail: gmail_v1.Gmail
): Promise<gmail_v1.Schema$Message[]> | null {
  const timeBeforeDelay = Math.floor(
    Number(new Date(Date.now() - 100 * 60 * 1000)) / 1000
  );

  let messages: gmail_v1.Schema$Message[] | null = null;

  try {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: `is:unread after:${timeBeforeDelay}` + getExcludeQuery(),
    });

    messages = res.data.messages || null;

    logger.debug(`[GOOGLE] Messages: ${JSON.stringify(messages, null, 2)}`);
  } catch (error) {
    logger.error(`[GOOGLE] Error fetching messages: ${error}`);
    throw error;
  }

  return messages;
}

async function getMessageData(
  gmail: gmail_v1.Gmail,
  id: string
): Promise<gmail_v1.Schema$Message> | null {
  let messageData: gmail_v1.Schema$Message | null = null;

  try {
    const res = await gmail.users.messages.get({
      userId: "me",
      id,
    });

    messageData = res.data;

    logger.debug(
      `[GOOGLE] Message data: ${JSON.stringify(messageData, null, 2)}`
    );
  } catch (error) {
    logger.error(`[GOOGLE] Error fetching message data: ${error}`);
    throw error;
  }

  return messageData;
}

// to get the important headers like From, Subject and Message-ID which are used to reply to the same conversation
function getRequiredHeaders(
  headers: gmail_v1.Schema$MessagePartHeader[]
): RequiredEmailHeaders {
  logger.debug(`[GOOGLE] Headers: ${JSON.stringify(headers)}`);
  let requiredHeaders: RequiredEmailHeaders = {};

  for (const header of headers) {
    if (header.name === "From") {
      requiredHeaders["sender"] = header.value;
    } else if (header.name === "Subject") {
      requiredHeaders["subject"] = header.value;
    } else if (header.name === "Message-ID") {
      requiredHeaders["messageId"] = header.value;
    }
  }

  return requiredHeaders;
}

// to update the thread with the given label
async function addLabelToMessage(
  gmail: gmail_v1.Gmail,
  label: gmail_v1.Schema$Label,
  threadId: string
) {
  logger.debug(
    `[GOOGLE] Label: ${JSON.stringify({ label, threadId }, null, 2)}`
  );

  try {
    await gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: {
        addLabelIds: [label.id],
      },
    });
    logger.debug(`[GOOGLE] Label ${label.name} added to message`);
  } catch (error) {
    logger.error(`[GOOGLE] Error adding label to message: ${error}`);
    throw error;
  }
}

// To send an email
async function pushEmailToQueue(
  message: gmail_v1.Schema$Message,
  label: gmail_v1.Schema$Label,
  emailContent: string
) {
  logger.debug(
    `[GOOGLE] Email content: ${JSON.stringify({
      message,
      label,
      emailContent,
    })}`
  );

  const { sender, subject, messageId } = getRequiredHeaders(
    message?.payload?.headers
  );

  const email =
    `To: ${sender}\n` +
    `Subject: ${subject}\n` +
    `In-Reply-To: ${messageId}\n` +
    `References: ${messageId}\n` +
    `\n` +
    `${emailContent}`;

  logger.debug(`[GOOGLE] Email to send: ${email}`);

  const encodedEmail = Buffer.from(email).toString("base64");

  const messageToSend = {
    threadId: message.threadId,
    raw: encodedEmail,
  };

  const queuePayload: GmailMessage = {
    message: messageToSend,
    messageId: message.id,
    label,
  };

  try {
    await EmailQueue.add("sendGmail", queuePayload);
    logger.info(`[GOOGLE] Email added to queue for sending`);
  } catch (error) {
    logger.error(`[GOOGLE] Error adding email to queue: ${error}`);
    throw error;
  }
}

async function send(messageData: GmailMessage) {
  logger.debug(JSON.stringify(messageData));

  const gmail: gmail_v1.Gmail = await getGoogleClient();

  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: messageData.message,
    });

    logger.info(`[GOOGLE] Email sent successfully`);
  } catch (error) {
    logger.error(`[GOOGLE] Error sending email: ${error}`);
    throw error;
  }

  try {
    await addLabelToMessage(gmail, messageData.label, messageData.messageId);
    logger.debug(`[GOOGLE] Thread updated successfully`);
  } catch (error) {
    logger.error(`[GOOGLE] Error updating thread: ${error}`);
    throw error;
  }
}

// Function to decode Base64 encoded data
function decodeBase64(data: string): string {
  return Buffer.from(data, "base64").toString("utf-8");
}

// Function to extract and decode message parts
function extractMessageContent(message: gmail_v1.Schema$Message): string {
  const parts = message.payload?.parts || [];

  let plainText = "";

  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body && part.body.data) {
      const decodedText = decodeBase64(part.body.data);
      plainText += decodedText + " ";
    }
  }

  logger.debug(`[GOOGLE] Extracted message content: ${plainText.trim()}`);

  return plainText.trim();
}

export {
  getUser,
  getMessageData,
  createLabelIfNotExists,
  pushEmailToQueue,
  send,
  getMessages,
  extractMessageContent,
  addLabelToMessage,
};
