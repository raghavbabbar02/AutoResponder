import { promises as fs } from "fs";
import http from "http";
import url from "url";
import path from "path";
import {
  AuthenticationResult,
  ConfidentialClientApplication,
} from "@azure/msal-node";
import credentials from "../../credentials/outlook_credentials.json";
import { logger } from "../utils";
import { Credentials } from "../utils/types/outlook";

const scopes = ["user.read", "Mail.ReadWrite", "Mail.Send"];
const TOKEN_PATH = path.join(process.cwd(), "tokens", "outlook_token.json");

const ccaConfig = {
  auth: {
    clientId: credentials.clientId,
    authority: `https://login.microsoftonline.com/common`,
    clientSecret: credentials.clientSecret,
  },
};

const cca = new ConfidentialClientApplication(ccaConfig);

async function loadSavedCredentialsIfExist(): Promise<Credentials> | null {
  try {
    const content = await fs.readFile(TOKEN_PATH, "utf-8");
    const tokenData = await JSON.parse(content);

    if (tokenData.expiresAt < Date.now()) {
      return null;
    }

    return tokenData;
  } catch (error) {
    return null;
  }
}

async function saveCredentials(
  tokenResponse: AuthenticationResult
): Promise<Credentials> | null {
  logger.info("Saving Outlook credentials");

  const tokenData: Credentials = {
    accessToken: tokenResponse.accessToken,
    expiresAt: tokenResponse.expiresOn.getTime(),
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    tenantId: credentials.tenantId,
  };

  try {
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokenData));
    logger.info("Outlook credentials saved successfully");

    return tokenData;
  } catch (error) {
    logger.error("Error saving outlook credentials", error);
    throw error;
  }
}

async function authorize() {
  try {
    let outlookCredentials: Credentials = await loadSavedCredentialsIfExist();

    if (outlookCredentials) {
      return outlookCredentials;
    }

    const authCodeUrlParameters = {
      scopes,
      redirectUri: credentials.redirectUri,
    };

    const authCodeUrl = await cca.getAuthCodeUrl(authCodeUrlParameters);

    logger.info(authCodeUrl);
    logger.info("Click on the URL to get the auth code");

    const server = http.createServer(async (req, res) => {
      if (req.url.startsWith("/callback")) {
        const qs = new url.URL(req.url, "http://localhost:3000").searchParams;
        const authCode = qs.get("code");

        if (authCode) {
          res.end("Authentication successful! You can close this window.");

          const tokenRequest = {
            clientId: credentials.clientId,
            code: authCode,
            scopes,
            redirectUri: credentials.redirectUri,
            clientSecret: credentials.clientSecret,
          };

          try {
            const tokenResponse = await cca.acquireTokenByCode(tokenRequest);
            outlookCredentials = await saveCredentials(tokenResponse);
            server.close(() => logger.debug("Server closed"));
          } catch (error) {
            logger.error(error);
            res.end("Error acquiring token");
            server.close(() => logger.debug("Server closed"));
          }
        } else {
          res.end("Authentication failed");
          server.close(() => logger.debug("Server closed"));
        }
      }
    });

    server.listen(3000, () => {
      console.log(
        "Listening on http://localhost:3000/callback for the auth code"
      );
    });

    await new Promise((resolve) => {
      server.on("close", resolve);
      server.on("close", () => logger.debug("Server closed"));
    });

    return outlookCredentials;
  } catch (error) {
    logger.error(error);
    logger.error("Error during the authorization process");
  }
}

export { authorize };
