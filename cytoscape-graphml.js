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
          if ($.inArray(key, options[type].discludeds) < 0 && key != "parent")
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
      ele.children().each(function (child) {
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
  function renderNode($graph, $parent) {
    $graph.children("node").each(function () {
      var $node = $(this);

      var settings = {
        data: {id: $node.attr("id")},
        css: {},
        position: {}
      };

      if($parent != null)
        settings["data"]["parent"] = $parent.attr("id");

      $node.children('data').each(function () {
        var $data = $(this);
        settings["data"][$data.attr("key")] = $data.text();
      });

      cy.add({
        group: "nodes",
        data: settings.data,
        css: settings.css,
        position: settings.position
      });

      $node.children("graph").each(function () {
        var $graph = $(this);

        renderNode($graph, $node);
      });
    });
  }

  cy.batch(function () {
    var xml = $.parseXML(cyGraphML);
    var $xml = $(xml);

    var $graphs = $xml.find("graph").first();

    $graphs.each(function () {
      var $graph = $(this);

      renderNode($graph, null);

      $graph.find("edge").each(function () {
        var $edge = $(this);

        var settings = {
          data: {id: $edge.attr("id"), source: $edge.attr("source"), target: $edge.attr("target")},
          css: {},
          position: {}
        };

        $edge.find('data').each(function () {
          var $data = $(this);
          settings["data"][$data.attr("key")] = $data.text();
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
       cy.layout({name: options.layoutBy}).run();
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

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZXhwb3J0ZXIuanMiLCJzcmMvaW1wb3J0ZXIuanMiLCJzcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCAkLCBvcHRpb25zKSB7XG5cbiAgZnVuY3Rpb24geG1sVG9TdHJpbmcoeG1sRGF0YSkge1xuXG4gICAgdmFyIHhtbFN0cmluZztcbiAgICAvL0lFXG4gICAgaWYgKHdpbmRvdy5BY3RpdmVYT2JqZWN0KSB7XG4gICAgICB4bWxTdHJpbmcgPSB4bWxEYXRhLnhtbDtcbiAgICB9XG4gICAgLy8gY29kZSBmb3IgTW96aWxsYSwgRmlyZWZveCwgT3BlcmEsIGV0Yy5cbiAgICBlbHNlIHtcbiAgICAgIHhtbFN0cmluZyA9IChuZXcgWE1MU2VyaWFsaXplcigpKS5zZXJpYWxpemVUb1N0cmluZyh4bWxEYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIHhtbFN0cmluZztcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZ2V0RWxlRGF0YShlbGUpIHtcbiAgICB2YXIgdHlwZSA9IGVsZS5pc05vZGUoKSA/IFwibm9kZVwiIDogXCJlZGdlXCI7XG4gICAgdmFyIGF0dHJzID0gW1wiY3NzXCIsIFwiZGF0YVwiLCBcInBvc2l0aW9uXCJdO1xuICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhdHRyID0gYXR0cnNbaV07XG4gICAgICB2YXIgb3B0ID0gb3B0aW9uc1t0eXBlXVthdHRyXTtcbiAgICAgIGlmICghb3B0KVxuICAgICAgICByZXN1bHRbYXR0cl0gPSB7fTtcbiAgICAgIGVsc2UgaWYgKCQuaXNBcnJheShvcHQpKSB7XG4gICAgICAgIHJlc3VsdFthdHRyXSA9IHt9O1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9wdC5sZW5ndGg7IGorKykge1xuICAgICAgICAgIHZhciBlbCA9IG9wdFtpXTtcbiAgICAgICAgICBpZiAoZWxlW2F0dHJdKGVsKSlcbiAgICAgICAgICAgIHJlc3VsdFthdHRyXVtlbF0gPSBlbGVbYXR0cl0oZWwpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZWxlQXR0ciA9IGVsZVthdHRyXSgpO1xuICAgICAgICByZXN1bHRbYXR0cl0gPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGVsZUF0dHIpXG4gICAgICAgICAgaWYgKCQuaW5BcnJheShrZXksIG9wdGlvbnNbdHlwZV0uZGlzY2x1ZGVkcykgPCAwICYmIGtleSAhPSBcInBhcmVudFwiKVxuICAgICAgICAgICAgcmVzdWx0W2F0dHJdW2tleV0gPSB7dmFsdWU6IGVsZUF0dHJba2V5XSwgYXR0clR5cGU6IGF0dHJ9O1xuXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICQuZXh0ZW5kKHJlc3VsdC5jc3MsIHJlc3VsdC5kYXRhLCByZXN1bHQucG9zaXRpb24pO1xuICB9XG5cblxuICBmdW5jdGlvbiBwYXJzZU5vZGUoZWxlLCB4bWwpIHtcbiAgICB2YXIgbm9kZSA9ICQoJzxub2RlIC8+JywgeG1sKS5hdHRyKHtpZDogZWxlLmlkKCl9KS5hcHBlbmRUbyh4bWwpO1xuXG4gICAgdmFyIGVsZURhdGEgPSBnZXRFbGVEYXRhKGVsZSk7XG4gICAgZm9yICh2YXIga2V5IGluIGVsZURhdGEpXG4gICAgICAkKCc8ZGF0YSAvPicsIG5vZGUpLmF0dHIoe3R5cGU6IGVsZURhdGFba2V5XS5hdHRyVHlwZSwga2V5OiBrZXl9KS50ZXh0KGVsZURhdGFba2V5XS52YWx1ZSkuYXBwZW5kVG8obm9kZSk7XG5cblxuICAgIGlmIChlbGUuaXNQYXJlbnQoKSkge1xuICAgICAgdmFyIHN1YmdyYXBoID0gJCgnPGdyYXBoIC8+Jywgbm9kZSkuYXR0cih7aWQ6IGVsZS5pZCgpICsgJzonfSkuYXBwZW5kVG8obm9kZSk7XG4gICAgICBlbGUuY2hpbGRyZW4oKS5lYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICBwYXJzZU5vZGUoY2hpbGQsIHN1YmdyYXBoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlO1xuICB9XG5cblxuICBvcHRpb25zLm5vZGUuZGlzY2x1ZGVkcy5wdXNoKFwiaWRcIik7XG4gIG9wdGlvbnMuZWRnZS5kaXNjbHVkZWRzLnB1c2goXCJpZFwiLCBcInNvdXJjZVwiLCBcInRhcmdldFwiKTtcblxuICB2YXIgeG1sRG9jID0gJC5wYXJzZVhNTChcbiAgICAgICAgICAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XFxuJyArXG4gICAgICAgICAgJzxncmFwaG1sIHhtbG5zPVwiaHR0cDovL2dyYXBobWwuZ3JhcGhkcmF3aW5nLm9yZy94bWxuc1wiXFxuJyArXG4gICAgICAgICAgJ3htbG5zOnhzaT1cImh0dHA6Ly93d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hLWluc3RhbmNlXCJcXG4nICtcbiAgICAgICAgICAneHNpOnNjaGVtYUxvY2F0aW9uPVwiaHR0cDovL2dyYXBobWwuZ3JhcGhkcmF3aW5nLm9yZy94bWxuc1xcbicgK1xuICAgICAgICAgICdodHRwOi8vZ3JhcGhtbC5ncmFwaGRyYXdpbmcub3JnL3htbG5zLzEuMC9ncmFwaG1sLnhzZFwiPlxcbicgK1xuICAgICAgICAgICcgIDxncmFwaD5cXG4nICtcbiAgICAgICAgICAnIDwvZ3JhcGg+XFxuJyArXG4gICAgICAgICAgJyA8L2dyYXBobWw+XFxuJ1xuICAgICAgICAgICk7XG4gIHZhciAkeG1sID0gJCh4bWxEb2MpO1xuXG4gIHZhciAkZ3JhcGggPSAkeG1sLmZpbmQoXCJncmFwaFwiKTtcblxuICBjeS5ub2RlcygpLm9ycGhhbnMoKS5mb3JFYWNoKGZ1bmN0aW9uIChlbGUpIHtcbiAgICBwYXJzZU5vZGUoZWxlLCAkZ3JhcGgpO1xuICB9KTtcblxuICBjeS5lZGdlcygpLmZvckVhY2goZnVuY3Rpb24gKGVsZSkge1xuXG4gICAgdmFyIGVkZ2UgPSAkKCc8ZWRnZSAvPicsICRncmFwaCkuYXR0cih7aWQ6IGVsZS5pZCgpLCBzb3VyY2U6IGVsZS5zb3VyY2UoKS5pZCgpLCB0YXJnZXQ6IGVsZS50YXJnZXQoKS5pZCgpfSkuYXBwZW5kVG8oJGdyYXBoKTtcblxuICAgIHZhciBlbGVEYXRhID0gZ2V0RWxlRGF0YShlbGUpO1xuICAgIGZvciAodmFyIGtleSBpbiBlbGVEYXRhKVxuICAgICAgJCgnPGRhdGEgLz4nLCBlZGdlKS5hdHRyKHtrZXk6IGtleX0pLnRleHQoZWxlRGF0YVtrZXldLnZhbHVlKS5hcHBlbmRUbyhlZGdlKTtcblxuICB9KTtcblxuXG4gIHJldHVybiB4bWxUb1N0cmluZyh4bWxEb2MpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCAkLCBvcHRpb25zLCBjeUdyYXBoTUwpIHtcbiAgZnVuY3Rpb24gcmVuZGVyTm9kZSgkZ3JhcGgsICRwYXJlbnQpIHtcbiAgICAkZ3JhcGguY2hpbGRyZW4oXCJub2RlXCIpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRub2RlID0gJCh0aGlzKTtcblxuICAgICAgdmFyIHNldHRpbmdzID0ge1xuICAgICAgICBkYXRhOiB7aWQ6ICRub2RlLmF0dHIoXCJpZFwiKX0sXG4gICAgICAgIGNzczoge30sXG4gICAgICAgIHBvc2l0aW9uOiB7fVxuICAgICAgfTtcblxuICAgICAgaWYoJHBhcmVudCAhPSBudWxsKVxuICAgICAgICBzZXR0aW5nc1tcImRhdGFcIl1bXCJwYXJlbnRcIl0gPSAkcGFyZW50LmF0dHIoXCJpZFwiKTtcblxuICAgICAgJG5vZGUuY2hpbGRyZW4oJ2RhdGEnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRkYXRhID0gJCh0aGlzKTtcbiAgICAgICAgc2V0dGluZ3NbXCJkYXRhXCJdWyRkYXRhLmF0dHIoXCJrZXlcIildID0gJGRhdGEudGV4dCgpO1xuICAgICAgfSk7XG5cbiAgICAgIGN5LmFkZCh7XG4gICAgICAgIGdyb3VwOiBcIm5vZGVzXCIsXG4gICAgICAgIGRhdGE6IHNldHRpbmdzLmRhdGEsXG4gICAgICAgIGNzczogc2V0dGluZ3MuY3NzLFxuICAgICAgICBwb3NpdGlvbjogc2V0dGluZ3MucG9zaXRpb25cbiAgICAgIH0pO1xuXG4gICAgICAkbm9kZS5jaGlsZHJlbihcImdyYXBoXCIpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJGdyYXBoID0gJCh0aGlzKTtcblxuICAgICAgICByZW5kZXJOb2RlKCRncmFwaCwgJG5vZGUpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBjeS5iYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHhtbCA9ICQucGFyc2VYTUwoY3lHcmFwaE1MKTtcbiAgICB2YXIgJHhtbCA9ICQoeG1sKTtcblxuICAgIHZhciAkZ3JhcGhzID0gJHhtbC5maW5kKFwiZ3JhcGhcIikuZmlyc3QoKTtcblxuICAgICRncmFwaHMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgJGdyYXBoID0gJCh0aGlzKTtcblxuICAgICAgcmVuZGVyTm9kZSgkZ3JhcGgsIG51bGwpO1xuXG4gICAgICAkZ3JhcGguZmluZChcImVkZ2VcIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkZWRnZSA9ICQodGhpcyk7XG5cbiAgICAgICAgdmFyIHNldHRpbmdzID0ge1xuICAgICAgICAgIGRhdGE6IHtpZDogJGVkZ2UuYXR0cihcImlkXCIpLCBzb3VyY2U6ICRlZGdlLmF0dHIoXCJzb3VyY2VcIiksIHRhcmdldDogJGVkZ2UuYXR0cihcInRhcmdldFwiKX0sXG4gICAgICAgICAgY3NzOiB7fSxcbiAgICAgICAgICBwb3NpdGlvbjoge31cbiAgICAgICAgfTtcblxuICAgICAgICAkZWRnZS5maW5kKCdkYXRhJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyICRkYXRhID0gJCh0aGlzKTtcbiAgICAgICAgICBzZXR0aW5nc1tcImRhdGFcIl1bJGRhdGEuYXR0cihcImtleVwiKV0gPSAkZGF0YS50ZXh0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGN5LmFkZCh7XG4gICAgICAgICAgZ3JvdXA6IFwiZWRnZXNcIixcbiAgICAgICAgICBkYXRhOiBzZXR0aW5ncy5kYXRhLFxuICAgICAgICAgIGNzczogc2V0dGluZ3MuY3NzXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgICB2YXIgbGF5b3V0T3B0VCA9IHR5cGVvZiBvcHRpb25zLmxheW91dEJ5O1xuICAgIGlmIChsYXlvdXRPcHRUID09IFwic3RyaW5nXCIpXG4gICAgICAgY3kubGF5b3V0KHtuYW1lOiBvcHRpb25zLmxheW91dEJ5fSkucnVuKCk7XG4gICAgZWxzZSBpZiAobGF5b3V0T3B0VCA9PSBcImZ1bmN0aW9uXCIpXG4gICAgICBvcHRpb25zLmxheW91dEJ5KCk7XG4gIH0pO1xufTtcbiIsIjtcbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXG4gIHZhciByZWdpc3RlciA9IGZ1bmN0aW9uIChjeXRvc2NhcGUsICQpIHtcblxuICAgIGlmICghY3l0b3NjYXBlIHx8ICEkKSB7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBjYW4ndCByZWdpc3RlciBpZiBjeXRvc2NhcGUgdW5zcGVjaWZpZWRcblxuICAgIHZhciBleHBvcnRlciA9IHJlcXVpcmUoXCIuL2V4cG9ydGVyXCIpO1xuICAgIHZhciBpbXBvcnRlciA9IHJlcXVpcmUoXCIuL2ltcG9ydGVyXCIpO1xuXG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgIG5vZGU6IHtcbiAgICAgICAgY3NzOiBmYWxzZSxcbiAgICAgICAgZGF0YTogdHJ1ZSxcbiAgICAgICAgcG9zaXRpb246IHRydWUsXG4gICAgICAgIGRpc2NsdWRlZHM6IFtdXG4gICAgICB9LFxuICAgICAgZWRnZToge1xuICAgICAgICBjc3M6IGZhbHNlLFxuICAgICAgICBkYXRhOiB0cnVlLFxuICAgICAgICBkaXNjbHVkZWRzOiBbXVxuICAgICAgfSxcbiAgICAgIGxheW91dEJ5OiBcImNvc2VcIiAvLyBzdHJpbmcgb2YgbGF5b3V0IG5hbWUgb3IgbGF5b3V0IGZ1bmN0aW9uXG4gICAgfTtcblxuXG5cbiAgICBjeXRvc2NhcGUoJ2NvcmUnLCAnZ3JhcGhtbCcsIGZ1bmN0aW9uIChjeUdyYXBoTUwpIHtcbiAgICAgIHZhciBjeSA9IHRoaXM7XG4gICAgICB2YXIgcmVzO1xuXG4gICAgICBzd2l0Y2ggKHR5cGVvZiBjeUdyYXBoTUwpIHtcbiAgICAgICAgY2FzZSBcInN0cmluZ1wiOiAvLyBpbXBvcnRcbiAgICAgICAgICByZXMgPSBpbXBvcnRlcihjeSwgJCwgb3B0aW9ucywgY3lHcmFwaE1MKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcIm9iamVjdFwiOiAvLyBzZXQgb3B0aW9uc1xuICAgICAgICAgICQuZXh0ZW5kKHRydWUsIG9wdGlvbnMsIGN5R3JhcGhNTCk7XG4gICAgICAgICAgcmVzID0gY3k7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJ1bmRlZmluZWRcIjogLy8gZXhwb3J0XG4gICAgICAgICAgcmVzID0gZXhwb3J0ZXIoY3ksICQsIG9wdGlvbnMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiRnVuY3Rpb25hbGl0eShhcmd1bWVudCkgb2YgLmdyYXBobWwoKSBpcyBub3QgcmVjb2duaXplZC5cIik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXM7XG5cbiAgICB9KTtcblxuICB9O1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgeyAvLyBleHBvc2UgYXMgYSBjb21tb25qcyBtb2R1bGVcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIHsgLy8gZXhwb3NlIGFzIGFuIGFtZC9yZXF1aXJlanMgbW9kdWxlXG4gICAgZGVmaW5lKCdjeXRvc2NhcGUtZ3JhcGhtbCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiByZWdpc3RlcjtcbiAgICB9KTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgJCAhPT0gJ3VuZGVmaW5lZCcpIHsgLy8gZXhwb3NlIHRvIGdsb2JhbCBjeXRvc2NhcGUgKGkuZS4gd2luZG93LmN5dG9zY2FwZSlcbiAgICByZWdpc3RlcihjeXRvc2NhcGUsICQpO1xuICB9XG5cbn0pKCk7XG4iXX0=
