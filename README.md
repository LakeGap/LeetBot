#Leetbot

We can establish a coding group and trace your Leetbot record with Leetbot.

All conversion is based on Slack.

### Prereq

Our program should always be running so we strongly recommend that all the following operation should be done on a cloud machine(e.g. AWS EC2).

Install code.

```bash
git clone https://github.com/LakeGap/LeetBot.git
cd LeetBot
npm install
```

1. [Create a new slack team](https://slack.com).


2. Create a bot team member. Click [/services/new/bot](https://my.slack.com/services/new/bot). For more information about bot-users, see [documentation](https://api.slack.com/bot-users).

3. Copy slack bot token.

4. Update environment variables.
5. 
   In windows, just run:
   
   ```
   setx LEETBOT_KEY "<slackbot-token>"
   # You will then need to close the cmd window and reopen.
   ```
   In other systems, we can set them in your shell, like in `.bash_profile`:
   
   ```
   # Edit .bash_profile to have:
   export LEETBOT_KEY ="<slackbot-token>"
   # Then reload
   $ source ~/.bash_profile
   ```
   
###Running the bot
Run the command:	

```
./start.sh
```

And we can expect conversations like following ones:
![](./img/myname.png)
![](./img/hi.png)
![](./img/signup.png)
![](./img/update.png)
![](./img/whoami.png)
![](./img/whoareu.png)

