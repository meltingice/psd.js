# Tools
You'll need coffescriptnpm install -g coffee-script
`npm install -g coffee-script`

# Publishing
In order to publish you'll need to be a *contributor* on GitHub as well as a *collaborator* on NPM.

1. Create any PR's you'd like to see added to the release and have them merged in by yourself or a contributor.
2. Once all PR's are merged, pull master down locally and run `npm version <type>`. Type will be either `major`, `minor`, or `patch` depending on the type of release we want to do. You can refer to [semantic versioning](https://semver.org/) docs to help with determining which type makes the most sense.
3. After this is done, you'll find that a tag was created locally, with an updated `package.json` version as well as a correctly titled tag. You can now `npm push --tags` to push up the new tag as well as the code. 
4. You'll want to go into the [tags](https://github.com/meltingice/psd.js/tags) section in GitHub and edit the latest tag. We want to click the _edit tag_ and then click the _auto-generate release notes_ to generate the notes based on all commits added.
5. Save as a draft.
6. Review the release
7. On the releases page click _make public_ on the new draft. And voila! We're published in GitHub.
8. Now to publish on NPM, we need to go back locally and run the `npm publish` command from an account that is a collaborator in NPM.
9. Done! 🙌🏾 🎉
# Tests
There are none at the moment.

# Compiling
You can run `cake compile` to generate the /dist folder with the final psd.js file.

# Generating docs
You can run `cake docs:generate` to generate the docs folder with the documentation shown on the [githup pages site](https://meltingice.github.io/psd.js/).
NOTE: Current generating the docs seems throw a `ERR_INVALID_CALLBACK(callback);`. 

# Run the examples
You can run the examples with the `npm run local-dev` command. This will spin up a local server where you can drag and drop filetypes and test functionality. You'll need `webpack`, `webpack-dev-server`, and `webpack-cli` for it to work. Make sure you check the file types before make a pull request to test that things are still working correctly.