import { Queue, Worker } from "bullmq";
import { logger } from "../utils";
import { GmailMessage } from "../utils/types/google";
import { send as GmailSend } from "../utils/gmail";
import { OutlookMessage } from "../utils/types/outlook";
import { send as OutlookSend } from "../utils/outlook";

const redisOptions = {
  host: "localhost",
  port: 6379,
};

const EmailQueue = new Queue("queue12345", { connection: redisOptions });

const EmailWorker = new Worker(
  "queue12345",
  async (job) => {
    logger.debug(`Processing job ${job.id}`);
    logger.debug(`Job data ${JSON.stringify(job.data)}`);

    if (job.name === "sendGmail") {
      const emailData: GmailMessage = job.data;

      if (emailData.label.name === "Human Intervention Required") return;
      await GmailSend(emailData);
    } else if (job.name === "sendOutlook") {
      const emailData: OutlookMessage = job.data;

      if (emailData.label === "Human Intervention Required") return;
      await OutlookSend(emailData);
    } else {
      logger.error(`Unknown job name ${job.name}`);
    }
  },
  { connection: redisOptions }
);

process.on("SIGTERM", async () => {
  await EmailWorker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await EmailWorker.close();
  process.exit(0);
});

export { EmailQueue, EmailWorker };
