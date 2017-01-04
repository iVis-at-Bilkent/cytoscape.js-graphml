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
        for (var j = 0; j < opt.length; j++) {
          var el = opt[i];
          if (ele[attr](el))
            result[attr][el] = ele[attr](el);
        }
      } else {
        var eleAttr = ele[attr]();
        result[attr] = {};
        for (var key in eleAttr)
          if ($.inArray(key, options[type].discludeds) < 0)
            result[attr][key] = {value: eleAttr[key], attrType: attr};

      }
    }

    return $.extend(result.css, result.data, result.position);
  }


  function parseNode(ele, xml) {
    var node = $('<node />', xml).attr({id: ele.id()}).appendTo(xml);

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
module.exports = function (cy, $, options, cyGraphML) {
  function renderNode($graph) {
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
;
(function () {
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZXhwb3J0ZXIuanMiLCJzcmMvaW1wb3J0ZXIuanMiLCJzcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCAkLCBvcHRpb25zKSB7XHJcblxyXG4gIGZ1bmN0aW9uIHhtbFRvU3RyaW5nKHhtbERhdGEpIHtcclxuXHJcbiAgICB2YXIgeG1sU3RyaW5nO1xyXG4gICAgLy9JRVxyXG4gICAgaWYgKHdpbmRvdy5BY3RpdmVYT2JqZWN0KSB7XHJcbiAgICAgIHhtbFN0cmluZyA9IHhtbERhdGEueG1sO1xyXG4gICAgfVxyXG4gICAgLy8gY29kZSBmb3IgTW96aWxsYSwgRmlyZWZveCwgT3BlcmEsIGV0Yy5cclxuICAgIGVsc2Uge1xyXG4gICAgICB4bWxTdHJpbmcgPSAobmV3IFhNTFNlcmlhbGl6ZXIoKSkuc2VyaWFsaXplVG9TdHJpbmcoeG1sRGF0YSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4geG1sU3RyaW5nO1xyXG4gIH1cclxuXHJcblxyXG4gIGZ1bmN0aW9uIGdldEVsZURhdGEoZWxlKSB7XHJcbiAgICB2YXIgdHlwZSA9IGVsZS5pc05vZGUoKSA/IFwibm9kZVwiIDogXCJlZGdlXCI7XHJcbiAgICB2YXIgYXR0cnMgPSBbXCJjc3NcIiwgXCJkYXRhXCIsIFwicG9zaXRpb25cIl07XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhdHRycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB2YXIgYXR0ciA9IGF0dHJzW2ldO1xyXG4gICAgICB2YXIgb3B0ID0gb3B0aW9uc1t0eXBlXVthdHRyXTtcclxuICAgICAgaWYgKCFvcHQpXHJcbiAgICAgICAgcmVzdWx0W2F0dHJdID0ge307XHJcbiAgICAgIGVsc2UgaWYgKCQuaXNBcnJheShvcHQpKSB7XHJcbiAgICAgICAgcmVzdWx0W2F0dHJdID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvcHQubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgIHZhciBlbCA9IG9wdFtpXTtcclxuICAgICAgICAgIGlmIChlbGVbYXR0cl0oZWwpKVxyXG4gICAgICAgICAgICByZXN1bHRbYXR0cl1bZWxdID0gZWxlW2F0dHJdKGVsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIGVsZUF0dHIgPSBlbGVbYXR0cl0oKTtcclxuICAgICAgICByZXN1bHRbYXR0cl0gPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZWxlQXR0cilcclxuICAgICAgICAgIGlmICgkLmluQXJyYXkoa2V5LCBvcHRpb25zW3R5cGVdLmRpc2NsdWRlZHMpIDwgMClcclxuICAgICAgICAgICAgcmVzdWx0W2F0dHJdW2tleV0gPSB7dmFsdWU6IGVsZUF0dHJba2V5XSwgYXR0clR5cGU6IGF0dHJ9O1xyXG5cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAkLmV4dGVuZChyZXN1bHQuY3NzLCByZXN1bHQuZGF0YSwgcmVzdWx0LnBvc2l0aW9uKTtcclxuICB9XHJcblxyXG5cclxuICBmdW5jdGlvbiBwYXJzZU5vZGUoZWxlLCB4bWwpIHtcclxuICAgIHZhciBub2RlID0gJCgnPG5vZGUgLz4nLCB4bWwpLmF0dHIoe2lkOiBlbGUuaWQoKX0pLmFwcGVuZFRvKHhtbCk7XHJcblxyXG4gICAgdmFyIGVsZURhdGEgPSBnZXRFbGVEYXRhKGVsZSk7XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gZWxlRGF0YSlcclxuICAgICAgJCgnPGRhdGEgLz4nLCBub2RlKS5hdHRyKHt0eXBlOiBlbGVEYXRhW2tleV0uYXR0clR5cGUsIGtleToga2V5fSkudGV4dChlbGVEYXRhW2tleV0udmFsdWUpLmFwcGVuZFRvKG5vZGUpO1xyXG5cclxuXHJcbiAgICBpZiAoZWxlLmlzUGFyZW50KCkpIHtcclxuICAgICAgdmFyIHN1YmdyYXBoID0gJCgnPGdyYXBoIC8+Jywgbm9kZSkuYXR0cih7aWQ6IGVsZS5pZCgpICsgJzonfSkuYXBwZW5kVG8obm9kZSk7XHJcbiAgICAgIGVsZS5jaGlsZHJlbigpLmVhY2goZnVuY3Rpb24gKGksIGNoaWxkKSB7XHJcbiAgICAgICAgcGFyc2VOb2RlKGNoaWxkLCBzdWJncmFwaCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBub2RlO1xyXG4gIH1cclxuXHJcblxyXG4gIG9wdGlvbnMubm9kZS5kaXNjbHVkZWRzLnB1c2goXCJpZFwiKTtcclxuICBvcHRpb25zLmVkZ2UuZGlzY2x1ZGVkcy5wdXNoKFwiaWRcIiwgXCJzb3VyY2VcIiwgXCJ0YXJnZXRcIik7XHJcblxyXG4gIHZhciB4bWxEb2MgPSAkLnBhcnNlWE1MKFxyXG4gICAgICAgICAgJzw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxcbicgK1xyXG4gICAgICAgICAgJzxncmFwaG1sIHhtbG5zPVwiaHR0cDovL2dyYXBobWwuZ3JhcGhkcmF3aW5nLm9yZy94bWxuc1wiXFxuJyArXHJcbiAgICAgICAgICAneG1sbnM6eHNpPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2VcIlxcbicgK1xyXG4gICAgICAgICAgJ3hzaTpzY2hlbWFMb2NhdGlvbj1cImh0dHA6Ly9ncmFwaG1sLmdyYXBoZHJhd2luZy5vcmcveG1sbnNcXG4nICtcclxuICAgICAgICAgICdodHRwOi8vZ3JhcGhtbC5ncmFwaGRyYXdpbmcub3JnL3htbG5zLzEuMC9ncmFwaG1sLnhzZFwiPlxcbicgK1xyXG4gICAgICAgICAgJyAgPGdyYXBoPlxcbicgK1xyXG4gICAgICAgICAgJyA8L2dyYXBoPlxcbicgK1xyXG4gICAgICAgICAgJyA8L2dyYXBobWw+XFxuJ1xyXG4gICAgICAgICAgKTtcclxuICB2YXIgJHhtbCA9ICQoeG1sRG9jKTtcclxuXHJcbiAgdmFyICRncmFwaCA9ICR4bWwuZmluZChcImdyYXBoXCIpO1xyXG5cclxuICBjeS5ub2RlcygpLm9ycGhhbnMoKS5mb3JFYWNoKGZ1bmN0aW9uIChlbGUpIHtcclxuICAgIHBhcnNlTm9kZShlbGUsICRncmFwaCk7XHJcbiAgfSk7XHJcblxyXG4gIGN5LmVkZ2VzKCkuZm9yRWFjaChmdW5jdGlvbiAoZWxlKSB7XHJcblxyXG4gICAgdmFyIGVkZ2UgPSAkKCc8ZWRnZSAvPicsICRncmFwaCkuYXR0cih7aWQ6IGVsZS5pZCgpLCBzb3VyY2U6IGVsZS5zb3VyY2UoKS5pZCgpLCB0YXJnZXQ6IGVsZS50YXJnZXQoKS5pZCgpfSkuYXBwZW5kVG8oJGdyYXBoKTtcclxuXHJcbiAgICB2YXIgZWxlRGF0YSA9IGdldEVsZURhdGEoZWxlKTtcclxuICAgIGZvciAodmFyIGtleSBpbiBlbGVEYXRhKVxyXG4gICAgICAkKCc8ZGF0YSAvPicsIGVkZ2UpLmF0dHIoe2tleToga2V5fSkudGV4dChlbGVEYXRhW2tleV0udmFsdWUpLmFwcGVuZFRvKGVkZ2UpO1xyXG5cclxuICB9KTtcclxuXHJcblxyXG4gIHJldHVybiB4bWxUb1N0cmluZyh4bWxEb2MpO1xyXG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCAkLCBvcHRpb25zLCBjeUdyYXBoTUwpIHtcclxuICBmdW5jdGlvbiByZW5kZXJOb2RlKCRncmFwaCkge1xyXG4gICAgJGdyYXBoLmZpbmQoXCJub2RlXCIpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgJG5vZGUgPSAkKHRoaXMpO1xyXG5cclxuICAgICAgdmFyIHNldHRpbmdzID0ge1xyXG4gICAgICAgIGRhdGE6IHtpZDogJG5vZGUuYXR0cihcImlkXCIpfSxcclxuICAgICAgICBjc3M6IHt9LFxyXG4gICAgICAgIHBvc2l0aW9uOiB7fVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgJG5vZGUuZmluZCgnZGF0YScpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciAkZGF0YSA9ICQodGhpcyk7XHJcblxyXG4gICAgICAgIHNldHRpbmdzWyRkYXRhLmF0dHIoXCJ0eXBlXCIpXVskZGF0YS5hdHRyKFwia2V5XCIpXSA9ICRkYXRhLnRleHQoKTtcclxuXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY3kuYWRkKHtcclxuICAgICAgICBncm91cDogXCJub2Rlc1wiLFxyXG4gICAgICAgIGRhdGE6IHNldHRpbmdzLmRhdGEsXHJcbiAgICAgICAgY3NzOiBzZXR0aW5ncy5jc3MsXHJcbiAgICAgICAgcG9zaXRpb246IHNldHRpbmdzLnBvc2l0aW9uXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgJG5vZGUuZmluZChcImdyYXBoXCIpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciAkZ3JhcGggPSAkKHRoaXMpO1xyXG5cclxuICAgICAgICByZW5kZXJOb2RlKCRncmFwaCk7XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGN5LmJhdGNoKGZ1bmN0aW9uICgpIHtcclxuICAgIHhtbCA9ICQucGFyc2VYTUwoY3lHcmFwaE1MKTtcclxuICAgICR4bWwgPSAkKHhtbCk7XHJcblxyXG4gICAgJGdyYXBocyA9ICR4bWwuZmluZChcImdyYXBoXCIpO1xyXG5cclxuICAgICRncmFwaHMuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciAkZ3JhcGggPSAkKHRoaXMpO1xyXG5cclxuICAgICAgcmVuZGVyTm9kZSgkZ3JhcGgpO1xyXG5cclxuICAgICAgJGdyYXBoLmZpbmQoXCJlZGdlXCIpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciAkZWRnZSA9ICQodGhpcyk7XHJcblxyXG4gICAgICAgIHZhciBzZXR0aW5ncyA9IHtcclxuICAgICAgICAgIGRhdGE6IHtpZDogJGVkZ2UuYXR0cihcImlkXCIpLCBzb3VyY2U6ICRlZGdlLmF0dHIoXCJzb3VyY2VcIiksIHRhcmdldDogJGVkZ2UuYXR0cihcInRhcmdldFwiKX0sXHJcbiAgICAgICAgICBjc3M6IHt9LFxyXG4gICAgICAgICAgcG9zaXRpb246IHt9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgJGVkZ2UuZmluZCgnZGF0YScpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgdmFyICRkYXRhID0gJCh0aGlzKTtcclxuXHJcbiAgICAgICAgICBzZXR0aW5nc1skZGF0YS5hdHRyKFwidHlwZVwiKV1bJGRhdGEuYXR0cihcImtleVwiKV0gPSAkZGF0YS50ZXh0KCk7XHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjeS5hZGQoe1xyXG4gICAgICAgICAgZ3JvdXA6IFwiZWRnZXNcIixcclxuICAgICAgICAgIGRhdGE6IHNldHRpbmdzLmRhdGEsXHJcbiAgICAgICAgICBjc3M6IHNldHRpbmdzLmNzc1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICB9KTtcclxuICAgIHZhciBsYXlvdXRPcHRUID0gdHlwZW9mIG9wdGlvbnMubGF5b3V0Qnk7XHJcbiAgICBpZiAobGF5b3V0T3B0VCA9PSBcInN0cmluZ1wiKVxyXG4gICAgICBjeS5sYXlvdXQoe25hbWU6IFwiY29zZVwifSk7XHJcbiAgICBlbHNlIGlmIChsYXlvdXRPcHRUID09IFwiZnVuY3Rpb25cIilcclxuICAgICAgb3B0aW9ucy5sYXlvdXRCeSgpO1xyXG4gIH0pO1xyXG59OyIsIjtcclxuKGZ1bmN0aW9uICgpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIHJlZ2lzdGVycyB0aGUgZXh0ZW5zaW9uIG9uIGEgY3l0b3NjYXBlIGxpYiByZWZcclxuICB2YXIgcmVnaXN0ZXIgPSBmdW5jdGlvbiAoY3l0b3NjYXBlLCAkKSB7XHJcblxyXG4gICAgaWYgKCFjeXRvc2NhcGUgfHwgISQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfSAvLyBjYW4ndCByZWdpc3RlciBpZiBjeXRvc2NhcGUgdW5zcGVjaWZpZWRcclxuXHJcbiAgICB2YXIgZXhwb3J0ZXIgPSByZXF1aXJlKFwiLi9leHBvcnRlclwiKTtcclxuICAgIHZhciBpbXBvcnRlciA9IHJlcXVpcmUoXCIuL2ltcG9ydGVyXCIpO1xyXG5cclxuXHJcbiAgICB2YXIgb3B0aW9ucyA9IHtcclxuICAgICAgbm9kZToge1xyXG4gICAgICAgIGNzczogZmFsc2UsXHJcbiAgICAgICAgZGF0YTogdHJ1ZSxcclxuICAgICAgICBwb3NpdGlvbjogdHJ1ZSxcclxuICAgICAgICBkaXNjbHVkZWRzOiBbXVxyXG4gICAgICB9LFxyXG4gICAgICBlZGdlOiB7XHJcbiAgICAgICAgY3NzOiBmYWxzZSxcclxuICAgICAgICBkYXRhOiB0cnVlLFxyXG4gICAgICAgIGRpc2NsdWRlZHM6IFtdXHJcbiAgICAgIH0sXHJcbiAgICAgIGxheW91dEJ5OiBcImNvc2VcIiAvLyBzdHJpbmcgb2YgbGF5b3V0IG5hbWUgb3IgbGF5b3V0IGZ1bmN0aW9uXHJcbiAgICB9O1xyXG5cclxuXHJcblxyXG4gICAgY3l0b3NjYXBlKCdjb3JlJywgJ2dyYXBobWwnLCBmdW5jdGlvbiAoY3lHcmFwaE1MKSB7XHJcbiAgICAgIHZhciBjeSA9IHRoaXM7XHJcbiAgICAgIHZhciByZXM7XHJcblxyXG4gICAgICBzd2l0Y2ggKHR5cGVvZiBjeUdyYXBoTUwpIHtcclxuICAgICAgICBjYXNlIFwic3RyaW5nXCI6IC8vIGltcG9ydFxyXG4gICAgICAgICAgcmVzID0gaW1wb3J0ZXIoY3ksICQsIG9wdGlvbnMsIGN5R3JhcGhNTCk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwib2JqZWN0XCI6IC8vIHNldCBvcHRpb25zXHJcbiAgICAgICAgICAkLmV4dGVuZCh0cnVlLCBvcHRpb25zLCBjeUdyYXBoTUwpO1xyXG4gICAgICAgICAgcmVzID0gY3k7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidW5kZWZpbmVkXCI6IC8vIGV4cG9ydFxyXG4gICAgICAgICAgcmVzID0gZXhwb3J0ZXIoY3ksICQsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiRnVuY3Rpb25hbGl0eShhcmd1bWVudCkgb2YgLmdyYXBobWwoKSBpcyBub3QgcmVjb2duaXplZC5cIik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXM7XHJcblxyXG4gICAgfSk7XHJcblxyXG4gIH07XHJcblxyXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcclxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcclxuICAgIGRlZmluZSgnY3l0b3NjYXBlLWdyYXBobWwnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHJldHVybiByZWdpc3RlcjtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYgKHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiAkICE9PSAndW5kZWZpbmVkJykgeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxyXG4gICAgcmVnaXN0ZXIoY3l0b3NjYXBlLCAkKTtcclxuICB9XHJcblxyXG59KSgpO1xyXG4iXX0=
