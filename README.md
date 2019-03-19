# Auto deployment tool
## What it does
This tool will check the configured git repository for changes on remote for the branch you can also configure. If there are changes it will pull them and then run the build and deployment script that you specified.

## Features
- use environment variables
- trigger by cron schedule
- trigger by http server endpoint
- send email for confirmation or error
- detailed logs
- run as CLI or from node_modules
- create config file template via cli
- specify config file to be used
- specify working directory
- specify a build shell script
- specify a deploy shell script
- full typescript support

## Getting started
### Global install (recommended)
1. install: `npm install -g sb-self-deployment-tool`
2. create config: `sb-deploy-tool -i` OR `sb-deploy-tool --init` OR `sb-deploy-tool -i my.config.json` OR `sb-deploy-tool --init my.config.json`
3. change the config to your needs (if not specified otherwise there will be a config.json)
4. Run: `sb-deploy-tool` to use config.json. To specify the config file: `sb-deploy-tool -c my.config.json` OR `sb-deploy-tool --config my.config.json`
### Use as dependency
1. install: `npm install --save sb-self-deployment-tool`
2. import: `const Runner = require('sb-self-deployment-tool')` OR TypeScript: `import {Runner} from 'sb-self-deployment-tool'`
3. use:
- create a runner: `const runner = new Runner();`
- you can set a custom transport for mail: `runner.setupMailTransport(transport?: nodemailer.Transport); // see nodemailer docs for details`
- start runner with config: `runner.runFromConfig('./config.json');`
## Config Parameters
```
{
  "workDir": ".", // optional, default: "." the directory where the tool should work in and where the git is
  "git": {
    "repository": "git@github.com:sittingbool/sb-self-deployment-tool.git", // make sure to use the output of git remote show origin
    "branch": "develop" // the branch to watch for changes
  },
  "trigger": { // how should the deplyoment be triggered
    "cron": "*/30 * * * * *", // optional, a standard cron schedule, for details check node-cron on npm, if this is not set there will be no cron job running
    "webInterface": { // optional, if set this will create a http web server
      "port": 3000, // the port the server should listen on
      "endpoint": "/trigger", // the endpoint the server should be called for triggering, everything else will return 404. Tipp: to secure this use a cryptic endpoint
      "excludeEnvironments": ["production"] // you can set this to exclude starting a server on certain environments
    }
  },
  "email": { // optional, if set success and error emails will be sent
    "sender": "sittingbool@gmx.de", // the email shown in the From: field
    "recipients": ["some.admin@domain.com"], // a list of people to receive the emails
    "transport": { // the smtp configuration as used in nodemailer, check nodemailer for details
      "host": "smtp.ethereal.email",
      "port": 465,
      "secure": true,
      "auth": {
        "user": "account.user",
        "pass": "account.pass"
      }
    }
  },
  "envVar": "NODE_ENV", // this will set the variable on process.env to check for the environment
  "buildCmd": "echo 'build would be here'", // this will be run at build time if set
  "deployCmd": "echo 'deployment would be here'" // this will be run at deployment time if set
}
```
#Licence
MIT
