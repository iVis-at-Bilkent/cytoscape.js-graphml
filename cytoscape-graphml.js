(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

module.exports = function (cy, $, options) {

  function xmlToString(xmlData) {

    var xmlString;
    //IE
    if (window.ActiveXObject) {
      xmlString = xmlData.xml;
    }
    // code for Mozilla, Firefox, Opera, etc.
    else {
      xmlString = (new XMLSerializer()).serializeToString(xmlData);
    }
    return xmlString;
  }


  function getEleData(ele) {
    var type = ele.isNode() ? "node" : "edge";
    var attrs = ["css", "data", "position"];
    var result = {};

    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      var opt = options[type][attr];
      if (!opt)
        result[attr] = {};
      else if ($.isArray(opt)) {
        result[attr] = {};
        for (var j = 0; j < opt.length; j++){
          var el = opt[i];
          if (ele[attr](el))
            result[attr][el] = ele[attr](el);
        }
      } else{
        var eleAttr = ele[attr]();
        result[attr] = {};
        for (var key in eleAttr)
          if($.inArray(key, options[type].discludeds) < 0)
            result[attr][key] = { value: eleAttr[key], attrType: attr };

      }
    }

    return $.extend(result.css, result.data, result.position);
  }


  function parseNode(ele) {
    var node = '<node id="' + ele.id() + '">';

    var eleData = getEleData(ele);
    for (var key in eleData)
      node += '<data type="' + eleData[key].attrType + '" key="' + key + '">' + eleData[key].value + '</data>';


    if (ele.isParent()) {
      node += '<graph id="' + ele.id() + ':">';
      ele.children().each(function (i, child) {
        node += parseNode(child);
      });
      node += '</graph>'
    }

    node += '</node>';
    return node;
  }


  options.node.discludeds.push("id");
  options.edge.discludeds.push("id", "source", "target");

  var xmlDoc = $.parseXML(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"\n' +
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' +
    'xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns\n' +
    'http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n' +
    '  <graph>\n' +
    ' </graph>\n' +
    ' </graphml>\n'
  );
  var $xml = $(xmlDoc);

  var $graph = $xml.find("graph");

  cy.nodes().orphans().forEach(function (ele) {
    $graph.append(parseNode(ele));
  });

  cy.edges().forEach(function (ele) {

    var edge = '<edge id="' + ele.id() + '" source="' + ele.source().id() + '"' + ' target="' + ele.target().id() + '" >';

    var eleData = getEleData(ele);
    for (var key in eleData)
      edge += '<data key="' + key + '">' + eleData[key] + '</data>';

    edge += '</edge>';

    $graph.append(edge);

  });


  return xmlToString(xmlDoc);
};
},{}],2:[function(require,module,exports){
module.exports = function(cy, $, options, cyGraphML) {
    function renderNode($graph){
        $graph.find("node").each(function () {
            var $node = $(this);
            
            var settings = {
                data: {id: $node.attr("id")},
                css: {},
                position: {}
            };

            $node.find('data').each(function () {
                var $data = $(this);

                settings[$data.attr("type")][$data.attr("key")] = $data.text();

            });

            cy.add({
                group: "nodes",
                data: settings.data,
                css: settings.css,
                position: settings.position
            });

            $node.find("graph").each(function () {
                var $graph = $(this);

                renderNode($graph);
            })
        });
    }

    cy.batch(function () {
        xml = $.parseXML(cyGraphML);
        $xml = $(xml);

        $graphs = $xml.find("graph");

        var collection = cy.collection();

        $graphs.each(function () {
            var $graph = $(this);

            renderNode($graph);

            $graph.find("edge").each(function () {
                var $edge = $(this);

                var settings = {
                    data: {id: $edge.attr("id"), source: $edge.attr("source"), target: $edge.attr("target")},
                    css: {},
                    position: {}
                };

                $edge.find('data').each(function () {
                    var $data = $(this);

                    settings[$data.attr("type")][$data.attr("key")] = $data.text();

                });

                cy.add({
                    group: "edges",
                    data: settings.data,
                    css: settings.css
                });
            });

        });
        cy.add(collection);
        cy.layout({name: "cose"});
    });
};
},{}],3:[function(require,module,exports){
;(function () {
  'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function (cytoscape, $) {

    if (!cytoscape || !$) {
      return;
    } // can't register if cytoscape unspecified

    var exporter = require("./exporter");
    var importer = require("./importer");


    var options = {
      node: {
        css: false,
        data: true,
        position: true,
        discludeds: []
      },
      edge: {
        css: false,
        data: true,
        discludeds: []
      },
      layoutBy: "cose" // string of layout name or layout function
    };



    cytoscape('core', 'graphml', function (cyGraphML) {
      var cy = this;
      console.log(typeof cyGraphML);
      var res;

      switch (typeof cyGraphML) {
        case "string": // import
          res = importer(cy, $, options, cyGraphML);
          break;
        case "object": // set options
          $.extend(options, cyGraphML);
          res = cy;
          break;
        case "undefined": // export
          res = exporter(cy, $, options);
          break;
        default:
          console.log("Functionality(argument) of .graphml() is not recognized.");
      }

      return res;
      
    });

  };

  if (typeof module !== 'undefined' && module.exports) { // expose as a commonjs module
    module.exports = register;
  }

  if (typeof define !== 'undefined' && define.amd) { // expose as an amd/requirejs module
    define('cytoscape-graphml', function () {
      return register;
    });
  }

  if (typeof cytoscape !== 'undefined' && typeof $ !== 'undefined') { // expose to global cytoscape (i.e. window.cytoscape)
    register(cytoscape, $);
  }

})();

},{"./exporter":1,"./importer":2}]},{},[3]);
