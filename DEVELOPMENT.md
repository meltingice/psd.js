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