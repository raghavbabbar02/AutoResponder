export const delayBetweenRequests = 10 * 1000;

export enum emailProviders {
  GMAIL = "gmail",
  OUTLOOK = "outlook",
}

export const prompt = `
### Task:
1. Categorize the email content into one of the following labels:
   - Interested
   - Not Interested
   - More Information

2. Based on the label, generate an appropriate response. 

### Rules:
If the client is interested, label "Interested" and suggest a demo call; if not interested, label "Not Interested" and acknowledge their decision; if they want more info, label "More Information" and provide details with a follow-up call suggestion.

You just have to return a line, where the assigned label and reply should be seperated by underscore(_). Take a look at the other examples. Do not include more than one underscore in the output. The reply should be a single sentence. Make sure to greet the sender first and appreciate them taking out the time to respond back and then add the business statement.

Input: 


`;
