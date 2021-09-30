# Tools
You'll need coffescriptnpm install -g coffee-script
`npm install -g coffee-script`

# Tests
There are none at the moment.

# Compiling
You can run `cake compile` to generate the /dist folder with the final psd.js file.

# Generating docs
You can run `cake docs:generate` to generate the docs folder with the documentation shown on the [githup pages site](https://meltingice.github.io/psd.js/).
NOTE: Current generating the docs seems throw a `ERR_INVALID_CALLBACK(callback);`. 

# Run the examples
You can run the examples with the `npm run local-dev` command. This will spin up a local server where you can drag and drop filetypes and test functionality. You'll need `webpack`, `webpack-dev-server`, and `webpack-cli` for it to work. Make sure you check the file types before make a pull request to test that things are still working correctly.

# Publish updates
1. Merge all the commits that are expected to be in the release
2. Locally, `git pull` the latest changes
3. Locally, run `npm version <major|minor|patch>` with the appropriate semantic versioning param for the published update.
4. Locally, `git push --tags`
5. In GitHub, go to releases, and click on the new tag
6. Add the description with all the commits that are part of the release
7. Save
8. Locally, run `npm publish`
9. Voila 🎉