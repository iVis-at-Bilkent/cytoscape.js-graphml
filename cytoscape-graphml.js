(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeGraphml = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

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


  function parseNode(ele, xml) {
    var node = $('<node />', xml).attr( {id: ele.id() } ).appendTo(xml);

    var eleData = getEleData(ele);
    for (var key in eleData)
      $('<data />', node).attr({type: eleData[key].attrType, key: key}).text(eleData[key].value).appendTo(node);


    if (ele.isParent()) {
      var subgraph = $('<graph />', node).attr({id: ele.id() + ':'}).appendTo(node);
      ele.children().each(function (i, child) {
        parseNode(child, subgraph);
      });
    }

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
    parseNode(ele, $graph);
  });

  cy.edges().forEach(function (ele) {

    var edge = $('<edge />', $graph).attr({id: ele.id(), source: ele.source().id(), target: ele.target().id()}).appendTo($graph);

    var eleData = getEleData(ele);
    for (var key in eleData)
      $('<data />', edge).attr({key: key}).text(eleData[key].value).appendTo(edge);

  });


  return xmlToString(xmlDoc);
};
},{}],2:[function(_dereq_,module,exports){
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
        var layoutOptT = typeof options.layoutBy;
        if (layoutOptT == "string")
            cy.layout({name: "cose"});
        else if (layoutOptT == "function")
          options.layoutBy();
    });
};
},{}],3:[function(_dereq_,module,exports){
;(function () {
  'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function (cytoscape, $) {

    if (!cytoscape || !$) {
      return;
    } // can't register if cytoscape unspecified

    var exporter = _dereq_("./exporter");
    var importer = _dereq_("./importer");


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
      var res;

      switch (typeof cyGraphML) {
        case "string": // import
          res = importer(cy, $, options, cyGraphML);
          break;
        case "object": // set options
          $.extend(true, options, cyGraphML);
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

},{"./exporter":1,"./importer":2}]},{},[3])(3)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZXhwb3J0ZXIuanMiLCJzcmMvaW1wb3J0ZXIuanMiLCJzcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjeSwgJCwgb3B0aW9ucykge1xyXG5cclxuICBmdW5jdGlvbiB4bWxUb1N0cmluZyh4bWxEYXRhKSB7XHJcblxyXG4gICAgdmFyIHhtbFN0cmluZztcclxuICAgIC8vSUVcclxuICAgIGlmICh3aW5kb3cuQWN0aXZlWE9iamVjdCkge1xyXG4gICAgICB4bWxTdHJpbmcgPSB4bWxEYXRhLnhtbDtcclxuICAgIH1cclxuICAgIC8vIGNvZGUgZm9yIE1vemlsbGEsIEZpcmVmb3gsIE9wZXJhLCBldGMuXHJcbiAgICBlbHNlIHtcclxuICAgICAgeG1sU3RyaW5nID0gKG5ldyBYTUxTZXJpYWxpemVyKCkpLnNlcmlhbGl6ZVRvU3RyaW5nKHhtbERhdGEpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHhtbFN0cmluZztcclxuICB9XHJcblxyXG5cclxuICBmdW5jdGlvbiBnZXRFbGVEYXRhKGVsZSkge1xyXG4gICAgdmFyIHR5cGUgPSBlbGUuaXNOb2RlKCkgPyBcIm5vZGVcIiA6IFwiZWRnZVwiO1xyXG4gICAgdmFyIGF0dHJzID0gW1wiY3NzXCIsIFwiZGF0YVwiLCBcInBvc2l0aW9uXCJdO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXR0cnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgdmFyIGF0dHIgPSBhdHRyc1tpXTtcclxuICAgICAgdmFyIG9wdCA9IG9wdGlvbnNbdHlwZV1bYXR0cl07XHJcbiAgICAgIGlmICghb3B0KVxyXG4gICAgICAgIHJlc3VsdFthdHRyXSA9IHt9O1xyXG4gICAgICBlbHNlIGlmICgkLmlzQXJyYXkob3B0KSkge1xyXG4gICAgICAgIHJlc3VsdFthdHRyXSA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgb3B0Lmxlbmd0aDsgaisrKXtcclxuICAgICAgICAgIHZhciBlbCA9IG9wdFtpXTtcclxuICAgICAgICAgIGlmIChlbGVbYXR0cl0oZWwpKVxyXG4gICAgICAgICAgICByZXN1bHRbYXR0cl1bZWxdID0gZWxlW2F0dHJdKGVsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZXtcclxuICAgICAgICB2YXIgZWxlQXR0ciA9IGVsZVthdHRyXSgpO1xyXG4gICAgICAgIHJlc3VsdFthdHRyXSA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBlbGVBdHRyKVxyXG4gICAgICAgICAgaWYoJC5pbkFycmF5KGtleSwgb3B0aW9uc1t0eXBlXS5kaXNjbHVkZWRzKSA8IDApXHJcbiAgICAgICAgICAgIHJlc3VsdFthdHRyXVtrZXldID0geyB2YWx1ZTogZWxlQXR0cltrZXldLCBhdHRyVHlwZTogYXR0ciB9O1xyXG5cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAkLmV4dGVuZChyZXN1bHQuY3NzLCByZXN1bHQuZGF0YSwgcmVzdWx0LnBvc2l0aW9uKTtcclxuICB9XHJcblxyXG5cclxuICBmdW5jdGlvbiBwYXJzZU5vZGUoZWxlLCB4bWwpIHtcclxuICAgIHZhciBub2RlID0gJCgnPG5vZGUgLz4nLCB4bWwpLmF0dHIoIHtpZDogZWxlLmlkKCkgfSApLmFwcGVuZFRvKHhtbCk7XHJcblxyXG4gICAgdmFyIGVsZURhdGEgPSBnZXRFbGVEYXRhKGVsZSk7XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gZWxlRGF0YSlcclxuICAgICAgJCgnPGRhdGEgLz4nLCBub2RlKS5hdHRyKHt0eXBlOiBlbGVEYXRhW2tleV0uYXR0clR5cGUsIGtleToga2V5fSkudGV4dChlbGVEYXRhW2tleV0udmFsdWUpLmFwcGVuZFRvKG5vZGUpO1xyXG5cclxuXHJcbiAgICBpZiAoZWxlLmlzUGFyZW50KCkpIHtcclxuICAgICAgdmFyIHN1YmdyYXBoID0gJCgnPGdyYXBoIC8+Jywgbm9kZSkuYXR0cih7aWQ6IGVsZS5pZCgpICsgJzonfSkuYXBwZW5kVG8obm9kZSk7XHJcbiAgICAgIGVsZS5jaGlsZHJlbigpLmVhY2goZnVuY3Rpb24gKGksIGNoaWxkKSB7XHJcbiAgICAgICAgcGFyc2VOb2RlKGNoaWxkLCBzdWJncmFwaCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBub2RlO1xyXG4gIH1cclxuXHJcblxyXG4gIG9wdGlvbnMubm9kZS5kaXNjbHVkZWRzLnB1c2goXCJpZFwiKTtcclxuICBvcHRpb25zLmVkZ2UuZGlzY2x1ZGVkcy5wdXNoKFwiaWRcIiwgXCJzb3VyY2VcIiwgXCJ0YXJnZXRcIik7XHJcblxyXG4gIHZhciB4bWxEb2MgPSAkLnBhcnNlWE1MKFxyXG4gICAgJzw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxcbicgK1xyXG4gICAgJzxncmFwaG1sIHhtbG5zPVwiaHR0cDovL2dyYXBobWwuZ3JhcGhkcmF3aW5nLm9yZy94bWxuc1wiXFxuJyArXHJcbiAgICAneG1sbnM6eHNpPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2VcIlxcbicgK1xyXG4gICAgJ3hzaTpzY2hlbWFMb2NhdGlvbj1cImh0dHA6Ly9ncmFwaG1sLmdyYXBoZHJhd2luZy5vcmcveG1sbnNcXG4nICtcclxuICAgICdodHRwOi8vZ3JhcGhtbC5ncmFwaGRyYXdpbmcub3JnL3htbG5zLzEuMC9ncmFwaG1sLnhzZFwiPlxcbicgK1xyXG4gICAgJyAgPGdyYXBoPlxcbicgK1xyXG4gICAgJyA8L2dyYXBoPlxcbicgK1xyXG4gICAgJyA8L2dyYXBobWw+XFxuJ1xyXG4gICk7XHJcbiAgdmFyICR4bWwgPSAkKHhtbERvYyk7XHJcblxyXG4gIHZhciAkZ3JhcGggPSAkeG1sLmZpbmQoXCJncmFwaFwiKTtcclxuXHJcbiAgY3kubm9kZXMoKS5vcnBoYW5zKCkuZm9yRWFjaChmdW5jdGlvbiAoZWxlKSB7XHJcbiAgICBwYXJzZU5vZGUoZWxlLCAkZ3JhcGgpO1xyXG4gIH0pO1xyXG5cclxuICBjeS5lZGdlcygpLmZvckVhY2goZnVuY3Rpb24gKGVsZSkge1xyXG5cclxuICAgIHZhciBlZGdlID0gJCgnPGVkZ2UgLz4nLCAkZ3JhcGgpLmF0dHIoe2lkOiBlbGUuaWQoKSwgc291cmNlOiBlbGUuc291cmNlKCkuaWQoKSwgdGFyZ2V0OiBlbGUudGFyZ2V0KCkuaWQoKX0pLmFwcGVuZFRvKCRncmFwaCk7XHJcblxyXG4gICAgdmFyIGVsZURhdGEgPSBnZXRFbGVEYXRhKGVsZSk7XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gZWxlRGF0YSlcclxuICAgICAgJCgnPGRhdGEgLz4nLCBlZGdlKS5hdHRyKHtrZXk6IGtleX0pLnRleHQoZWxlRGF0YVtrZXldLnZhbHVlKS5hcHBlbmRUbyhlZGdlKTtcclxuXHJcbiAgfSk7XHJcblxyXG5cclxuICByZXR1cm4geG1sVG9TdHJpbmcoeG1sRG9jKTtcclxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN5LCAkLCBvcHRpb25zLCBjeUdyYXBoTUwpIHtcclxuICAgIGZ1bmN0aW9uIHJlbmRlck5vZGUoJGdyYXBoKXtcclxuICAgICAgICAkZ3JhcGguZmluZChcIm5vZGVcIikuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciAkbm9kZSA9ICQodGhpcyk7XHJcblxyXG4gICAgICAgICAgICB2YXIgc2V0dGluZ3MgPSB7XHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7aWQ6ICRub2RlLmF0dHIoXCJpZFwiKX0sXHJcbiAgICAgICAgICAgICAgICBjc3M6IHt9LFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHt9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAkbm9kZS5maW5kKCdkYXRhJykuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgJGRhdGEgPSAkKHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgICAgIHNldHRpbmdzWyRkYXRhLmF0dHIoXCJ0eXBlXCIpXVskZGF0YS5hdHRyKFwia2V5XCIpXSA9ICRkYXRhLnRleHQoKTtcclxuXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgY3kuYWRkKHtcclxuICAgICAgICAgICAgICAgIGdyb3VwOiBcIm5vZGVzXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiBzZXR0aW5ncy5kYXRhLFxyXG4gICAgICAgICAgICAgICAgY3NzOiBzZXR0aW5ncy5jc3MsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogc2V0dGluZ3MucG9zaXRpb25cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkbm9kZS5maW5kKFwiZ3JhcGhcIikuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgJGdyYXBoID0gJCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZW5kZXJOb2RlKCRncmFwaCk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY3kuYmF0Y2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHhtbCA9ICQucGFyc2VYTUwoY3lHcmFwaE1MKTtcclxuICAgICAgICAkeG1sID0gJCh4bWwpO1xyXG5cclxuICAgICAgICAkZ3JhcGhzID0gJHhtbC5maW5kKFwiZ3JhcGhcIik7XHJcblxyXG4gICAgICAgICRncmFwaHMuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciAkZ3JhcGggPSAkKHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgcmVuZGVyTm9kZSgkZ3JhcGgpO1xyXG5cclxuICAgICAgICAgICAgJGdyYXBoLmZpbmQoXCJlZGdlXCIpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyICRlZGdlID0gJCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgc2V0dGluZ3MgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge2lkOiAkZWRnZS5hdHRyKFwiaWRcIiksIHNvdXJjZTogJGVkZ2UuYXR0cihcInNvdXJjZVwiKSwgdGFyZ2V0OiAkZWRnZS5hdHRyKFwidGFyZ2V0XCIpfSxcclxuICAgICAgICAgICAgICAgICAgICBjc3M6IHt9LFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7fVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAkZWRnZS5maW5kKCdkYXRhJykuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyICRkYXRhID0gJCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3NbJGRhdGEuYXR0cihcInR5cGVcIildWyRkYXRhLmF0dHIoXCJrZXlcIildID0gJGRhdGEudGV4dCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGN5LmFkZCh7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXA6IFwiZWRnZXNcIixcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBzZXR0aW5ncy5kYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgIGNzczogc2V0dGluZ3MuY3NzXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciBsYXlvdXRPcHRUID0gdHlwZW9mIG9wdGlvbnMubGF5b3V0Qnk7XHJcbiAgICAgICAgaWYgKGxheW91dE9wdFQgPT0gXCJzdHJpbmdcIilcclxuICAgICAgICAgICAgY3kubGF5b3V0KHtuYW1lOiBcImNvc2VcIn0pO1xyXG4gICAgICAgIGVsc2UgaWYgKGxheW91dE9wdFQgPT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgICAgb3B0aW9ucy5sYXlvdXRCeSgpO1xyXG4gICAgfSk7XHJcbn07IiwiOyhmdW5jdGlvbiAoKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXHJcbiAgdmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24gKGN5dG9zY2FwZSwgJCkge1xyXG5cclxuICAgIGlmICghY3l0b3NjYXBlIHx8ICEkKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gLy8gY2FuJ3QgcmVnaXN0ZXIgaWYgY3l0b3NjYXBlIHVuc3BlY2lmaWVkXHJcblxyXG4gICAgdmFyIGV4cG9ydGVyID0gcmVxdWlyZShcIi4vZXhwb3J0ZXJcIik7XHJcbiAgICB2YXIgaW1wb3J0ZXIgPSByZXF1aXJlKFwiLi9pbXBvcnRlclwiKTtcclxuXHJcblxyXG4gICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgIG5vZGU6IHtcclxuICAgICAgICBjc3M6IGZhbHNlLFxyXG4gICAgICAgIGRhdGE6IHRydWUsXHJcbiAgICAgICAgcG9zaXRpb246IHRydWUsXHJcbiAgICAgICAgZGlzY2x1ZGVkczogW11cclxuICAgICAgfSxcclxuICAgICAgZWRnZToge1xyXG4gICAgICAgIGNzczogZmFsc2UsXHJcbiAgICAgICAgZGF0YTogdHJ1ZSxcclxuICAgICAgICBkaXNjbHVkZWRzOiBbXVxyXG4gICAgICB9LFxyXG4gICAgICBsYXlvdXRCeTogXCJjb3NlXCIgLy8gc3RyaW5nIG9mIGxheW91dCBuYW1lIG9yIGxheW91dCBmdW5jdGlvblxyXG4gICAgfTtcclxuXHJcblxyXG5cclxuICAgIGN5dG9zY2FwZSgnY29yZScsICdncmFwaG1sJywgZnVuY3Rpb24gKGN5R3JhcGhNTCkge1xyXG4gICAgICB2YXIgY3kgPSB0aGlzO1xyXG4gICAgICB2YXIgcmVzO1xyXG5cclxuICAgICAgc3dpdGNoICh0eXBlb2YgY3lHcmFwaE1MKSB7XHJcbiAgICAgICAgY2FzZSBcInN0cmluZ1wiOiAvLyBpbXBvcnRcclxuICAgICAgICAgIHJlcyA9IGltcG9ydGVyKGN5LCAkLCBvcHRpb25zLCBjeUdyYXBoTUwpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcIm9iamVjdFwiOiAvLyBzZXQgb3B0aW9uc1xyXG4gICAgICAgICAgJC5leHRlbmQodHJ1ZSwgb3B0aW9ucywgY3lHcmFwaE1MKTtcclxuICAgICAgICAgIHJlcyA9IGN5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInVuZGVmaW5lZFwiOiAvLyBleHBvcnRcclxuICAgICAgICAgIHJlcyA9IGV4cG9ydGVyKGN5LCAkLCBvcHRpb25zKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkZ1bmN0aW9uYWxpdHkoYXJndW1lbnQpIG9mIC5ncmFwaG1sKCkgaXMgbm90IHJlY29nbml6ZWQuXCIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmVzO1xyXG4gICAgICBcclxuICAgIH0pO1xyXG5cclxuICB9O1xyXG5cclxuICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHsgLy8gZXhwb3NlIGFzIGEgY29tbW9uanMgbW9kdWxlXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xyXG4gIH1cclxuXHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIHsgLy8gZXhwb3NlIGFzIGFuIGFtZC9yZXF1aXJlanMgbW9kdWxlXHJcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1ncmFwaG1sJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgJCAhPT0gJ3VuZGVmaW5lZCcpIHsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcclxuICAgIHJlZ2lzdGVyKGN5dG9zY2FwZSwgJCk7XHJcbiAgfVxyXG5cclxufSkoKTtcclxuIl19
