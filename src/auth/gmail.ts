import { promises as fs } from "fs";
import process from "process";
import path from "path";

import { authenticate } from "@google-cloud/local-auth";
import { google, Auth } from "googleapis";
import { logger } from "../utils";
import { GoogleTypes } from "../utils/types";

const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];

const CREDENTIALS_PATH = path.join(
  process.cwd(),
  "credentials",
  "google_credentials.json"
);
const TOKEN_PATH = path.join(process.cwd(), "tokens", "google_token.json");

async function loadSavedCredentialsIfExist(): Promise<Auth.OAuth2Client> | null {
  try {
    const content: string = await fs.readFile(TOKEN_PATH, "utf-8");
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials) as Auth.OAuth2Client;
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client: Auth.OAuth2Client) {
  let key: GoogleTypes.Credentials | null = null;

  try {
    const content = await fs.readFile(CREDENTIALS_PATH, "utf-8");
    const keys = JSON.parse(content);

    if (!(keys.installed || keys.web)) {
      throw new Error("Error reading google credentials");
    }

    key = keys.installed || keys.web;
  } catch (error) {
    logger.error("Error reading google credentials", error);
    throw error;
  }

  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });

  try {
    await fs.writeFile(TOKEN_PATH, payload);
    logger.info("Google credentials saved successfully");
  } catch (error) {
    logger.error("Error saving google credentials", error);
    throw error;
  }
}

async function authorize() {
  let client: Auth.OAuth2Client | null = await loadSavedCredentialsIfExist();

  if (client) {
    logger.debug("Using saved google credentials");
    return client;
  }

  logger.info("No saved google credentials found, authenticating...");

  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (client.credentials) {
    logger.info("Saving google credentials...");
    await saveCredentials(client);
  }

  return client;
}

async function getGoogleClient() {
  // authorize the user and get the oauth client
  const auth = await authorize();

  // instantiate the gmail client using the oauth client
  const gmailClient = google.gmail({ version: "v1", auth });

  return gmailClient;
}

export { getGoogleClient, authorize };
