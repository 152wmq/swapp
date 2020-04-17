const { exec } = require("child_process");
const ora = require("ora");
const chalk = require("chalk");
const inquirer = require("inquirer");

let localSettingsFile = null;

const spinner = ora("Loading");

async function main() {
  try {
    localSettingsFile = require("./local.settings.json");

    // read the file for settings
    let settings = { properties: localSettingsFile.Values };

    // make sure settings exist before we try anything else
    if (localSettingsFile.Values) {
      console.log(`${chalk.green("✔︎")} Found local.settings.json file...`);

      // list out all available subscriptions for user to pick from
      spinner.text =
        "Checking to see what Azure Subscriptions you have available...";
      spinner.start();

      let result = await inquirer.prompt([
        {
          type: "list",
          name: "subscription",
          message: "Select a subscription",
          choices: await getSubscriptions(spinner),
        },
        {
          type: "input",
          name: "resourceGroup",
          message: "Enter the resource group name:",
        },
        {
          type: "input",
          name: "appName",
          message: "Enter the name of your Static App:",
        },
        {
          type: "confirm",
          name: "confirm",
          message: (answers) => {
            return `You are about to upload your local application settings to "${answers.appName}". This will overwrite any settings that you have. It will not delete any settings. Are you sure you want to continue?`;
          },
        },
      ]);

      if (result.confirm) {
        // upload to static app
        spinner.text = "Uploading local.settings.json...";
        spinner.start();

        await uploadSettings(
          result.subscription,
          result.resourceGroup,
          result.appName,
          settings
        );

        spinner.stop();

        console.log(`${chalk.green("✔︎")} Settings successfully uploaded`);
      }
    } else {
      console.log(
        "Could not find a local.settings.json file in the current directory"
      );
    }
  } catch (err) {
    console.log(err);
  }
}

async function getSubscriptions(spinner) {
  return new Promise((resolve, reject) => {
    exec("az account list -o json", (error, stdout, stdin) => {
      if (error) reject(error);

      const result = JSON.parse(stdout);

      const subscriptions = result.map((item) => {
        return { name: item.name, value: item.id };
      });

      spinner.stop();

      resolve(subscriptions);
    });
  });
}

// async function getResourceGroups(subscription) {
//   return new Promise((resolve, reject) => {
//     exec(
//       `az group list --subscription ${subscription} -o json`,
//       (error, stdout, stdin) => {
//         if (error) reject(error);

//         const result = JSON.parse(stdout);

//         resolve(result);
//       }
//     );
//   });
// }

async function uploadSettings(
  subscription,
  resourceGroup,
  staticSite,
  settings
) {
  return new Promise((resolve, reject) => {
    let cmd = `az rest --method put --headers "Content-Type=application/json" --uri "/subscriptions/${subscription}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/staticSites/${staticSite}/config/functionappsettings?api-version=2019-12-01-preview" --body "${JSON.stringify(
      settings
    )
      .split('"')
      .join('\\"')}"`;

    exec(cmd, (error, stdout, stdin) => {
      if (error) reject(error);

      const result = JSON.parse(stdout);

      resolve(result);
    });
  });
}

main();
