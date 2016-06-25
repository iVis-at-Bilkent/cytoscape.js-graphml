cytoscape-graphml
================================================================================

## Description

Import or export the graph in GraphML format.


## API

`cy.graphml()`
Export the graph as GraphML.

`cy.graphml( cyGraphML )`
Import the graph as GraphML.

`cy.graphml( optionsObj )`
Updates the specified options of extension.


## Dependencies

 * Cytoscape.js ^2.0
 * jQuery ^1.4 || ^2.0 || ^3.0
 

## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-graphml`,
 * via bower: `bower install cytoscape-graphml`, or
 * via direct download in the repository (probably from a tag).

`require()` the library as appropriate for your project:

CommonJS:
```js
var cytoscape = require('cytoscape');
var graphml = require('cytoscape-graphml');

graphml( cytoscape ); // register extension
```

AMD:
```js
require(['cytoscape', 'cytoscape-graphml'], function( cytoscape, graphml ){
  graphml( cytoscape ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Set the version number environment variable: `export VERSION=1.2.3`
1. Publish: `gulp publish`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-graphml https://github.com/iVis-at-Bilkent/cytoscape.js-graphml.git`
