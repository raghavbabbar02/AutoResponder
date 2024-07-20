import logger from "./logger";

function delay(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

function getMessageContent(message: string): string {
  const entities: { [key: string]: string } = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&lt;": "<",
    "&gt;": ">",
  };

  message.replace(/&[a-zA-Z0-9#]+;/g, (entity) => entities[entity] || entity);

  let content: string = "",
    openBrackets = 0;

  for (let i = 0; i < message.length; i++) {
    if (message[i] === "<") {
      openBrackets++;
    } else if (message[i] === ">") {
      openBrackets--;
    } else if (openBrackets === 0) {
      content += message[i];
    }
  }

  logger.debug(`[OUTLOOK] Message content: ${content}`);

  return content;
}

export { delay, getMessageContent };
