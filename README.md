# Instructions

- Clone the repository to local machine
- Download the credentials from the Google Cloud console by following the instructions here: https://developers.google.com/gmail/api/quickstart/nodejs and save them in the root of the application. It should look something like this

```JSON
{
  "installed": {
    "client_id": "",
    "project_id": "",
    "auth_uri": "",
    "token_uri": "",
    "auth_provider_x509_cert_url": "",
    "client_secret": "",
    "redirect_uris": [""]
  }
}
```

- Similarly setup an Azure app registration in the Azure cloud and save the credentials here

```JSON
{
  "clientId": "",
  "tenantId": "",
  "clientSecret": "",
  "redirectUri": ""
}
```

- Create a .env file in the root of the project and add ```OPENAI_API_KEY``` that you need to create from the openai website

- Run `npm run autoreply`
- Login to your Google account
- Enjoy your vacations!
